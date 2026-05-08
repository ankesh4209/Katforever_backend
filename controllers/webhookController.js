
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');

// @desc    Handle Shiprocket webhook for order status updates
// @route   POST /api/webhooks/shiprocket
// @access  Public (but validated)
const handleShiprocketWebhook = asyncHandler(async (req, res) => {
    try {
        const webhookData = req.body;

        console.log('📩 Shiprocket Webhook Received:', JSON.stringify(webhookData, null, 2));

        // Extract webhook data
        const {
            order_id,
            awb,
            current_status,
            courier_name,
            shipped_date,
            delivered_date,
            location,
            courier_agent_details
        } = webhookData;

        // Find order by AWB or order ID
        let order = await Order.findOne({
            $or: [
                { 'courierDetails.awb': awb },
                { _id: order_id }
            ]
        });

        if (!order) {
            console.log('⚠️ Order not found for webhook');
            return res.status(200).json({ message: 'Order not found, webhook acknowledged' });
        }

        // Map Shiprocket status to our order status
        const statusMap = {
            'SHIPPED': 'Shipped',
            'IN TRANSIT': 'Shipped',
            'OUT FOR DELIVERY': 'Shipped',
            'DELIVERED': 'Delivered',
            'RTO INITIATED': 'Cancelled',
            'RTO DELIVERED': 'Cancelled',
            'LOST': 'Cancelled',
            'DAMAGED': 'Cancelled'
        };

        const newOrderStatus = statusMap[current_status] || order.orderStatus;

        // Update order status
        if (newOrderStatus === 'Delivered' && !order.isDelivered) {
            order.isDelivered = true;
            order.deliveredAt = delivered_date ? new Date(delivered_date) : new Date();
            order.orderStatus = 'Delivered';

            // For COD orders, mark as paid on delivery
            if (order.paymentMethod === 'COD' && order.paymentStatus !== 'Paid') {
                order.paymentStatus = 'Paid';
                order.paymentResult = {
                    paidAt: new Date()
                };
            }
        } else {
            order.orderStatus = newOrderStatus;
        }

        // Add tracking update
        order.trackingUpdates.push({
            status: current_status,
            timestamp: new Date(),
            location: location || courier_name || '',
            description: `Status: ${current_status}`,
            courierRemarks: courier_agent_details || ''
        });

        // Update courier details if available
        if (courier_name) {
            order.courierDetails.courierName = courier_name;
        }

        await order.save();

        console.log(`✅ Order ${order._id} updated to status: ${current_status}`);

        // Send notification to customer (email/SMS)
        try {
            const { sendOrderStatusUpdate } = require('../utils/emailService');
            const User = require('../models/User');
            const user = await User.findById(order.user);

            if (user) {
                await sendOrderStatusUpdate(order, user.email);
            }
        } catch (emailError) {
            console.log('Email notification failed:', emailError.message);
        }

        res.status(200).json({
            message: 'Webhook processed successfully',
            orderId: order._id,
            status: current_status
        });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
            message: 'Webhook processing failed',
            error: error.message
        });
    }
});

// @desc    Manual status update for testing
// @route   POST /api/webhooks/test-update
// @access  Private/Admin
const testStatusUpdate = asyncHandler(async (req, res) => {
    const { orderId, status, location, description } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    order.trackingUpdates.push({
        status: status || 'Test Update',
        timestamp: new Date(),
        location: location || 'Test Location',
        description: description || 'Manual test update'
    });

    await order.save();

    res.json({
        message: 'Test update added successfully',
        order
    });
});

module.exports = {
    handleShiprocketWebhook,
    testStatusUpdate
};
