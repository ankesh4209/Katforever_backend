const axios = require('axios'); // <-- Naya addition Meta API call ke liye
const WhatsAppConversation = require('../../models/WhatsAppConversation');
const WhatsAppMessage = require('../../models/WhatsAppMessage');
const dotenv = require('dotenv');


dotenv.config();


// 1. Get all conversations (For the sidebar)
const getConversations = async (req, res) => {
  try {
    const conversations = await WhatsAppConversation.find()
      .sort({ last_message_time: -1 }); // Nayi chats sabse upar
    
    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ success: false, message: "Server error fetching chats" });
  }
};

// 2. Get messages for a specific conversation (For the active chat area)
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await WhatsAppMessage.find({ conversation_id: conversationId })
      .sort({ createdAt: 1 }); // Purane messages upar, naye neeche (chronological)

    // Mark as read: Reset unread count when user opens chat
    await WhatsAppConversation.findByIdAndUpdate(conversationId, { unread_count: 0 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Server error fetching messages" });
  }
};

// 3. Send Manual Message from Dashboard
const sendManualMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ success: false, message: "Message text cannot be empty" });
    }

    // Chat data nikalo taaki customer ka number mil sake
    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Sender ID (Your WhatsApp Business Phone Number ID)
    const active_phone_id = process.env.WHATSAPP_PHONE_NUMBER_ID || conversation.phone_number_id;

    // Meta Graph API URL
    const metaApiUrl = `https://graph.facebook.com/v25.0/${active_phone_id}/messages`;
    
    // Send message to WhatsApp via Meta API
    const metaResponse = await axios.post(metaApiUrl, {
      messaging_product: "whatsapp",
      to: conversation.customer_phone,
      text: { body: text }
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    // Extract message ID given by Meta
    const newWamid = metaResponse.data.messages[0].id;

    // Save this manual reply to the database
    const newManualMessage = await WhatsAppMessage.create({
      conversation_id: conversation._id,
      wamid: newWamid,
      sender_id: active_phone_id,
      receiver_id: conversation.customer_phone,
      text: text,
      is_from_me: true,
      message_type: 'text',
      status: 'sent'
    });

    // Update conversation's last message
    conversation.last_message = text;
    conversation.last_message_time = Date.now();
    
    // Optional: Agar aap manual reply kar rahe hain, toh kya AI ko us chat ke liye band karna hai?
    // conversation.ai_enabled = false; 

    await conversation.save();

    // ====> WebSocket se Frontend ko turant update do <====
    const io = req.app.get('io');
    if (io) {
      io.emit('newMessage', {
        conversation_id: conversation._id,
        message: newManualMessage
      });
      io.emit('chatUpdated', {
        _id: conversation._id,
        customer_name: conversation.customer_name,
        customer_phone: conversation.customer_phone,
        ai_enabled: conversation.ai_enabled,
        last_message: text,
        last_message_time: conversation.last_message_time,
        unread_count: conversation.unread_count
      });
    }

    res.status(200).json({ success: true, data: newManualMessage, message: "Message sent successfully" });

  } catch (error) {
    console.error("Error sending manual message:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to send message via Meta API" });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendManualMessage
};