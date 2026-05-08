
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const {
    createShipment,
    generateAWB,
    trackShipment,
    schedulePickup
} = require('../utils/shiprocketService');

// @desc    Ship order with Shiprocket integration
// @route   PUT /api/shipping/:orderId/ship
// @access  Private/Admin
const shipWithShiprocket = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId)
        .populate('user', 'name email phone')
        .populate('orderItems.product', 'name');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.orderStatus !== 'Processing') {
        res.status(400);
        throw new Error('Order must be in Processing state to ship');
    }

    // Prepare shipment data
    const shipmentData = {
        orderId: order._id.toString(),
        customer: {
            name: order.shippingAddress.fullName || order.user.name,
            email: order.user.email,
            phone: order.shippingAddress.phoneNumber || order.user.phone || '9999999999'
        },
        shippingAddress: {
            address: order.shippingAddress.address,
            city: order.shippingAddress.city,
            postalCode: order.shippingAddress.postalCode,
            state: order.shippingAddress.state || 'Maharashtra',
            country: order.shippingAddress.country || 'India'
        },
        items: order.orderItems.map(item => ({
            product: item.product._id,
            name: item.name,
            qty: item.qty,
            price: item.price
        })),
        itemsPrice: order.itemsPrice,
        shippingPrice: order.shippingPrice,
        paymentMethod: order.paymentMethod,
        dimensions: order.dimensions || {
            weight: 0.5,
            length: 10,
            breadth: 10,
            height: 10
        }
    };

    // Create shipment on Shiprocket
    const shipmentResult = await createShipment(shipmentData);

    if (!shipmentResult.success) {
        res.status(500);
        throw new Error(`Shiprocket error: ${shipmentResult.error}`);
    }

    // Generate AWB if not provided
    let awbCode = shipmentResult.awb;
    if (!awbCode && shipmentResult.shipmentId) {
        const awbResult = await generateAWB(shipmentResult.shipmentId);
        if (awbResult.success) {
            awbCode = awbResult.awb;
        }
    }

    // Update order with Shiprocket details
    order.orderStatus = 'Shipped';
    order.trackingNumber = awbCode || shipmentResult.awb;
    order.courierDetails = {
        provider: 'Shiprocket',
        shipmentId: shipmentResult.shipmentId,
        awb: awbCode || shipmentResult.awb,
        courierName: shipmentResult.courierName || 'Pending Assignment'
    };

    // Add tracking update
    order.trackingUpdates.push({
        status: 'Shipped',
        timestamp: new Date(),
        description: 'Order shipped via Shiprocket',
        location: 'Warehouse'
    });

    const updatedOrder = await order.save();

    // Schedule pickup (optional, can be done automatically)
    if (shipmentResult.shipmentId) {
        await schedulePickup(shipmentResult.shipmentId);
    }

    // Send email notification
    try {
        const { sendOrderStatusUpdate } = require('../utils/emailService');
        await sendOrderStatusUpdate(updatedOrder, order.user.email);
    } catch (emailError) {
        console.log('Email notification failed:', emailError.message);
    }

    res.json({
        message: 'Order shipped successfully with Shiprocket',
        order: updatedOrder,
        tracking: {
            awb: awbCode || shipmentResult.awb,
            courier: shipmentResult.courierName,
            trackUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null
        }
    });
});

// @desc    Ship order manually (without Shiprocket)
// @route   PUT /api/shipping/:orderId/manual-ship
// @access  Private/Admin
const shipManually = asyncHandler(async (req, res) => {
    const { trackingNumber, courierName, courierPhone } = req.body;

    const order = await Order.findById(req.params.orderId);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.orderStatus !== 'Processing') {
        res.status(400);
        throw new Error('Order must be in Processing state');
    }

    // Update order with manual tracking details
    order.orderStatus = 'Shipped';
    order.trackingNumber = trackingNumber || '';
    order.courierDetails = {
        provider: 'Manual',
        courierName: courierName || 'Local Courier',
        courierPhone: courierPhone || ''
    };

    order.trackingUpdates.push({
        status: 'Shipped',
        timestamp: new Date(),
        description: 'Order shipped manually',
        courierRemarks: `Courier: ${courierName || 'Local Courier'}`
    });

    const updatedOrder = await order.save();

    res.json({
        message: 'Order shipped successfully (manual)',
        order: updatedOrder
    });
});

