
const Offer = require('../models/Offer');

// @desc    Get active offers
// @route   GET /api/offers
// @access  Public
const getOffers = async (req, res) => {
    try {
        const now = new Date();
        const offers = await Offer.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all offers (Admin)
// @route   GET /api/admin/offers
// @access  Private/Admin
const getAllOffers = async (req, res) => {
    try {
        const offers = await Offer.find({}).sort({ createdAt: -1 });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single offer
// @route   GET /api/offers/:id
// @access  Private/Admin
const getOfferById = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        res.json(offer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate coupon code
// @route   POST /api/offers/validate
// @access  Public
const validateOffer = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        const offer = await Offer.findOne({ code: code.toUpperCase() });

        if (!offer) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        // Check if active
        if (!offer.isActive) {
            return res.status(400).json({ message: 'Coupon is not active' });
        }

        // Check dates
        const now = new Date();
        if (now < offer.startDate || now > offer.endDate) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        // Check usage limit
        if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        // Check minimum order amount
        if (orderAmount < offer.minOrderAmount) {
            return res.status(400).json({
                message: `Minimum order amount of ₹${offer.minOrderAmount} required`
            });
        }

        // Calculate discount
        let discount = 0;
        if (offer.discountType === 'percentage') {
            discount = (orderAmount * offer.discountValue) / 100;
            if (offer.maxDiscount && discount > offer.maxDiscount) {
                discount = offer.maxDiscount;
            }
        } else {
            discount = offer.discountValue;
        }

        res.json({
            valid: true,
            offer: {
                code: offer.code,
                title: offer.title,
                discountType: offer.discountType,
                discountValue: offer.discountValue
            },
            discount: Math.round(discount)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create offer
// @route   POST /api/offers
// @access  Private/Admin
const createOffer = async (req, res) => {
    try {
        const { title, code, discountType, discountValue, minOrderAmount, maxDiscount, endDate, usageLimit } = req.body;

        const offerExists = await Offer.findOne({ code: code.toUpperCase() });
        if (offerExists) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const offer = await Offer.create({
            title,
            code: code.toUpperCase(),
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            endDate,
            usageLimit
        });

        res.status(201).json(offer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update offer
// @route   PUT /api/offers/:id
// @access  Private/Admin
const updateOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        offer.title = req.body.title || offer.title;
        offer.discountType = req.body.discountType || offer.discountType;
        offer.discountValue = req.body.discountValue !== undefined ? req.body.discountValue : offer.discountValue;
        offer.minOrderAmount = req.body.minOrderAmount !== undefined ? req.body.minOrderAmount : offer.minOrderAmount;
        offer.maxDiscount = req.body.maxDiscount !== undefined ? req.body.maxDiscount : offer.maxDiscount;
        offer.endDate = req.body.endDate || offer.endDate;
        offer.usageLimit = req.body.usageLimit !== undefined ? req.body.usageLimit : offer.usageLimit;
        offer.isActive = req.body.isActive !== undefined ? req.body.isActive : offer.isActive;

        const updatedOffer = await offer.save();
        res.json(updatedOffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete offer
// @route   DELETE /api/offers/:id
// @access  Private/Admin
const deleteOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        await offer.deleteOne();
        res.json({ message: 'Offer removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOffers,
    getAllOffers,
    getOfferById,
    validateOffer,
    createOffer,
    updateOffer,
    deleteOffer
};
