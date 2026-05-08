
const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getAllOrders,
    getOrderStats,
    getAllPayments,
    getPaymentStats,
    getAllUsers,
    toggleUserAdmin,
    deleteUser
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are admin-protected
router.use(protect, admin);

router.route('/dashboard').get(getDashboardStats);
router.route('/orders').get(getAllOrders);
router.route('/orders/stats').get(getOrderStats);
router.route('/payments').get(getAllPayments);
router.route('/payments/stats').get(getPaymentStats);
router.route('/users').get(getAllUsers);
router.route('/users/:id/toggle').put(toggleUserAdmin);
router.route('/users/:id').delete(deleteUser);

module.exports = router;
