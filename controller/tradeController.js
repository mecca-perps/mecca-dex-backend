const Trade = require("../Model/Trade");
const Pool = require("../Model/Pool");
const User = require("../Model/User");
const { ObjectId } = require("mongodb");
const axios = require("axios");
const cron = require("node-cron");

exports.startTrade = async (req, res) => {
  const { amount, entryPrice, leverage, tradeType } = req.body;
  const startDate = Math.floor(Date.now() / 1000);
  const newTrade = new Trade({
    userId: 1,
    startDate,
    entryPrice,
    amount,
    leverage,
    type: tradeType,
  });

  let pool = await Pool.findOne();
  newBalance = pool.balance - entryPrice * amount * (leverage - 1);
  pool.balance = newBalance;
  await pool.save();

  await newTrade.save();
  const data = {
    trade: newTrade,
    balance: pool.balance,
  };
  res.send({ message: "success", data: data });
};

exports.getTradeHistory = async (req, res) => {
  let trades = await Trade.find();
  let pool = await Pool.findOne();
  const data = {
    trades: trades,
    balance: pool.balance,
  };
  res.send({ message: "success", data: data });
};

exports.quitTrade = async (req, res) => {
  const { endPrice, tradeId } = req.body;
  let updatedTrade = await this.closeTrade(endPrice, tradeId, false);
  let pool = await Pool.findOne();
  const data = {
    trade: updatedTrade,
    balance: pool.balance,
  };
  res.send({ message: "success", data: data });
};

exports.closeTrade = async (endPrice, tradeId, isExpire) => {
  const endDate = Math.floor(Date.now() / 1000);
  let updatedTrade;

  let trade = await Trade.findOne({ _id: tradeId });
  trade.endPrice = endPrice;
  trade.endDate = endDate;
  let poolProfit = 0;

  if (isExpire) {
    trade.isExpire = true;
  }
  if (trade.type === "long") {
    trade.profit =
      (trade.endPrice - trade.entryPrice) * trade.amount * trade.leverage -
      trade.endPrice * trade.amount * trade.leverage * 0.4;
    if (trade.profit > 0) {
      trade.profit *= 0.9;
      poolProfit = trade.profit * 0.1;
    } else {
      trade.profit *= 0.95;
      poolProfit = trade.profit * 0.05;
    }
  }
  if (trade.type === "short") {
    trade.profit =
      (trade.entryPrice - trade.endPrice) * trade.amount * trade.leverage -
      trade.endPrice * trade.amount * trade.leverage * 0.4;
    if (trade.profit > 0) {
      trade.profit *= 0.9;
      poolProfit = trade.profit * 0.1;
    } else {
      trade.profit *= 0.95;
      poolProfit = trade.profit * 0.05;
    }
  }

  let pool = await Pool.findOne();
  newBalance = pool.balance + poolProfit;
  pool.balance =
    newBalance + trade.entryPrice * trade.amount * (trade.leverage - 1);
  await pool.save();

  updatedTrade = await trade.save();

  return updatedTrade;
};

exports.startCron = () => {
  cron.schedule("* * * * *", async () => {
    let ethPrice;
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: "ethereum",
            vs_currencies: "usd",
          },
        }
      );
      ethPrice = response.data.ethereum.usd;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      throw error;
    }
    const limitDate = Date.now() - 604800000;
    const trades = await Trade.find({
      startDate: { $lte: limitDate },
      endDate: { $exists: false },
    });
    trades.map((trade) => {
      this.closeTrade(ethPrice, trade._id, true);
    });
  });
};
