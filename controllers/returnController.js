
const asyncHandler = require('express-async-handler');
const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create return/exchange request
// @route   POST /api/returns
// @access  Private
const createReturnRequest = asyncHandler(async (req, res) => {
    const { orderId, returnItems, returnType, reason, description, images } = req.body;

    // Validate order exists
    const order = await Order.findById(orderId).populate('user', 'name email');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Check if order belongs to user
    if (order.user._id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to return this order');
    }

    // Check if order is delivered
    if (!order.isDelivered) {
        res.status(400);
        throw new Error('Cannot return order that is not yet delivered');
    }

    // Check return window (7 days from delivery)
    const deliveryDate = new Date(order.deliveredAt);
    const today = new Date();
    const daysSinceDelivery = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));

    if (daysSinceDelivery > 7) {
        res.status(400);
        throw new Error('Return window expired (7 days from delivery)');
    }

    // Check if already returned
    const existingReturn = await Return.findOne({
        order: orderId,
        returnStatus: { $in: ['Requested', 'Approved', 'PickupScheduled', 'Picked'] }
    });

    if (existingReturn) {
        res.status(400);
        throw new Error('Return request already exists for this order');
    }

    // Validate return items exist in order
    for (const item of returnItems) {
        const orderItem = order.orderItems.find(
            oi => oi.product.toString() === item.product.toString()
        );
        if (!orderItem) {
            res.status(400);
            throw new Error(`Product ${item.product} not found in order`);
        }
        if (item.quantity > orderItem.qty) {
            res.status(400);
            throw new Error(`Return quantity exceeds ordered quantity for product`);
        }
    }

    // Calculate refund amount (for returns, not exchanges)
    let refundAmount = 0;
    if (returnType === 'Return') {
        for (const item of returnItems) {
            const orderItem = order.orderItems.find(
                oi => oi.product.toString() === item.product.toString()
            );
            refundAmount += orderItem.price * item.quantity;
        }
    }

    // Create return request
    const returnRequest = new Return({
        order: orderId,
        user: req.user._id,
        returnItems,
        returnType,
        reason,
        description: description || '',
        images: images || [],
        pickupAddress: order.shippingAddress,
        refundAmount,
        refundStatus: returnType === 'Return' ? 'Pending' : 'NA'
    });

    const createdReturn = await returnRequest.save();

    res.status(201).json({
        message: 'Return request created successfully',
        return: createdReturn
    });
});

// @desc    Get user's return requests
// @route   GET /api/returns/myreturns
// @access  Private
const getMyReturns = asyncHandler(async (req, res) => {
    const returns = await Return.find({ user: req.user._id })
        .populate('order', 'orderItems totalPrice')
        .populate('returnItems.product', 'name image')
        .sort({ createdAt: -1 });

    res.json(returns);
});

// @desc    Get return request by ID
// @route   GET /api/returns/:id
// @access  Private
const getReturnById = asyncHandler(async (req, res) => {
    const returnRequest = await Return.findById(req.params.id)
        .populate('order')
        .populate('user', 'name email')
        .populate('returnItems.product', 'name image');

    if (returnRequest) {
        // Check authorization
        if (returnRequest.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            res.status(401);
            throw new Error('Not authorized');
        }
        res.json(returnRequest);
    } else {
        res.status(404);
        throw new Error('Return request not found');
    }
});

// @desc    Cancel return request (before pickup)
// @route   PUT /api/returns/:id/cancel
// @access  Private
const cancelReturnRequest = asyncHandler(async (req, res) => {
    const returnRequest = await Return.findById(req.params.id);

    if (!returnRequest) {
        res.status(404);
        throw new Error('Return request not found');
    }

    // Check authorization
    if (returnRequest.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Can only cancel if not yet picked
    if (['Picked', 'Completed'].includes(returnRequest.returnStatus)) {
        res.status(400);
        throw new Error('Cannot cancel return that has been picked up');
    }

    returnRequest.returnStatus = 'Rejected';
    returnRequest.rejectionReason = 'Cancelled by customer';

    const updatedReturn = await returnRequest.save();
    res.json(updatedReturn);
});

// ========== ADMIN ROUTES ==========

// @desc    Get all return requests
// @route   GET /api/admin/returns
// @access  Private/Admin
const getAllReturns = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = status ? { returnStatus: status } : {};

    const returns = await Return.find(query)
        .populate('order', 'orderItems totalPrice')
        .populate('user', 'name email')
        .populate('returnItems.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

    const total = await Return.countDocuments(query);

    res.json({
        returns,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total
    });
});

// @desc    Update return status (Admin)
// @route   PUT /api/admin/returns/:id/status
// @access  Private/Admin
const updateReturnStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes, trackingNumber, rejectionReason } = req.body;

    const returnRequest = await Return.findById(req.params.id);

    if (!returnRequest) {
        res.status(404);
        throw new Error('Return request not found');
    }

    returnRequest.returnStatus = status;

    if (adminNotes) returnRequest.adminNotes = adminNotes;
    if (trackingNumber) returnRequest.trackingNumber = trackingNumber;
    if (rejectionReason) returnRequest.rejectionReason = rejectionReason;

    // If approved, can set pickup date
    if (status === 'Approved' && req.body.pickupDate) {
        returnRequest.pickupDate = new Date(req.body.pickupDate);
        returnRequest.returnStatus = 'PickupScheduled';
    }

    // If completed, restore stock and process refund
    if (status === 'Completed') {
        // Restore stock
        for (const item of returnRequest.returnItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock += item.quantity;
                product.inStock = product.stock > 0;
                await product.save();
                console.log(`✅ Stock restored for ${product.name}: +${item.quantity}`);
            }
        }

        // Mark refund as processing (actual refund would be done via payment gateway)
        if (returnRequest.returnType === 'Return') {
            returnRequest.refundStatus = 'Processing';
            // In real implementation, trigger refund via Razorpay API
        }
    }

    const updatedReturn = await returnRequest.save();

    res.json({
        message: 'Return status updated successfully',
        return: updatedReturn
    });
});

// @desc    Process refund (Admin)
// @route   PUT /api/admin/returns/:id/refund
// @access  Private/Admin
const processRefund = asyncHandler(async (req, res) => {
    const returnRequest = await Return.findById(req.params.id);

    if (!returnRequest) {
        res.status(404);
        throw new Error('Return request not found');
    }

    if (returnRequest.returnType !== 'Return') {
        res.status(400);
        throw new Error('Refund only applicable for returns, not exchanges');
    }

    if (returnRequest.returnStatus !== 'Completed') {
        res.status(400);
        throw new Error('Return must be completed before processing refund');
    }

    // Mark refund as completed
    returnRequest.refundStatus = 'Completed';
    returnRequest.refundedAt = Date.now();

    const updatedReturn = await returnRequest.save();

    res.json({
        message: 'Refund processed successfully',
        return: updatedReturn
    });
});

module.exports = {
    createReturnRequest,
    getMyReturns,
    getReturnById,
    cancelReturnRequest,
    getAllReturns,
    updateReturnStatus,
    processRefund
};
