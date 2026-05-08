const express = require('express');
const router = express.Router();
const { subscribeNewsletter, getSubscribers } = require('../controllers/newsletterController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getSubscribers);

router.post('/subscribe', subscribeNewsletter);

module.exports = router;
