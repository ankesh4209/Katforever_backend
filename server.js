const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const http = require('http'); // ADD THIS
const { Server } = require('socket.io'); // ADD THIS

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
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const whatsappSettingsRoutes = require('./routes/whatsapp/whatsappSettingsRoutes');
const whatsappWebhookRoutes = require("./routes/whatsapp/whatsappWebhookRoutes");
const whatsappChatRoutes = require("./routes/whatsapp/whatsappChatRoutes");
const whatsappBulkRoutes = require("./routes/whatsapp/whatsappBulkRoutes")

// Load env
dotenv.config();

// Connect Database
connectDB().then(() => {
    const { runDatabaseMigration } = require('./utils/dbMigration');
    runDatabaseMigration();
});

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

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
};

app.use(cors(corsOptions));

/* ======================================================
   Global Middlewares
====================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
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
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// WA Routes
app.use('/api/wa/settings', whatsappSettingsRoutes);
app.use('/api/wa/webhook', whatsappWebhookRoutes);
app.use('/api/wa/chat', whatsappChatRoutes);
app.use('/api/wa/bulk', whatsappBulkRoutes);


/* ======================================================
   Error Handling Middleware
====================================================== */
app.use(notFound);
app.use(errorHandler);

/* ======================================================
   Start Server WITH WebSockets
====================================================== */
const PORT = process.env.PORT || 3000;

// Create HTTP Server wrapped around Express
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT"]
    }
});

// Expose 'io' to controllers (accessible via req.app.get('io'))
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Socket.io client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Socket.io client disconnected:', socket.id);
    });
});

// START SERVER (Use server.listen, not app.listen)
server.listen(PORT, () => {
    console.log(`🚀 Server & WebSockets running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});