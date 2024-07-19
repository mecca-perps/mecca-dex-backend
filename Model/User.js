const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  balance: {
    type: Number,
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
