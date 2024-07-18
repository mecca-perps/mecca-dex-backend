const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  balance: {
    type: Number,
  },
  walletAddress: {
    type: String,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
