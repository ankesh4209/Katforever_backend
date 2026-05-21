
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const morgon = require('morgan');

dotenv.config();

connectDB();

const app = express();

// CORS configuration
const allowedOrigins = [
    'http://localhost:3001', 
    "https://katforever.in",
    "https://www.katforever.in",
    'http://localhost:5173',
    'https://admin.katforever.in'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use(morgon('dev'))

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Serve static uploads folder
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

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
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ...

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

// Error Handling (must be after routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
