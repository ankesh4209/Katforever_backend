const express = require('express');
const router = express.Router();
const {
    getOffers,
    getAllOffers,
    getOfferById,
    validateOffer,
    createOffer,
    updateOffer,
    deleteOffer
} = require('../controllers/offerController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getOffers);
router.post('/validate', validateOffer);

// Admin routes
router.get('/admin', protect, admin, getAllOffers);
router.post('/', protect, admin, createOffer);
router.get('/:id', protect, admin, getOfferById);
router.put('/:id', protect, admin, updateOffer);
router.delete('/:id', protect, admin, deleteOffer);

module.exports = router;
