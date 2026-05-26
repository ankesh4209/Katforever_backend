const asyncHandler = require('express-async-handler');
const Settings = require('../models/Settings');

// @desc    Get settings
// @route   GET /api/settings
// @access  Private
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({
      storeName: 'KatForever',
      storeDescription: '',
      contactNumber: '',
      email: '',
      notifications: true,
      emailUpdates: false,
      twoFactorAuth: true
    });
  }

  res.json(settings);
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings();
  }

  settings.storeName =
    req.body.storeName || settings.storeName;

  settings.storeDescription =
    req.body.storeDescription || settings.storeDescription;

  settings.contactNumber =
    req.body.contactNumber || settings.contactNumber;

  settings.email =
    req.body.email || settings.email;

  settings.notifications =
    req.body.notifications;

  settings.emailUpdates =
    req.body.emailUpdates;

  settings.twoFactorAuth =
    req.body.twoFactorAuth;

  const updated = await settings.save();

  res.json(updated);
});

module.exports = {
  getSettings,
  updateSettings
};