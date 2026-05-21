const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const resetAdmin = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/katforever');

        console.log('Connected to DB');

        // Delete all existing admins
        const deleteResult = await User.deleteMany({ isAdmin: true });
        console.log('Deleted existing admins. Count:', deleteResult.deletedCount);

        // Create new admin
        const newAdmin = new User({
            name: 'Super Admin',
            email: 'admin@katforever.com',
            password: 'admin123',
            phone: '0000000000',
            isAdmin: true
        });

        await newAdmin.save();
        console.log('✅ New admin created successfully.');
        console.log('Email: admin@katforever.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('Error resetting admin:', error);
        process.exit(1);
    }
};

resetAdmin();
