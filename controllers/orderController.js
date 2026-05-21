
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');


const addOrderItems = async (req, res) => {
    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
        } = req.body;

        if (orderItems && orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        console.log("=== INCOMING ORDER PAYLOAD ===");
        console.log(JSON.stringify(req.body, null, 2));
        console.log("===============================");

        // Validate stock for all items
        for (const item of orderItems) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    message: `Product not found: ${item.name}`
                });
            }

            if (product.stock < item.qty) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
                });
            }
        }

        // Create order with proper initial states
        const order = new Order({
            orderItems,
            user: req.user._id,
            shippingAddress,
            paymentMethod: paymentMethod || 'COD',
            itemsPrice,
            shippingPrice: shippingPrice || 0,
            totalPrice,
            advancePayment: req.body.advancePayment || {},

            // Initial states based on payment method
            paymentStatus: 'Pending',
            orderStatus: 'Pending', // Remains pending until payment confirmed or admin processes
        });

        const createdOrder = await order.save();

        // Decrease stock for all items
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            product.stock -= item.qty;
            product.inStock = product.stock > 0;
            await product.save();
        }

        // Send order confirmation email (non-blocking, should not fail order)
        try {
            const { sendOrderConfirmation } = require('../utils/emailService');
            await sendOrderConfirmation(createdOrder, req.user.email);
        } catch (emailErr) {
            console.error('Email send failed (non-critical):', emailErr.message);
        }

        res.status(201).json(createdOrder);
    } catch (error) {
        console.error('Order creation failed:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders?page=1&limit=10
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

    const totalOrders = await Order.countDocuments({ user: req.user._id });

    res.json({
        orders,
        page: pageNum,
        pages: Math.ceil(totalOrders / limitNum),
        total: totalOrders
    });
});


// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order to paid (After Razorpay verification)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

            order.paymentStatus = 'Paid';
            order.paymentResult = {
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
                paidAt: Date.now()
            };

            // Move to Processing after successful payment
            if (order.orderStatus === 'Pending') {
                order.orderStatus = 'Processing';
            }

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process order (Admin starts processing)
// @route   PUT /api/orders/:id/process
// @access  Private/Admin
const processOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            // COD orders can be processed directly, Razorpay must be paid
            if (order.paymentMethod === 'Razorpay' && order.paymentStatus !== 'Paid') {
                res.status(400).json({ message: 'Payment not completed yet' });
                return;
            }

            order.orderStatus = 'Processing';
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ship order (Admin marks as shipped)
// @route   PUT /api/orders/:id/ship
// @access  Private/Admin
const shipOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            if (order.orderStatus !== 'Processing') {
                res.status(400).json({ message: 'Order must be in Processing state' });
                return;
            }

            order.orderStatus = 'Shipped';
            order.trackingNumber = req.body.trackingNumber || '';

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            if (order.orderStatus !== 'Shipped') {
                res.status(400).json({ message: 'Order must be shipped first' });
                return;
            }

            order.isDelivered = true;
            order.deliveredAt = Date.now();
            order.orderStatus = 'Delivered';

            // For COD, mark as paid on delivery
            if (order.paymentMethod === 'COD') {
                order.paymentStatus = 'Paid';
                order.paymentResult = { paidAt: Date.now() };
            }

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order status manually (Admin force override)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatusAdmin = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            const { status } = req.body;
            const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid order status provided' });
            }

            order.orderStatus = status;

            // Handle special side-effects if status is directly forced to Delivered
            if (status === 'Delivered' && !order.isDelivered) {
                order.isDelivered = true;
                order.deliveredAt = Date.now();
                if (order.paymentMethod === 'COD' && order.paymentStatus !== 'Paid') {
                    order.paymentStatus = 'Paid';
                    order.paymentResult = { paidAt: Date.now() };
                }
            }

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel Order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            // Check if user owns order or is admin
            if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
                res.status(401).json({ message: 'Not authorized' });
                return;
            }

            // Cannot cancel if already shipped or delivered
            if (['Shipped', 'Delivered'].includes(order.orderStatus)) {
                res.status(400).json({ message: 'Cannot cancel shipped/delivered order' });
                return;
            }

            // ✨ RESTORE STOCK for all items in the order
            for (const item of order.orderItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.qty;  // Add back the quantity
                    product.inStock = product.stock > 0;
                    await product.save();
                    console.log(`✅ Stock restored for ${product.name}: +${item.qty} (New stock: ${product.stock})`);
                }
            }

            order.orderStatus = 'Cancelled';
            order.isCancelled = true;
            order.cancelledAt = Date.now();
            order.cancellationReason = req.body.reason || 'Customer requested';

            // If paid, mark for refund
            if (order.paymentStatus === 'Paid') {
                order.paymentStatus = 'Refunded';
            }

            const updatedOrder = await order.save();

            // Send cancellation notification email
            try {
                const { sendOrderStatusUpdate } = require('../utils/emailService');
                const User = require('../models/User');
                const user = await User.findById(order.user);
                if (user) {
                    await sendOrderStatusUpdate(updatedOrder, user.email);
                }
            } catch (emailError) {
                console.log('Email notification failed:', emailError.message);
            }

            res.json({
                message: 'Order cancelled successfully and stock restored',
                order: updatedOrder
            });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



module.exports = {
    addOrderItems,
    getMyOrders,
    getOrderById,
    updateOrderToPaid,
    processOrder,
    shipOrder,
    updateOrderToDelivered,
    cancelOrder,
    updateOrderStatusAdmin
};
