const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

const port = 5000;

const { startTrade } = require("./controller/tradeController");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors());

require("dotenv").config();

app.post("/startTrade", startTrade);

app.listen(port, () => {
  console.log(`server listening at port: ${port} `);
});