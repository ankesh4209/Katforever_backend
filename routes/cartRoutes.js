
const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    mergeCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Optional auth middleware - allows both guest and logged-in users
// Checks cookies first (like protect), then falls back to Authorization header
const optionalAuth = async (req, res, next) => {
    let token;

    // Check cookies first (HTTP-only JWT cookie)
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const User = require('../models/User');

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            // Invalid token, continue as guest
        }
    }
    next();
};

// Public routes with optional auth
router.get('/', optionalAuth, getCart);
router.post('/', optionalAuth, addToCart);          // Allow POST to /api/cart
router.post('/add', optionalAuth, addToCart);       // Alternative route
router.put('/:itemId', optionalAuth, updateCartItem);
router.delete('/clear', optionalAuth, clearCart);   // Must be before /:itemId
router.delete('/:itemId', optionalAuth, removeFromCart);

// Logged-in only
router.post('/merge', protect, mergeCart);

module.exports = router;
