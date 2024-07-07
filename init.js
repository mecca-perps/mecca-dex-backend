const mongoose = require("mongoose");
require("dotenv").config();
const Pool = require("./Model/Pool");

const MongoURI = process.env.MONGOURI;

mongoose
.connect(MongoURI)
.then(() => console.log("MongoDB connected..."))
.catch((err) => console.log(err));

const pool = new Pool({
  balance: 1000000,
});

pool.save().then((pool) => {
  console.log("created pool", pool);
});
