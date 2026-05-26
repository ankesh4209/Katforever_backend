const express = require('express');
const router = express.Router();

const {
  getDashboardReports
} = require('../controllers/reportController');

const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, admin, getDashboardReports);

module.exports = router;