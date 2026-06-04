const express = require('express');
const { getConversations, getMessages,sendManualMessage } = require('../../controllers/whatsapp/whatsappChatController');

const router = express.Router();

// GET: /api/wa/chats - Saari chats fetch karne ke liye
router.get('/', getConversations);

// GET: /api/wa/chats/:conversationId/messages - Ek chat ke saare messages fetch karne ke liye
router.get('/:conversationId/messages', getMessages);

router.post('/:conversationId/messages', sendManualMessage);

module.exports = router;