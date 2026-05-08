
const mongoose = require('mongoose');

const returnSchema = mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Order'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    returnItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product'
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        reason: { type: String, required: true }
    }],

    returnType: {
        type: String,
        enum: ['Return', 'Exchange'],
        required: true,
        default: 'Return'
    },

    reason: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    images: [String],  // Photos of damaged/defective items

    returnStatus: {
        type: String,
        enum: ['Requested', 'Approved', 'Rejected', 'PickupScheduled', 'Picked', 'Completed'],
        default: 'Requested'
    },

    // Pickup details
    pickupAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, default: 'India' },
        phoneNumber: { type: String }
    },

    pickupDate: Date,
    trackingNumber: String,

    // Refund details (for returns)
    refundAmount: {
        type: Number,
        default: 0
    },

    refundStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Failed'],
        default: 'Pending'
    },

    refundedAt: Date,

    // Admin notes
    adminNotes: String,

    // Rejection reason
    rejectionReason: String

}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
