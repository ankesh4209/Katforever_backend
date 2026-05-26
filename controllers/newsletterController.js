const Newsletter = require("../models/Newsletter");
const nodemailer = require("nodemailer");

const sendWelcomeEmail = async (email) => {
  const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

  await transporter.sendMail({
    from: `"Katforever" <${
      process.env.EMAIL_FROM || process.env.SMTP_USER
    }>`,
    to: email,
    subject: "Welcome to Katforever - Wear Your Vibe",
    html: `
      <div style="font-family: Arial, sans-serif; background:#faf7f3; padding:30px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; padding:30px; border-radius:12px;">
          <h2 style="color:#93652c; margin-bottom:10px;">Welcome to Katforever</h2>
          <p style="color:#555; font-size:15px; line-height:1.7;">
            Thank you for subscribing to our newsletter.
          </p>
          <h3 style="color:#2A1416; font-size:26px; font-style:italic;">
            Wear Your Vibe
          </h3>
          <p style="color:#555; font-size:15px; line-height:1.7;">
            Be the first to access our new collections, seasonal sales, and exclusive offers.
          </p>
          <div style="margin-top:25px; padding:15px; background:#f8f0e7; color:#93652c; text-align:center; font-weight:bold;">
            Unlock 10% OFF on your first purchase
          </div>
        </div>
      </div>
    `,
  });
};

const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
    }

    const existingSubscriber = await Newsletter.findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.status === "unsubscribed") {
        existingSubscriber.status = "subscribed";
        await existingSubscriber.save();

        await sendWelcomeEmail(email);

        return res.status(200).json({
          success: true,
          message: "Welcome back! You have been re-subscribed.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "This email is already subscribed to our newsletter.",
      });
    }

    const subscriber = await Newsletter.create({ email });

    await sendWelcomeEmail(email);

    res.status(201).json({
      success: true,
      message:
        "Thank you for subscribing to our newsletter! Unlock 10% OFF on your first purchase.",
      data: subscriber,
    });
  } catch (error) {
    console.error("Newsletter Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Newsletter subscription failed",
    });
  }
};

const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find({}).sort("-createdAt");
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  subscribeNewsletter,
  getSubscribers,
};
