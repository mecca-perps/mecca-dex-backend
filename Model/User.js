const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  address: {
    type: String,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
