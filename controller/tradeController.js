const Trade = require("../Model/Trade");
const Pool = require("../Model/Pool");
const User = require("../Model/User");
const { ObjectId } = require("mongodb");
const cron = require("node-cron");

exports.startTrade = (req, res) => {
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

  Pool.findOne().then((pool) => {
    newBalance = pool.balance - entryPrice * amount * (leverage - 1);
    pool.balance = newBalance;
    pool.save();
  });

  newTrade
    .save()
    .then((trade) => {
      Pool.findOne().then((pool) => {
        console.log(pool.balance);
        const data = {
          trade: trade,
          balance: pool.balance,
        };
        res.send({ message: "success", data: data });
      });
    })
    .catch((err) => console.log(err));
};

exports.getTradeHistory = (req, res) => {
  Trade.find().then((trades) => {
    Pool.findOne().then((pool) => {
      const data = {
        trades: trades,
        balance: pool.balance,
      };
      res.send({ message: "success", data: data });
    });
  });
};

exports.quitTrade = (req, res) => {
  const { endPrice, tradeId } = req.body;
  const endDate = Math.floor(Date.now() / 1000);

  Trade.findOne({ _id: tradeId }).then((trade) => {
    trade.endPrice = endPrice;
    trade.endDate = endDate;
    let poolProfit = 0;

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

    Pool.findOne().then((pool) => {
      newBalance = pool.balance + poolProfit;
      console.log(poolProfit);
      pool.balance =
        newBalance + trade.entryPrice * trade.amount * (trade.leverage - 1);
      pool.save();
    });

    trade
      .save()
      .then((trade) => {
        Pool.findOne().then((pool) => {
          const data = {
            trade: trade,
            balance: pool.balance,
          };
          res.send({ message: "success", data: data });
        });
      })
      .catch((err) => console.log(err));
  });
};

exports.startCron = () => {
  cron.schedule("* * * * *", () => {
    console.log("running a task every minute");
  });
};
