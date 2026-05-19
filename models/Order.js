
const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },

    orderItems: [{
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' }
    }],

    shippingAddress: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    },

    // Pricing breakdown
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, default: 0.0 },
    shippingPrice: { type: Number, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // Payment Info
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'Razorpay', 'Wallet'],
        default: 'COD'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    paymentResult: {
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        paidAt: { type: Date }
    },
    advancePayment: {
        amount: { type: Number, default: 0.0 },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        paidAt: { type: Date }
    },

    // Order Status Lifecycle
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },

    // Delivery tracking
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    trackingNumber: { type: String },

    // Courier integration details
    courierDetails: {
        provider: {
            type: String,
            enum: ['Shiprocket', 'Manual', 'Delhivery'],
            default: 'Manual'
        },
        shipmentId: { type: String },
        awb: { type: String },
        courierName: { type: String },
        courierPhone: { type: String },
        estimatedDelivery: { type: Date }
    },

    // Tracking history for real-time updates
    trackingUpdates: [{
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
        location: { type: String },
        description: { type: String },
        courierRemarks: { type: String }
    }],

    // Package dimensions (for shipping cost calculation)
    dimensions: {
        weight: { type: Number, default: 0.5 }, // in kg
        length: { type: Number, default: 10 },  // in cm
        breadth: { type: Number, default: 10 },
        height: { type: Number, default: 10 }
    },

    // Cancellation
    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancellationReason: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
