const Newsletter = require('../models/Newsletter');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        // Check if already subscribed
        const existingSubscriber = await Newsletter.findOne({ email });

        if (existingSubscriber) {
            if (existingSubscriber.status === 'unsubscribed') {
                // Re-subscribe them
                existingSubscriber.status = 'subscribed';
                await existingSubscriber.save();
                return res.status(200).json({ success: true, message: 'Welcome back! You have been re-subscribed.' });
            }
            return res.status(400).json({ message: 'This email is already subscribed to our newsletter.' });
        }

        const subscriber = await Newsletter.create({ email });

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing to our newsletter! Unlock 10% OFF on your first purchase.',
            data: subscriber
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all newsletter subscribers
// @route   GET /api/newsletter
// @access  Private/Admin
const getSubscribers = async (req, res) => {
    try {
        const subscribers = await Newsletter.find({}).sort('-createdAt');
        res.json(subscribers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    subscribeNewsletter,
    getSubscribers
};
