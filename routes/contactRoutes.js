const express = require('express');
const router = express.Router();
const { submitContactForm, getContactSubmissions } = require('../controllers/contactController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(submitContactForm)
    .get(protect, admin, getContactSubmissions);

module.exports = router;
