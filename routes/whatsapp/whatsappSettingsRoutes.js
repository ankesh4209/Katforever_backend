const express = require('express');
const { getSettings, updateSettings } = require('../../controllers/whatsapp/whatsaapSettingsController');

const router = express.Router();

const { protect, admin } = require('../../middleware/authMiddleware');

router.use(protect, admin);

// GET request: http://localhost:PORT/api/settings (Settings fetch karne ke liye)
router.get('/data', getSettings);

// PUT request: http://localhost:PORT/api/settings (Settings update/save karne ke liye)
router.put('/data', updateSettings);

module.exports = router;