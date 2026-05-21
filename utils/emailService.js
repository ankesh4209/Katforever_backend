const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Send order confirmation email
const sendOrderConfirmation = async (order, userEmail) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.log('Email credentials not configured. Skipping email.');
            return false;
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Order Confirmation - #${order._id}`,
            html: `
                <h1>Order Confirmed!</h1>
                <p>Thank you for your order.</p>
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Total:</strong> ₹${order.totalPrice}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Status:</strong> ${order.orderStatus}</p>
                <p>Thank you for shopping with katforever!</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent to:', userEmail);
        return true;
    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
};

// Send order status update email
const sendOrderStatusUpdate = async (order, userEmail) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            return false;
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Order Update - #${order._id}`,
            html: `
                <h1>Order Status Updated</h1>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>New Status:</strong> ${order.orderStatus}</p>
                <p>Thank you for shopping with katforever!</p>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
};

module.exports = {
    sendOrderConfirmation,
    sendOrderStatusUpdate
};
