const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

// All wishlist routes require authentication
router.route('/').get(protect, getWishlist);
router.route('/toggle').post(protect, toggleWishlist);

module.exports = router;
