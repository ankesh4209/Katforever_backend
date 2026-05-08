
const express = require('express');
const router = express.Router();
const {
    createReturnRequest,
    getMyReturns,
    getReturnById,
    cancelReturnRequest,
    getAllReturns,
    updateReturnStatus,
    processRefund
} = require('../controllers/returnController');
const { protect, admin } = require('../middleware/authMiddleware');

// User routes
router.route('/').post(protect, createReturnRequest);
router.route('/myreturns').get(protect, getMyReturns);
router.route('/:id').get(protect, getReturnById);
router.route('/:id/cancel').put(protect, cancelReturnRequest);

// Admin routes
router.route('/admin/all').get(protect, admin, getAllReturns);
router.route('/admin/:id/status').put(protect, admin, updateReturnStatus);
router.route('/admin/:id/refund').put(protect, admin, processRefund);

module.exports = router;
