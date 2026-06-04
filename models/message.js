const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderType: { 
    type: String, 
    enum: ['customer', 'admin', 'ai'], // Pata chalega reply kisne kiya
    required: true 
  },
  text: { type: String, required: true },
  messageId: { type: String }, // WhatsApp API ka original message ID
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);