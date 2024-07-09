const Trade = require("../Model/Trade");
const Pool = require("../Model/Pool");
const { ObjectId } = require("mongodb");
const axios = require("axios");
const cron = require("node-cron");
const { ethers } = require("ethers");

exports.startTrade = async (req, res) => {
  const { amount, leverage, tradeType, walletAddress } = req.body;
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price",
    {
      params: {
        ids: "ethereum",
        vs_currencies: "usd",
      },
    }
  );
  entryPrice = response.data.ethereum.usd;
  const collateral = entryPrice * amount;
  const startDate = Math.floor(Date.now() / 1000);
  const newTrade = new Trade({
    userId: walletAddress,
    startDate,
    entryPrice,
    amount,
    leverage,
    type: tradeType,
  });

  let pool = await Pool.findOne();
  pool.balance =
    pool.balance - entryPrice * amount * (leverage - 1) + collateral;
  await pool.save();

  await newTrade.save();
  const data = {
    trade: newTrade,
    balance: pool.balance,
  };
  res.send({ message: "success", data: data });
};

exports.getTradeHistory = async (req, res) => {
  let walletAddress = req.params.walletAddress;
  let trades = await Trade.find({ userId: walletAddress });
  let pool = await Pool.findOne();
  const data = {
    trades: trades,
    balance: pool.balance,
  };
  res.send({ message: "success", data: data });
};

exports.quitTrade = async (req, res) => {
  const { tradeId, walletAddress } = req.body;
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price",
    {
      params: {
        ids: "ethereum",
        vs_currencies: "usd",
      },
    }
  );
  endPrice = response.data.ethereum.usd;
  const searchTrade = Trade.findOne({ _id: tradeId });
  if (searchTrade.isExpire === false) {
    res.send({ message: "fail" });
  }
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

  const collateral = trade.entryPrice * trade.amount;
  trade.endPrice = endPrice;
  trade.endDate = endDate;
  let poolProfit = 0;

  if (isExpire) {
    trade.isExpire = true;
  }
  if (trade.type === "long") {
    trade.profit =
      (trade.endPrice - trade.entryPrice) * trade.amount * trade.leverage;
    if (trade.profit > 0) {
      poolProfit = trade.profit * 0.1;
      trade.profit *= 0.9;
    } else {
      poolProfit = trade.profit * 0.05;
      trade.profit *= 0.95;
    }
  }
  if (trade.type === "short") {
    trade.profit =
      (trade.entryPrice - trade.endPrice) * trade.amount * trade.leverage;
    if (trade.profit > 0) {
      poolProfit = trade.profit * 0.1;
      trade.profit *= 0.9;
    } else {
      poolProfit = trade.profit * 0.05;
      trade.profit *= 0.95;
    }
  }

  const value = (trade.profit + trade.entryPrice * trade.amount) / endPrice;
  const sepoliaRpcUrl =
    "https://base-sepolia.g.alchemy.com/v2/C0JTMu65n9O-csd9iypizssq51KHcdR-";

  const privateKey =
    "fe5f221ea7098bdba8700d4040b9082f9cbeb4274975afe62dcbd5409c43323a";

  const provider = new ethers.providers.JsonRpcProvider(sepoliaRpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = {
    to: trade.userId, // Replace with the recipient address
    value: ethers.utils.parseEther(value.toString().slice(0, 10)), // Amount to send in ether
    gasLimit: 21000, // Gas limit for a simple transfer
    gasPrice: ethers.utils.parseUnits("10", "gwei"), // Gas price in gwei
  };

  try {
    const txResponse = await wallet.sendTransaction(tx);
    console.log("Transaction Response:", txResponse);

    // Wait for the transaction to be mined
    const receipt = await txResponse.wait();
    console.log("Transaction Receipt:", receipt);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
  trade.executionFee = trade.endPrice * trade.amount * trade.leverage * 0.004;

  let pool = await Pool.findOne();
  pool.balance =
    pool.balance +
    poolProfit +
    trade.executionFee +
    trade.entryPrice * trade.amount * (trade.leverage - 1) -
    collateral;
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
    const liquidates = await Trade.find();
    let filterLiquidates = [];
    for (const liquidate of liquidates) {
      if (
        liquidate.entryPrice * liquidate.amount <
        ethPrice * liquidate.amount * liquidate.leverage
      ) {
        filterLiquidates.push(liquidate);
      }
    }

    const closeTrades = async (ethPrice, trades) => {
      for (const trade of trades) {
        await this.closeTrade(ethPrice, trade._id, true);
      }
    };
    const liquidateTrades = async (ethPrice, liquidates) => {
      for (const trade of liquidates) {
        await this.closeTrade(ethPrice, trade._id, true);
      }
    };

    await closeTrades(ethPrice, trades);
    liquidateTrades(ethPrice, filterLiquidates);
  });
};
