const asyncHandler = require('express-async-handler');

const Order = require('../models/Order');
const User = require('../models/User');

const getDashboardReports = asyncHandler(async (req, res) => {
  // =========================
  // TOTAL REVENUE
  // =========================

  const orders = await Order.find({});

  const users = await User.find({});

  const totalRevenue = orders.reduce(
    (acc, item) => acc + item.totalPrice,
    0
  );

  // =========================
  // AREA WISE ORDERS
  // =========================

  const areaMap = {};

  orders.forEach((order) => {
    const area =
      order?.shippingAddress?.city ||
      order?.shippingAddress?.area ||
      'Unknown';

    areaMap[area] = (areaMap[area] || 0) + 1;
  });

  const areaWiseOrders = Object.entries(areaMap)
    .map(([area, count]) => ({
      area,
      count
    }))
    .sort((a, b) => b.count - a.count);

  // =========================
  // MONTHLY SALES
  // =========================

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  const monthlySalesMap = {};

  months.forEach((month) => {
    monthlySalesMap[month] = 0;
  });

  orders.forEach((order) => {
    const date = new Date(order.createdAt);

    const month = months[date.getMonth()];

    monthlySalesMap[month] += order.totalPrice || 0;
  });

  const monthlySales = months.map((month) => ({
    month,
    amount: monthlySalesMap[month]
  }));

  // =========================
  // RESPONSE
  // =========================

  res.json({
    totalRevenue,
    totalOrders: orders.length,
    totalUsers: users.length,

    areaWiseOrders,

    monthlySales
  });
});

module.exports = {
  getDashboardReports
};