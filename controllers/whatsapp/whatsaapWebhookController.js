const axios = require('axios');
const OpenAI = require('openai');
const WhatsAppSetting = require('../../models/whatsappSettings');
const WhatsAppConversation = require('../../models/WhatsAppConversation');
const WhatsAppMessage = require('../../models/WhatsAppMessage');
const dotenv = require('dotenv');


dotenv.config();


// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1. WEBHOOK VERIFICATION (GET)
const verifyWebhook = (req, res) => {
  const verify_token = process.env.WEBHOOK_VERIFY_TOKEN;

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send("Invalid Request");
  }
};

// 2. RECEIVE MESSAGE & AI REPLY (POST)
const handleIncomingMessage = async (req, res) => {
  try {
    const body = req.body;

    // Check if it's a WhatsApp status update or message
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        // Fallback to ENV variable if Meta payload metadata is missing
        let phone_number_id = body.entry[0].changes[0].value.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
        let from = body.entry[0].changes[0].value.messages[0].from; // Customer Number
        let msg_body = body.entry[0].changes[0].value.messages[0].text?.body || ""; // Text Message
        let wamid = body.entry[0].changes[0].value.messages[0].id; // Meta Message ID
        let customer_name = body.entry[0].changes[0].value.contacts[0]?.profile?.name || "WA User";

        console.log(`Received message from ${from}: ${msg_body}`);

        // IMPORTANT: Respond OK to Meta immediately so they stop retrying
        res.sendStatus(200);

        // --- STEP 1: Prevent Duplicate Webhooks ---
        const existingMessage = await WhatsAppMessage.findOne({ wamid: wamid });
        if (existingMessage) {
          console.log("Duplicate message webhook ignored.");
          return;
        }

        // --- STEP 2: Find or Create Conversation ---
        let conversation = await WhatsAppConversation.findOne({ phone_number_id, customer_phone: from });
        
        if (!conversation) {
          conversation = new WhatsAppConversation({
            phone_number_id: phone_number_id, // Explicitly save it
            customer_phone: from,
            customer_name,
            ai_enabled: true // Default on for new users
          });
        }
        
        // Update Conversation Last Message & Unread Count
        conversation.last_message = msg_body;
        conversation.last_message_time = Date.now();
        conversation.unread_count += 1;
        await conversation.save();

        // --- STEP 3: Save Customer Message to DB ---
        const newCustomerMessage = await WhatsAppMessage.create({
          conversation_id: conversation._id,
          wamid: wamid,
          sender_id: from,
          receiver_id: phone_number_id,
          text: msg_body,
          is_from_me: false,
          message_type: 'text',
          status: 'received'
        });

        // ====> EMIT TO FRONTEND (CUSTOMER MESSAGE) <====
        const io = req.app.get('io');
        if (io) {
          io.emit('newMessage', {
            conversation_id: conversation._id,
            message: newCustomerMessage
          });
          io.emit('chatUpdated', {
            _id: conversation._id,
            customer_name: conversation.customer_name,
            customer_phone: conversation.customer_phone,
            ai_enabled: conversation.ai_enabled,
            last_message: msg_body,
            last_message_time: conversation.last_message_time,
            unread_count: conversation.unread_count
          });
        }

        // --- STEP 4: Check if AI Should Reply ---
        const settings = await WhatsAppSetting.getSettings();
        
        if (!settings.isGlobalAiEnabled || !conversation.ai_enabled) {
          console.log("AI is disabled globally or for this chat. Skipping AI reply.");
          return;
        }

        // --- STEP 5: Prepare AI Context (Prompt + FAQs + Chat History) ---
        let fullSystemPrompt = `${settings.systemPrompt}\n\n`;
        if (settings.knowledgeBaseData) {
          fullSystemPrompt += `BUSINESS INFO:\n${settings.knowledgeBaseData}\n\n`;
        }
        if (settings.faqs && settings.faqs.length > 0) {
          fullSystemPrompt += `FAQs:\n${settings.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n')}`;
        }

        // Fetch last 5 messages for context
        const recentMessages = await WhatsAppMessage.find({ conversation_id: conversation._id })
          .sort({ createdAt: -1 })
          .limit(5);
        
        recentMessages.reverse();

        const aiMessagesArray = [
          { role: "system", content: fullSystemPrompt }
        ];

        recentMessages.forEach(msg => {
          // Only add text messages to the AI context to avoid crashing OpenAI with unsupported types
          if (msg.text) {
             aiMessagesArray.push({
               role: msg.is_from_me ? "assistant" : "user",
               content: msg.text
             });
          }
        });

        // --- STEP 6: Call OpenAI GPT-3.5-Turbo ---
        console.log("Generating AI Reply...");
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: aiMessagesArray,
          temperature: 0.7,
          max_tokens: 250 
        });

        const botReply = aiResponse.choices[0].message.content.trim();

        if (settings.autoReplyDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, settings.autoReplyDelay));
        }

        // --- STEP 7: Send Reply via Meta Graph API ---
        // Using ENV variable to ensure we always have the right sender ID
        const active_phone_id = process.env.WHATSAPP_PHONE_NUMBER_ID || phone_number_id;
        const metaApiUrl = `https://graph.facebook.com/v25.0/${active_phone_id}/messages`;
        
        const metaResponse = await axios.post(metaApiUrl, {
          messaging_product: "whatsapp",
          to: from,
          text: { body: botReply }
        }, {
          headers: {
            "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        });

        const newWamid = metaResponse.data.messages[0].id;

        // --- STEP 8: Save AI Reply to DB ---
        const newAiMessage = await WhatsAppMessage.create({
          conversation_id: conversation._id,
          wamid: newWamid,
          sender_id: active_phone_id,
          receiver_id: from,
          text: botReply,
          is_from_me: true,
          message_type: 'text',
          status: 'sent'
        });

        conversation.last_message = botReply;
        conversation.last_message_time = Date.now();
        await conversation.save();

        // ====> EMIT TO FRONTEND (AI REPLY) <====
        if (io) {
          io.emit('newMessage', {
            conversation_id: conversation._id,
            message: newAiMessage
          });
          io.emit('chatUpdated', {
            _id: conversation._id,
            customer_name: conversation.customer_name,
            customer_phone: conversation.customer_phone,
            ai_enabled: conversation.ai_enabled,
            last_message: botReply,
            last_message_time: conversation.last_message_time,
            unread_count: conversation.unread_count
          });
        }

        console.log("AI Reply sent successfully!");
        
      } else {
        res.sendStatus(200);
      }
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Webhook Error:", error.response?.data || error.message);
    res.sendStatus(200); 
  }
};

module.exports = {
  verifyWebhook,
  handleIncomingMessage
};