
const Product = require('../models/Product');

// @desc    Get low stock products
// @route   GET /api/admin/stock/low?threshold=10
// @access  Private/Admin
const getLowStockProducts = async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;

        const lowStockProducts = await Product.find({
            stock: { $lte: threshold }
        }).sort({ stock: 1 });

        res.json({
            threshold,
            count: lowStockProducts.length,
            products: lowStockProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update product stock
// @route   PUT /api/admin/stock/:id
// @access  Private/Admin
const updateStock = async (req, res) => {
    try {
        const { stock } = req.body;

        if (stock === undefined || stock < 0) {
            return res.status(400).json({
                message: 'Stock must be a positive number'
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.stock = stock;
        product.inStock = stock > 0;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk update stock
// @route   POST /api/admin/stock/bulk
// @access  Private/Admin
const bulkUpdateStock = async (req, res) => {
    try {
        const { updates } = req.body; // [{ productId, stock }, ...]

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({
                message: 'Updates array is required'
            });
        }

        const results = [];

        for (const update of updates) {
            const product = await Product.findById(update.productId);
            if (product) {
                product.stock = update.stock;
                product.inStock = update.stock > 0;
                await product.save();
                results.push({
                    productId: update.productId,
                    success: true
                });
            } else {
                results.push({
                    productId: update.productId,
                    success: false,
                    message: 'Product not found'
                });
            }
        }

        res.json({
            message: 'Bulk update completed',
            results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLowStockProducts,
    updateStock,
    bulkUpdateStock
};
