const Contact = require('../models/Contact');

// @desc    Submit a contact message
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Please provide name, email, and message' });
        }

        const contact = await Contact.create({
            name,
            email,
            message
        });

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon!',
            data: contact
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private/Admin
const getContactSubmissions = async (req, res) => {
    try {
        const contacts = await Contact.find({}).sort('-createdAt');
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitContactForm,
    getContactSubmissions
};
