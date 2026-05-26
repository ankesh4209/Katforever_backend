const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'KatForever'
    },

    storeDescription: {
      type: String,
      default: ''
    },

    contactNumber: {
      type: String,
      default: ''
    },

    email: {
      type: String,
      default: ''
    },

    notifications: {
      type: Boolean,
      default: true
    },

    emailUpdates: {
      type: Boolean,
      default: false
    },

    twoFactorAuth: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'Settings',
  settingsSchema
);