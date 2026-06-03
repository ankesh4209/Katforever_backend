const WhatsAppSetting = require('../../models/whatsappSettings');

// GET: Dashboard par settings dikhane ke liye
const getSettings = async (req, res) => {
  try {
    // getSettings() hamara custom method hai jo humne schema me banaya tha
    const settings = await WhatsAppSetting.getSettings(); 
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server Error while fetching settings." 
    });
  }
};

// PUT: Frontend se naya data save karne ke liye
const updateSettings = async (req, res) => {
  try {
    const { 
      isGlobalAiEnabled, 
      systemPrompt, 
      knowledgeBaseData, 
      faqs,
      autoReplyDelay
    } = req.body;

    // Database se existing document fetch karein
    let settings = await WhatsAppSetting.getSettings();

    // Sirf wahi fields update karein jo request me aayi hain
    if (isGlobalAiEnabled !== undefined) settings.isGlobalAiEnabled = isGlobalAiEnabled;
    if (systemPrompt !== undefined) settings.systemPrompt = systemPrompt;
    if (knowledgeBaseData !== undefined) settings.knowledgeBaseData = knowledgeBaseData;
    if (faqs !== undefined) settings.faqs = faqs;
    if (autoReplyDelay !== undefined) settings.autoReplyDelay = autoReplyDelay;

    // Changes save karein
    await settings.save();

    res.status(200).json({
      success: true,
      message: "AI Settings updated successfully!",
      data: settings
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server Error while updating settings." 
    });
  }
};

// CommonJS export
module.exports = {
  getSettings,
  updateSettings
};