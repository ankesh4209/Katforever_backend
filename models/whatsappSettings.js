const mongoose = require('mongoose');

const whatsappSettingsSchema = new mongoose.Schema({
  isGlobalAiEnabled: { 
    type: Boolean, 
    default: false // Default off until you add data
  },
  systemPrompt: { 
    type: String, 
    default: "You are a helpful customer support AI for Katforever. Be polite, concise, and only answer based on the provided knowledge base." 
  },
  knowledgeBaseData: { 
    type: String, 
    default: "",
    description: "General unstructured data: Return policies, shop timings, shipping rules, etc." 
  },
  faqs: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  autoReplyDelay: {
    type: Number,
    default: 0 // Delay in ms to make the AI feel more human
  }
}, { timestamps: true });

// Static method to ensure we only ever have ONE settings document
whatsappSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('WhatsAppSetting', whatsappSettingsSchema);