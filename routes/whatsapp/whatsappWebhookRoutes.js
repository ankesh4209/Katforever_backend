const express = require('express');
const { verifyWebhook, handleIncomingMessage } = require('../../controllers/whatsapp/whatsaapWebhookController');

const router = express.Router();

// Meta webhook verification URL
router.get('/', verifyWebhook);

// Meta message receiving URL
router.post('/', handleIncomingMessage);

module.exports = router;