
const express = require('express');
const router = express.Router();
const {
    getProducts,
    getTrendingProducts,
    getProductById,
    getRelatedProducts,
    deleteProduct,
    createProduct,
    updateProduct,
    createReview,
    getReviews,
    deleteReview
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getProducts)
    .post(protect, admin, createProduct);

router.get('/trending', getTrendingProducts);

// Related products must be before /:id to avoid route conflict
router.get('/:id/related', getRelatedProducts);

router.route('/:id')
    .get(getProductById)
    .delete(protect, admin, deleteProduct)
    .put(protect, admin, updateProduct);

// Review routes
router.route('/:id/reviews')
    .get(getReviews)
    .post(protect, createReview);
router.route('/:id/reviews/:reviewId')
    .delete(protect, admin, deleteReview);

module.exports = router;
