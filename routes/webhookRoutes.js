
const express = require('express');
const router = express.Router();
const {
    handleShiprocketWebhook,
    testStatusUpdate
} = require('../controllers/webhookController');
const { protect, admin } = require('../middleware/authMiddleware');

// Shiprocket webhook (public, no auth)
router.post('/shiprocket', handleShiprocketWebhook);

// Test webhook (admin only)
router.post('/test-update', protect, admin, testStatusUpdate);

module.exports = router;
