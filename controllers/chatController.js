const asyncHandler = require("express-async-handler");
const axios = require("axios");

const generateChatResponse = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  const openAiKey =
    process.env.OPENAI_API_KEY ||
    process.env.openai_api_key ||
    process.env.OPENAI_KEY ||
    process.env.OPENAI_SECRET;

  if (!openAiKey) {
    return res.status(500).json({ message: "OpenAI API key is not configured" });
  }

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

  const messages = [
    {
      role: "system",
      content:
        "You are a friendly customer support assistant for Kat Forever. Answer in a helpful, concise, and polite way about shopping, orders, payments, returns, and product details.",
    },
    ...safeHistory,
    {
      role: "user",
      content: message.trim(),
    },
  ];

  const payload = {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.6,
    max_tokens: 300,
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const chatText = response.data?.choices?.[0]?.message?.content?.trim();

    if (!chatText) {
      return res.status(502).json({ message: "No response from OpenAI" });
    }

    return res.status(200).json({ message: chatText });
  } catch (error) {
    const status = error.response?.status;
    const openAiMessage =
      error.response?.data?.error?.message || error.message;

    if (status === 401 || status === 403) {
      console.error(`OpenAI auth failed (${status}): ${openAiMessage}`);
      return res.status(502).json({
        message:
          "OpenAI authorization failed. Please verify your OpenAI API key and billing permissions.",
      });
    }

    if (status === 429) {
      console.error(`OpenAI rate limit (${status}): ${openAiMessage}`);
      return res.status(429).json({
        message:
          "Too many AI requests. Please wait a few seconds and try again.",
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        message: "OpenAI request timeout. Please try again.",
      });
    }

    console.error(
      `OpenAI request failed (${status || "unknown"}): ${openAiMessage}`
    );

    return res.status(502).json({
      message: "AI service is temporarily unavailable. Please try again later.",
    });
  }
});

module.exports = { generateChatResponse };