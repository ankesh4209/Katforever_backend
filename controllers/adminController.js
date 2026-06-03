const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        // Total orders
        const totalOrders = await Order.countDocuments();

        // Orders by status
        const ordersByStatus = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);

        // Total revenue
        const revenueData = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);

        // Recent orders
        const recentOrders = await Order.find({})
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        // Total users
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();

        // New Users this month
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        // Low stock products
        const outOfStockProducts = await Product.countDocuments({ stock: { $lte: 0 } });
        const lowStockProducts = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } });

        // Top Products by Revenue
        const topProducts = await Object.values(mongoose.connection.models).find(m => m.modelName === 'Order').aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: '$orderItems.product',
                    name: { $first: '$orderItems.name' },
                    sales: { $sum: '$orderItems.qty' },
                    revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 4 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    sales: 1,
                    revenue: 1,
                    rating: { $ifNull: ['$productDetails.rating', 0] },
                    trend: { $literal: 'up' }
                }
            }
        ]);

        res.json({
            totalOrders,
            ordersByStatus,
            totalRevenue: revenueData[0]?.total || 0,
            recentOrders,
            totalUsers,
            newUsers,
            totalProducts,
            outOfStockProducts,
            lowStockProducts,
            topProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all orders
// @route   GET /api/admin/orders?page=1&limit=20
// @access  Private/Admin
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const orders = await Order.find({})
            .populate('user', 'name email')
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalOrders = await Order.countDocuments();

        res.json({
            orders,
            page: pageNum,
            pages: Math.ceil(totalOrders / limitNum),
            total: totalOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get order statistics
// @route   GET /api/admin/orders/stats
// @access  Private/Admin
const getOrderStats = async (req, res) => {
    try {
        // Orders by status
        const byStatus = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 }, total: { $sum: '$totalPrice' } } }
        ]);

        // Orders by payment method
        const byPaymentMethod = await Order.aggregate([
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalPrice' } } }
        ]);

        // Daily orders (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyOrders = await Order.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            byStatus,
            byPaymentMethod,
            dailyOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find({})
            .populate('orderId')
            .sort({ createdAt: -1 });

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payment statistics
// @route   GET /api/admin/payments/stats
// @access  Private/Admin
const getPaymentStats = async (req, res) => {
    try {
        // Payments by status
        const byStatus = await Payment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }
        ]);

        // Total paid amount
        const totalPaid = await Payment.aggregate([
            { $match: { status: 'Paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            byStatus,
            totalPaid: totalPaid[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle user admin status
// @route   PUT /api/admin/users/:id/toggle
// @access  Private/Admin
const toggleUserAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isAdmin = !user.isAdmin;
        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne();
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getAllOrders,
    getOrderStats,
    getAllPayments,
    getPaymentStats,
    getAllUsers,
    toggleUserAdmin,
    deleteUser
};
