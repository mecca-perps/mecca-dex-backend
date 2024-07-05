const mongoose = require("mongoose");

const PoolSchema = new mongoose.Schema({
  balance: {
    type: Number,
  },
});

const Pool = mongoose.model("Pool", PoolSchema);

module.exports = Pool;
