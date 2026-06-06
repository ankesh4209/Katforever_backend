const axios = require("axios");
const User = require("../../models/User");
const Offer = require("../../models/Offer");
const WhatsAppConversation = require("../../models/WhatsAppConversation");
const WhatsAppMessage = require("../../models/WhatsAppMessage");
const dotenv = require("dotenv");

dotenv.config();

exports.sendBroadcastToAll = async (req, res) => {
  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res
        .status(400)
        .json({ success: false, message: "Offer ID is required" });
    }

    // 1. Fetch Offer Details
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    // 2. Fetch Users with valid phone numbers
    const users = await User.find({
      phone: { $exists: true, $ne: null, $ne: "" },
    }).lean();

    if (users.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No users found with phone numbers in database.",
        });
    }

    let sentCount = 0;
    let failedCount = 0;

    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // 3. Loop through users and send Template Message
    for (const user of users) {
      try {
        // Format phone number to country code format (e.g., 919876543210)
        let userPhone = user.phone.replace(/\D/g, "");
        if (userPhone.length === 10) {
          userPhone = `91${userPhone}`;
        }

        // Prepare Variables for Template
        const customerName = user.name || "Customer";
        const discountText =
          offer.discountType === "percentage"
            ? `${offer.discountValue}%`
            : `₹${offer.discountValue}`;
        const minOrderStr = String(offer.minOrderAmount || 0); // Meta requires parameters as string
        const endDateStr = new Date(offer.endDate).toLocaleDateString("en-IN");

        // This text is saved in DB so Admin can read the sent message in the Inbox UI
        const messageTextPreview = `Hi ${customerName},\n\nWe are excited to announce our *${offer.title}*! 🎁\n\nUse coupon code *${offer.code}* at checkout to get *${discountText}* off on your next order. \n\nShop now and save big! This exclusive deal applies to all orders above ₹${minOrderStr}.\n\nHurry up, this offer is only valid until ${endDateStr}! ⏳`;

        // ==========================================
        // STEP A: SEND TEMPLATE MESSAGE VIA META API
        // ==========================================
        const metaResponse = await axios.post(
          `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: userPhone,
            type: "template",
            template: {
              name: "katforever_exclusive_offer", // <-- YOUR TEMPLATE NAME
              language: {
                code: "en_US", // <-- Ensure this matches your Meta template language
              },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customerName }, // {{1}}
                    { type: "text", text: offer.title }, // {{2}}
                    { type: "text", text: offer.code }, // {{3}}
                    { type: "text", text: discountText }, // {{4}}
                    { type: "text", text: minOrderStr }, // {{5}}
                    { type: "text", text: endDateStr }, // {{6}}
                  ],
                },
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
        );

        const wamid = metaResponse.data.messages[0].id;

        // ==========================================
        // STEP B: UPDATE DATABASE FOR FRONTEND INBOX
        // ==========================================

        let conversation = await WhatsAppConversation.findOne({
          customer_phone: userPhone,
        });

        if (!conversation) {
          conversation = await WhatsAppConversation.create({
            phone_number_id: PHONE_NUMBER_ID,
            customer_phone: userPhone,
            customer_name: customerName,
            last_message: `Promo: ${offer.title}`,
            last_message_time: new Date(),
            unread_count: 0,
          });
        } else {
          conversation.last_message = `Promo: ${offer.title}`;
          conversation.last_message_time = new Date();
          if (
            !conversation.customer_name ||
            conversation.customer_name === "WA User"
          ) {
            conversation.customer_name = customerName;
          }
          await conversation.save();
        }

        await WhatsAppMessage.create({
          conversation_id: conversation._id,
          wamid: wamid,
          sender_id: PHONE_NUMBER_ID,
          receiver_id: userPhone,
          text: messageTextPreview, // Saving the preview string for admin panel
          is_from_me: true,
          message_type: "template", // Changed type to template
          template_name: "katforever_exclusive_offer", // Storing template name for tracking
          status: "sent",
        });

        sentCount++;
      } catch (err) {
        console.error(
          `Failed to send to ${user.phone}:`,
          err?.response?.data || err.message,
        );
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Broadcast completed! Sent: ${sentCount}, Failed: ${failedCount}.`,
    });
  } catch (error) {
    console.error("Bulk Broadcast Error:", error);
    res
      .status(500)
      .json({ success: false, message: `Server error during broadcast: ${error.message}` });
  }
};
