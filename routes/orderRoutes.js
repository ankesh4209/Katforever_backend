
const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    getMyOrders,
    getOrderById,
    updateOrderToPaid,
    processOrder,
    shipOrder,
    updateOrderToDelivered,
    cancelOrder,
    updateOrderStatusAdmin
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, addOrderItems);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/process').put(protect, admin, processOrder);
router.route('/:id/ship').put(protect, admin, shipOrder);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/cancel').put(protect, cancelOrder);
router.route('/:id/status').put(protect, admin, updateOrderStatusAdmin);

module.exports = router;
