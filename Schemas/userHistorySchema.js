const mongoose = require('mongoose');
const userHistorySchema = new mongoose.Schema({
  userId: Number,
  symbol: String,
  action: String, // 'buy' or 'sell'
  price: Number,
  quantity: Number,
  total: Number,
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('UserHistory', userHistorySchema);
