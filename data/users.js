
const bcrypt = require('bcryptjs');

const users = [
    {
        name: 'Admin User',
        email: 'admin@katforever.com',
        password: 'password123', // Will be hashed by model pre-save hook? Wait, insertMany might bypass pre-save if not careful. Seeder usually needs manual hash or user.create.
        // Actually, Model.insertMany DOES NOT trigger pre('save') hooks. 
        // So we must manually hash here or loop and save. For simplicity in seeder with insertMany, I will provide hashed password or handle it. 
        // Let's use a helper constant for a hashed '123456'.
        isAdmin: true,
    },
    {
        name: 'Ayodhya Gupta',
        email: 'ayodhya@katforever.com',
        password: '123456',
        isAdmin: false,
    },
];

// Let's fix the hashing issue in seeder.js or here. 
// For now, I will use raw strings and update seeder.js to loop and save, OR just pre-hash them here.
// Hash for '123456' is $2a$10$d/2JulV.gI.k.F.R.w.e.u.x.y.z (example). 
// Better approach: Update seeder.js to use `User.create` (which triggers hooks) or iterate. 
// Actually, `User.create(users)` works triggers hooks? Yes if passed an array it calls save? No, create([..]) is like insertMany internally often but Mongoose docs say create() fires save() hooks.
// Let's rely on seeder loop.

module.exports = users;
