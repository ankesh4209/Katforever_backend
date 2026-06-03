const mongoose = require("mongoose");

const waMessageSchema = new mongoose.Schema({
  conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppConversation', required: true },
  
  // NEW: Meta's unique message ID to prevent duplicate webhook processing
  wamid: { type: String, unique: true, sparse: true }, 
  
  sender_id: { type: String, required: true },
  receiver_id: { type: String, required: true },
  text: { type: String, required: true },
  is_from_me: { type: Boolean, required: true },
  message_type: { type: String, enum: ['text', 'template', 'image', 'document', 'interactive'], default: 'text' },
  template_name: { type: String },
  
  // NEW: Track delivery status of your bot's replies
  status: { type: String, enum: ['sent', 'delivered', 'read', 'failed', 'received'], default: 'received' },
}, { timestamps: true });

// Optimize querying messages for a specific chat
waMessageSchema.index({ conversation_id: 1, createdAt: -1 }); 

module.exports = mongoose.model("WhatsAppMessage", waMessageSchema);