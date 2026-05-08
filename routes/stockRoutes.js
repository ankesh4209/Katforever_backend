
const express = require('express');
const router = express.Router();
const {
    getLowStockProducts,
    updateStock,
    bulkUpdateStock
} = require('../controllers/stockController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are admin-protected
router.use(protect, admin);

router.route('/low').get(getLowStockProducts);
router.route('/bulk').post(bulkUpdateStock);
router.route('/:id').put(updateStock);

module.exports = router;
