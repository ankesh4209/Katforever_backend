
const Banner = require('../models/Banner');

// @desc    Get active banners
// @route   GET /api/banners
// @access  Public
const getBanners = async (req, res) => {
    try {
        const now = new Date();
        const banners = await Banner.find({
            isActive: true,
            startDate: { $lte: now },
            $or: [
                { endDate: { $gte: now } },
                { endDate: null }
            ]
        }).sort({ displayOrder: 1 });

        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all banners (Admin)
// @route   GET /api/admin/banners
// @access  Private/Admin
const getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ displayOrder: 1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single banner
// @route   GET /api/banners/:id
// @access  Private/Admin
const getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        res.json(banner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create banner
// @route   POST /api/banners
// @access  Private/Admin
const createBanner = async (req, res) => {
    try {
        const { title, imageUrl, mobileImageUrl, link, displayOrder, startDate, endDate } = req.body;

        const banner = await Banner.create({
            title,
            imageUrl,
            mobileImageUrl,
            link,
            displayOrder: displayOrder || 0,
            startDate,
            endDate
        });

        res.status(201).json(banner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        banner.title = req.body.title !== undefined ? req.body.title : banner.title;
        banner.imageUrl = req.body.imageUrl || banner.imageUrl;
        banner.mobileImageUrl = req.body.mobileImageUrl !== undefined ? req.body.mobileImageUrl : banner.mobileImageUrl;
        banner.link = req.body.link !== undefined ? req.body.link : banner.link;
        banner.displayOrder = req.body.displayOrder !== undefined ? req.body.displayOrder : banner.displayOrder;
        banner.isActive = req.body.isActive !== undefined ? req.body.isActive : banner.isActive;
        banner.startDate = req.body.startDate || banner.startDate;
        banner.endDate = req.body.endDate !== undefined ? req.body.endDate : banner.endDate;

        const updatedBanner = await banner.save();
        res.json(updatedBanner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
const deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        await banner.deleteOne();
        res.json({ message: 'Banner removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle banner active status
// @route   PUT /api/banners/:id/toggle
// @access  Private/Admin
const toggleBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        banner.isActive = !banner.isActive;
        const updatedBanner = await banner.save();
        res.json(updatedBanner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBanners,
    getAllBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBanner
};
