const asyncHandler = require("express-async-handler");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateChatResponse = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  // Validation
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  try {
    // Safe history
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-6)
      : [];

    // Messages
    const messages = [
      {
        role: "system",
        content:
          "You are a friendly customer support assistant for Kat Forever. Help users with orders, payment, returns, cancellation, shipping, and product details. Keep answers short and helpful.",
      },

      ...safeHistory,

      {
        role: "user",
        content: message,
      },
    ];

    // OpenAI API
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.5,
      max_tokens: 220,
    });

    const chatText =
      response?.choices?.[0]?.message?.content?.trim();

    if (!chatText) {
      return res.status(500).json({
        success: false,
        message: "No AI response received",
      });
    }

    return res.status(200).json({
      success: true,
      message: chatText,
    });
  } catch (error) {
    console.log("OPENAI ERROR =>", error);

    // Rate Limit
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "AI request limit exceeded. Please try again after some time.",
      });
    }

    // Invalid API Key
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Invalid OpenAI API key",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "AI service temporarily unavailable",
    });
  }
});

module.exports = {
  generateChatResponse,
};