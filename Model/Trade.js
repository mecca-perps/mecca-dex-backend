const mongoose = require("mongoose");

const TradeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
  },
  endDate: {
    type: String,
  },
  entryPrice: {
    type: Number,
  },
  endPrice: {
    type: Number,
  },
  amount: {
    type: Number,
  },
  leverage: {
    type: Number,
  },
  type: {
    type: String,
  },
  profit: {
    type: Number,
  },
  isExpire: {
    type: Boolean
  }
});

const Trade = mongoose.model("Trade", TradeSchema);

module.exports = Trade;
