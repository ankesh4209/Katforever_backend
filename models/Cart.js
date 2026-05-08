
const mongoose = require('mongoose');

const cartSchema = mongoose.Schema({
    // For logged-in users
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true // Allows null for guest carts
    },

    // For guest users (before login)
    sessionId: {
        type: String,
        sparse: true, // Allows null for logged-in user carts
        index: true
    },

    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        price: {
            type: Number,
            required: true // Lock price at time of adding to cart
        },
        name: String, // Cache for quick display
        image: String  // Cache for quick display
    }],

    // Auto-delete old guest carts after 7 days
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        index: { expires: 0 } // TTL index
    }
}, { timestamps: true });

// Ensure either user OR sessionId exists (not both, not neither)
cartSchema.index({ user: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Cart', cartSchema);
