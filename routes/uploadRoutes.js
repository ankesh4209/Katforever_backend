
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, admin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.json({
            message: 'Image uploaded successfully',
            imageUrl: `/${req.file.path}`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private/Admin
router.post('/multiple', protect, admin, upload.array('images', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const imageUrls = req.files.map(file => `/${file.path}`);

        res.json({
            message: `${req.files.length} images uploaded successfully`,
            imageUrls
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
