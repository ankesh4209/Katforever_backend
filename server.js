const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Config
const connectDB = require('./config/db');

// Middleware
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Routes
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const offerRoutes = require('./routes/offerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const stockRoutes = require('./routes/stockRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const returnRoutes = require('./routes/returnRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const contactRoutes = require('./routes/contactRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Load env
dotenv.config();

// Connect Database
connectDB();

// Initialize app
const app = express();

/* ======================================================
   CORS Configuration
====================================================== */

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://katforever.in',
    'https://www.katforever.in',
    'https://admin.katforever.in',
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error('Not allowed by CORS'),
                false
            );
        },
        credentials: true,
    })
);

/* ======================================================
   Global Middlewares
====================================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logger
app.use(morgan('dev'));

// Static folders
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Rate Limiter
app.use('/api', apiLimiter);

/* ======================================================
   Health Check Route
====================================================== */

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running successfully',
    });
});

/* ======================================================
   API Routes
====================================================== */

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/stock', stockRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/chat', chatRoutes);

/* ======================================================
   Error Handling Middleware
====================================================== */

app.use(notFound);
app.use(errorHandler);

/* ======================================================
   Start Server
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    );
});