
const mongoose = require('mongoose');

const bannerSchema = mongoose.Schema({
    title: {
        type: String,
        required: false
    },
    imageUrl: {
        type: String,
        required: true
    },
    mobileImageUrl: {
        type: String,
        required: false
    },
    link: {
        type: String,
        default: ''
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
