const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate('products');

        if (!wishlist) {
            wishlist = { products: [] };
        }

        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle product in wishlist (Add/Remove)
// @route   POST /api/wishlist/toggle
// @access  Private
const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        // Validation for valid MongoDB Object ID (prevents server crashes on Dummy products)
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID. This might be a demo product.' });
        }

        let wishlist = await Wishlist.findOne({ user: req.user._id });

        // Create wishlist if it doesn't exist for this user
        if (!wishlist) {
            wishlist = new Wishlist({ user: req.user._id, products: [] });
        }

        // Standard Array checking and index search 
        const productIndex = wishlist.products.findIndex(p => p.toString() === productId);

        if (productIndex > -1) {
            // Product exists, so remove it
            wishlist.products.splice(productIndex, 1);
        } else {
            // Product does not exist, so add it
            wishlist.products.push(productId);
        }

        // Save atomically and repopulate the updated array
        await wishlist.save();
        await wishlist.populate('products');

        res.status(200).json(wishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getWishlist,
    toggleWishlist
};
