const express = require('express');
const router = express.Router();
const {
    getBanners,
    getAllBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBanner
} = require('../controllers/bannerController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getBanners);

// Admin routes
router.get('/admin', protect, admin, getAllBanners);
router.post('/', protect, admin, createBanner);
router.get('/:id', protect, admin, getBannerById);
router.put('/:id', protect, admin, updateBanner);
router.delete('/:id', protect, admin, deleteBanner);
router.put('/:id/toggle', protect, admin, toggleBanner);

module.exports = router;
