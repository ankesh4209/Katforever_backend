
const express = require('express');
const router = express.Router();
const {
    shipWithShiprocket,
    shipManually,
    getOrderTracking,
    bulkShipOrders
} = require('../controllers/shippingController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin shipping routes
router.put('/:orderId/ship', protect, admin, shipWithShiprocket);
router.put('/:orderId/manual-ship', protect, admin, shipManually);
router.post('/bulk-ship', protect, admin, bulkShipOrders);

// Public tracking route (no auth required, just order ID)
router.get('/track/:orderId', getOrderTracking);

module.exports = router;
