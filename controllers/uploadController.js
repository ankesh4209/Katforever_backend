
const { cloudinary } = require('../config/cloudinary');

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private/Admin
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.json({
            message: 'Image uploaded successfully',
            imageUrl: req.file.path,
            publicId: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private/Admin
const uploadMultipleImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const imageUrls = req.files.map(file => ({
            url: file.path,
            publicId: file.filename
        }));

        res.json({
            message: 'Images uploaded successfully',
            images: imageUrls
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image/:publicId
// @access  Private/Admin
const deleteImage = async (req, res) => {
    try {
        const { publicId } = req.params;

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            res.json({ message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    uploadImage,
    uploadMultipleImages,
    deleteImage
};
