const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Fetch all products with search, filter, sort, and pagination
// @route   GET /api/products?search=shirt&category=1&minPrice=500&maxPrice=2000&sort=price&page=1&limit=20
// @access  Public
const getProducts = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, sort, page = 1, limit = 20, active } = req.query;

        // Build query object for base search (excluding price filter)
        let baseQuery = {};

        // Search by name (case-insensitive)
        if (search) {
            baseQuery.name = { $regex: search, $options: 'i' };
        }

        // Filter by category (supports both ObjectId and category name)
        if (category) {
            if (mongoose.Types.ObjectId.isValid(category)) {
                baseQuery.categoryId = new mongoose.Types.ObjectId(category);
            } else {
                // Lookup category by name
                const categoryDoc = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
                if (categoryDoc) {
                    baseQuery.categoryId = categoryDoc._id;
                } else {
                    baseQuery.categoryId = category; // fallback
                }
            }
        }

        // Filter by active status
        if (active !== undefined && active !== '') {
            baseQuery.isActive = active === 'true';
        }

        // Apply price filter to the main query
        let query = { ...baseQuery };



        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Fetch dynamic min and max price for the current category/search (before price filtering)
        const priceStats = await Product.aggregate([
            { $match: baseQuery },
            { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
        ]);

        const minPriceAvailable = priceStats.length > 0 ? priceStats[0].minPrice : 0;
        const maxPriceAvailable = priceStats.length > 0 ? priceStats[0].maxPrice : 0;

        // Execute query with optional sorting
        let productsQuery = Product.find(query);

        // Sort options
        if (sort) {
            const sortOptions = {
                'price': { price: 1 },
                'price-asc': { price: 1 },
                '-price': { price: -1 },
                'price-desc': { price: -1 },
                'name': { name: 1 },
                '-name': { name: -1 },
                'rating': { rating: -1 },
                'best-selling': { rating: -1 },
                'newest': { createdAt: -1 }
            };
            productsQuery = productsQuery.sort(sortOptions[sort] || { createdAt: -1 });
        } else {
            productsQuery = productsQuery.sort({ createdAt: -1 });
        }

        // Apply pagination
        const products = await productsQuery.skip(skip).limit(limitNum);

        // Get total count for metadata
        const totalProducts = await Product.countDocuments(query);

        res.json({
            products,
            page: pageNum,
            pages: Math.ceil(totalProducts / limitNum),
            total: totalProducts,
            limit: limitNum,
            minPriceAvailable,
            maxPriceAvailable
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Fetch top trending products
// @route   GET /api/products/trending
// @access  Public
const getTrendingProducts = async (req, res) => {
    try {
        const products = await Product.find({ isTrending: true })
            .sort({ createdAt: -1 })
            .limit(8); // Limit to top 8 trending products

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Fetch related/similar products by same category
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const related = await Product.find({
            _id: { $ne: product._id },
            categoryId: product.categoryId,
            isActive: true
        })
            .sort({ rating: -1, createdAt: -1 })
            .limit(8);

        // If not enough from same category, fill with trending products
        if (related.length < 4) {
            const extraIds = [product._id, ...related.map(p => p._id)];
            const extra = await Product.find({
                _id: { $nin: extraIds },
                isActive: true
            })
                .sort({ isTrending: -1, rating: -1 })
                .limit(8 - related.length);
            related.push(...extra);
        }

        res.json(related);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne(); // Use deleteOne()
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const {
            sku,
            name,
            price,
            images,
            categoryId,
            description,
            additionalSections,
            availableSizes,
            availableColors,
            mrp,
            discount
        } = req.body;

        // Validate required fields
        if (!sku || !name || !price || !categoryId || !description) {
            return res.status(400).json({
                message: 'Please provide sku, name, price, category, and description'
            });
        }

        // Validate SKU uniqueness
        const skuExists = await Product.findOne({ sku });
        if (skuExists) {
            return res.status(400).json({
                message: 'A product with this SKU already exists.'
            });
        }

        // Validate category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                message: 'Category not found. Please select a valid category.'
            });
        }

        // Validate price
        if (price < 0) {
            return res.status(400).json({
                message: 'Price must be a positive number'
            });
        }

        const product = new Product({
            sku,
            name,
            price,
            user: req.user._id,
            images: images || [],
            categoryId,
            categoryName: category.name, // Auto-set from DB
            description,
            additionalSections: additionalSections ? (typeof additionalSections === 'string' ? JSON.parse(additionalSections) : additionalSections) : [],
            availableSizes: availableSizes ? (typeof availableSizes === 'string' ? JSON.parse(availableSizes) : availableSizes) : [],
            availableColors: availableColors ? (typeof availableColors === 'string' ? JSON.parse(availableColors) : availableColors) : [],
            mrp: mrp ? parseFloat(mrp) : 0,
            discount: discount || 0,
            stock: req.body.stock || 0,
            inStock: req.body.stock > 0,
            isTrending: req.body.isTrending || false,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            isCODAvailable: req.body.isCODAvailable !== undefined ? req.body.isCODAvailable : true,
            reviewCount: 12,
            rating: 4.5
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors
            });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const { sku, categoryId, price } = req.body;

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate SKU uniqueness if being updated
        if (sku && sku !== product.sku) {
            const skuExists = await Product.findOne({ sku });
            if (skuExists) {
                return res.status(400).json({
                    message: 'A product with this SKU already exists.'
                });
            }
        }

        // Validate category if being updated
        if (categoryId && categoryId !== product.categoryId.toString()) {
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({
                    message: 'Category not found. Please select a valid category.'
                });
            }
            product.categoryId = categoryId;
            product.categoryName = category.name; // Auto-update category name
        }

        // Validate price if being updated
        if (price !== undefined && price < 0) {
            return res.status(400).json({
                message: 'Price must be a positive number'
            });
        }

        // Update fields
        product.sku = sku || product.sku;
        product.name = req.body.name || product.name;
        product.price = req.body.price !== undefined ? req.body.price : product.price;
        product.mrp = req.body.mrp !== undefined ? req.body.mrp : product.mrp;
        product.description = req.body.description || product.description;

        if (req.body.additionalSections) {
            product.additionalSections = typeof req.body.additionalSections === 'string'
                ? JSON.parse(req.body.additionalSections)
                : req.body.additionalSections;
        }

        product.images = req.body.images || product.images;

        if (req.body.availableSizes) {
            product.availableSizes = typeof req.body.availableSizes === 'string'
                ? JSON.parse(req.body.availableSizes)
                : req.body.availableSizes;
        }

        if (req.body.availableColors) {
            product.availableColors = typeof req.body.availableColors === 'string'
                ? JSON.parse(req.body.availableColors)
                : req.body.availableColors;
        }

        product.discount = req.body.discount !== undefined ? req.body.discount : product.discount;
        product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
        product.inStock = product.stock > 0;
        product.isTrending = req.body.isTrending !== undefined ? req.body.isTrending : product.isTrending;
        product.isActive = req.body.isActive !== undefined ? req.body.isActive : product.isActive;
        product.isCODAvailable = req.body.isCODAvailable !== undefined ? req.body.isCODAvailable : product.isCODAvailable;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create product review
// @route   POST /api/products/:id/reviews
// @access  Private
const createReview = async (req, res) => {
    const { rating, comment } = req.body;
    const Review = require('../models/Review');

    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user already reviewed
        const alreadyReviewed = await Review.findOne({
            product: req.params.id,
            user: req.user._id
        });

        if (alreadyReviewed) {
            return res.status(400).json({ message: 'Product already reviewed' });
        }

        const review = new Review({
            product: req.params.id,
            user: req.user._id,
            name: req.user.name,
            rating: Number(rating),
            comment
        });

        await review.save();

        // Update product rating
        const reviews = await Review.find({ product: req.params.id });
        product.reviewCount = reviews.length;
        product.rating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
        await product.save();

        res.status(201).json({ message: 'Review added' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get product reviews
// @route   GET /api/products/:id/reviews
// @access  Public
const getReviews = async (req, res) => {
    try {
        const Review = require('../models/Review');
        const reviews = await Review.find({ product: req.params.id })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete review
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private/Admin
const deleteReview = async (req, res) => {
    try {
        const Review = require('../models/Review');
        const review = await Review.findById(req.params.reviewId);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        await review.deleteOne();

        // Update product rating
        const product = await Product.findById(req.params.id);
        const reviews = await Review.find({ product: req.params.id });
        product.reviewCount = reviews.length;
        product.rating = reviews.length > 0
            ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
            : 0;
        await product.save();

        res.json({ message: 'Review removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
};
