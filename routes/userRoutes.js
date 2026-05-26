const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/userController');

const {
    protect,
    admin
} = require('../middleware/authMiddleware');

router.post('/', registerUser);
router.post('/login', authUser);
router.post('/logout', logoutUser);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);


router.route('/addresses')
    .get(protect, getUserAddresses);

router.route('/address')
    .post(protect, addUserAddress);

router.route('/address/:addressId')
    .put(protect, updateUserAddress)
    .delete(protect, deleteUserAddress);

// =====================================
// ADMIN ROUTES
// =====================================

router.get('/', protect, admin, getUsers);

router.delete('/:id', protect, admin, deleteUser);

module.exports = router;