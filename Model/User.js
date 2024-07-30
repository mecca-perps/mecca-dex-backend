const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  balance: {
    type: Number,
  },
  eth: {
    type: Number,
    default: 0,
  },
  profit: {
    type: Number,
    default: 0,
  },
  walletAddress: {
    type: String,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
