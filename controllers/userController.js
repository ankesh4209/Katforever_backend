
const axios = require('axios');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const dotenv = require('dotenv');


dotenv.config();


const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'kat_user_authentication';

const normalizeWhatsAppPhone = (phone) => {
    if (!phone) return '';
    const cleaned = String(phone).replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
        return `91${cleaned}`;
    }
    return cleaned;
};

const sendWhatsAppOTP = async (phone, otp) => {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        throw new Error('WhatsApp access token or phone number ID is not configured');
    }

    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!normalizedPhone) {
        throw new Error('Invalid phone number for WhatsApp');
    }

    const to = normalizedPhone;
    const url = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    console.log('Sending WhatsApp OTP to', phone, 'normalized to', to);

    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: WHATSAPP_TEMPLATE_NAME,
            language: {
                code: 'en_US'
            },
            components: [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: otp.toString()
                        }
                    ]
                },
                {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [
                        {
                            type: 'text',
                            text: 'Verify'
                        }
                    ]
                }
            ]
        }
    };

    const response = await axios.post(url, payload, {
        headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    console.log('WHATSAPP_SEND_RESPONSE', response.data);

};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Set HTTP-only cookie
            res.cookie('jwt', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin ,
                token: token,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, isAdmin } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = await User.create({
            name,
            email,
            password,
            isAdmin: isAdmin || false, // Support admin creation
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                addresses: user.addresses // Include addresses
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add new address
// @route   POST /api/users/address
// @access  Private
const addUserAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, phone, type, street, city, state, pincode, country, isDefault } = req.body;

        // If this is set as default, unset others
        if (isDefault) {
            user.addresses.forEach(addr => { addr.isDefault = false; });
        }

        // If first address, make it default
        const makeDefault = user.addresses.length === 0 ? true : (isDefault || false);

        user.addresses.push({
            name, phone, type: type || 'Home',
            street, city, state, pincode,
            country: country || 'India',
            isDefault: makeDefault
        });

        await user.save();
        res.status(201).json(user.addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all user addresses
// @route   GET /api/users/addresses
// @access  Private
const getUserAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update address
// @route   PUT /api/users/address/:addressId
// @access  Private
const updateUserAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        const { name, phone, type, street, city, state, pincode, country, isDefault } = req.body;

        // If setting as default, unset others
        if (isDefault) {
            user.addresses.forEach(addr => { addr.isDefault = false; });
        }

        if (name) address.name = name;
        if (phone) address.phone = phone;
        if (type) address.type = type;
        if (street) address.street = street;
        if (city) address.city = city;
        if (state) address.state = state;
        if (pincode) address.pincode = pincode;
        if (country) address.country = country;
        if (isDefault !== undefined) address.isDefault = isDefault;

        await user.save();
        res.json(user.addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete address
// @route   DELETE /api/users/address/:addressId
// @access  Private
const deleteUserAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        user.addresses.pull(req.params.addressId);
        await user.save();
        res.json(user.addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP to phone
// @route   POST /api/users/send-otp
// @access  Public
const sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        let user = await User.findOne({ phone });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (user) {
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            // Auto-register if user doesn't exist
            user = await User.create({
                name: `User ${phone.slice(-4)}`,
                phone,
                otp,
                otpExpires,
            });
        }

        console.log('Prepared OTP for', phone, 'OTP:', otp);

        try {
            await sendWhatsAppOTP(phone, otp);
            console.log(`📱 WhatsApp OTP ${otp} sent to ${phone}`);
        } catch (whatsappError) {
            console.error('WHATSAPP_SEND_ERROR:', whatsappError.message || whatsappError);
            return res.status(500).json({
                success: false,
                message: 'Unable to send OTP via WhatsApp',
                error: whatsappError.message || whatsappError
            });
        }

        res.json({
            success: true,
            message: 'OTP sent successfully',
            phone,
            isNewUser: user.name.startsWith('User ')
        });
    } catch (error) {
        console.error('SEND_OTP_ERROR:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify OTP and login
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
        }

        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if OTP matches and is not expired
        if (user.otp === otp && user.otpExpires > Date.now()) {
            const isNewUser = user.name.startsWith('User ');

            user.otp = undefined;
            await user.save();
            const token = generateToken(user._id);

            // Set HTTP-only cookie
            res.cookie('jwt', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development', // Use secure in production
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            res.json({
                success: true,
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,

                // ...(user.isAdmin && { isAdmin: true }),

                token: token, // Still return token for potential frontend use, but cookie is primary
                isNewUser
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        console.error('VERIFY_OTP_ERROR:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Forgot Password (Mock)
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'OTP sent to your phone for password reset' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        await user.deleteOne();

        res.status(200).json({
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    addUserAddress,
    getUserAddresses,
    updateUserAddress,
    deleteUserAddress,
    sendOTP,
    verifyOTP,
    forgotPassword,
    logoutUser,
    getUsers,
    deleteUser
};
