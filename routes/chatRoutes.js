const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../controllers/chatController');

router.post('/', generateChatResponse);

module.exports = router;
