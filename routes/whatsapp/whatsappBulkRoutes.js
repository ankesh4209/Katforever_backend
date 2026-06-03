const express = require('express');
const  sendBulkBroadcast  = require('../../controllers/whatsapp/whatsappBulkController');
const router = express.Router();

router.post('/send', sendBulkBroadcast.sendBroadcastToAll);

module.exports = router;