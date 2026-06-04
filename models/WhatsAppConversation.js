const mongoose = require("mongoose");

const waConversationSchema = new mongoose.Schema({
  // Use the env variable as a default, fallback to a required string if env is missing
  phone_number_id: { 
    type: String, 
    required: true,
    default: () => process.env.WHATSAPP_PHONE_NUMBER_ID 
  },
  customer_phone: { type: String, required: true }, 
  customer_name: { type: String, default: "WA User" },
  last_message: { type: String, default: "" },
  last_message_time: { type: Date, default: Date.now },
  ai_enabled: { type: Boolean, default: true },
  
  // Store the OpenAI Thread ID to maintain conversation memory
  ai_thread_id: { type: String, default: null }, 
  
  // Helpful for your frontend unread badge logic
  unread_count: { type: Number, default: 0 } 
}, { timestamps: true });

// Prevent duplicate conversations for the same number under the same business phone
waConversationSchema.index({ phone_number_id: 1, customer_phone: 1 }, { unique: true });

module.exports = mongoose.model("WhatsAppConversation", waConversationSchema);