// @desc    Get real-time tracking for order
// @route   GET /api/shipping/track/:orderId
// @access  Public (with order ID)
const getOrderTracking = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId)
        .select('orderStatus trackingNumber courierDetails trackingUpdates isDelivered deliveredAt');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // If Shiprocket, get live tracking
    let liveTracking = null;
    if (order.courierDetails?.provider === 'Shiprocket' && order.trackingNumber) {
        const trackingResult = await trackShipment(order.trackingNumber);
        if (trackingResult.success) {
            liveTracking = trackingResult;
        }
    }

    res.json({
        orderId: order._id,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        courier: order.courierDetails?.courierName || 'N/A',
        isDelivered: order.isDelivered,
        deliveredAt: order.deliveredAt,

        // Live tracking from Shiprocket
        liveTracking: liveTracking ? {
            currentStatus: liveTracking.currentStatus,
            currentLocation: liveTracking.currentLocation,
            expectedDelivery: liveTracking.expectedDelivery,
            trackUrl: liveTracking.trackUrl
        } : null,

        // Historical tracking updates
        trackingHistory: order.trackingUpdates.sort((a, b) => b.timestamp - a.timestamp)
    });
});

// @desc    Bulk ship orders with Shiprocket
// @route   POST /api/shipping/bulk-ship
// @access  Private/Admin
const bulkShipOrders = asyncHandler(async (req, res) => {
    const { orderIds } = req.body;

    if (!orderIds || orderIds.length === 0) {
        res.status(400);
        throw new Error('No order IDs provided');
    }

    const results = [];

    for (const orderId of orderIds) {
        try {
            const order = await Order.findById(orderId)
                .populate('user', 'name email phone')
                .populate('orderItems.product', 'name');

            if (!order || order.orderStatus !== 'Processing') {
                results.push({
                    orderId,
                    success: false,
                    error: 'Order not found or not in Processing state'
                });
                continue;
            }

            // Create shipment (similar to shipWithShiprocket)
            const shipmentData = {
                orderId: order._id.toString(),
                customer: {
                    name: order.user.name,
                    email: order.user.email,
                    phone: order.user.phone || '9999999999'
                },
                shippingAddress: order.shippingAddress,
                items: order.orderItems.map(item => ({
                    product: item.product._id,
                    name: item.name,
                    qty: item.qty,
                    price: item.price
                })),
                itemsPrice: order.itemsPrice,
                shippingPrice: order.shippingPrice,
                paymentMethod: order.paymentMethod,
                dimensions: order.dimensions
            };

            const shipmentResult = await createShipment(shipmentData);

            if (shipmentResult.success) {
                order.orderStatus = 'Shipped';
                order.trackingNumber = shipmentResult.awb;
                order.courierDetails = {
                    provider: 'Shiprocket',
                    shipmentId: shipmentResult.shipmentId,
                    awb: shipmentResult.awb
                };
                await order.save();

                results.push({
                    orderId,
                    success: true,
                    trackingNumber: shipmentResult.awb
                });
            } else {
                results.push({
                    orderId,
                    success: false,
                    error: shipmentResult.error
                });
            }
        } catch (error) {
            results.push({
                orderId,
                success: false,
                error: error.message
            });
        }
    }

    res.json({
        message: 'Bulk shipping completed',
        results,
        summary: {
            total: orderIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }
    });
});

module.exports = {
    shipWithShiprocket,
    shipManually,
    getOrderTracking,
    bulkShipOrders
};
