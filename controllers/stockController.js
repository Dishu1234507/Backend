const Stock = require('../Schemas/stockSchema');
const User = require('../Schemas/userSchema');
const UserHistory = require('../Schemas/userHistorySchema');
const { validateId } = require('./authController');
const { CheckBalance } = require('./authController');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

const getUserStocks = async (req, res) => {
    const id = Number(req.params.id);
    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }
    const stockData = await Stock.find({ id });
    res.json(stockData);
};

const getStockPrice = async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "error") {
            return res.status(400).json({ error: data.message });
        }

        res.json({ symbol, price: data.price });
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ error: "Failed to fetch stock data" });
    }
};

const buyStock = async (req, res) => {
    const id = Number(req.params.id);
    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }

    const { symbol, price, quantity } = req.body;
    const totalPrice = quantity * price;
    const balance = await CheckBalance(id);

    if (balance < totalPrice) {
        return res.status(400).json({ message: "Insufficient Balance" });
    }

    const existingStock = await Stock.findOne({ id, name: symbol });
    const Updatedbalance = balance - totalPrice;
    await User.updateOne({ id }, { $set: { balance: Updatedbalance } });

    if (existingStock) {
        existingStock.quantity += quantity;
        existingStock.totalPrice += totalPrice;
        await existingStock.save();
    } else {
        const newStock = new Stock({ id, name: symbol, price, quantity, totalPrice });
        await newStock.save();
    }

    const historyEntry = new UserHistory({
        userId: id,
        symbol,
        action: 'buy',
        price,
        quantity,
        total: totalPrice
    });
    await historyEntry.save();

    res.json({ message: "Stock bought successfully!" });
};

const deleteStock = async (req, res) => {
    const id = Number(req.params.id);
    const symbol = req.params.symbol.toUpperCase();

    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }

    try {
        const stock = await Stock.findOne({ id, name: symbol });

        if (!stock) {
            return res.status(404).json({ message: "Stock not found for the user" });
        }

        const refundAmount = stock.totalPrice;
        const balance = await CheckBalance(id);
        const updatedBalance = balance + refundAmount;

        // Delete stock
        await Stock.deleteOne({ _id: stock._id });

        // Update user balance
        await User.updateOne({ id }, { $set: { balance: updatedBalance } });

        // Add to history
        const historyEntry = new UserHistory({
            userId: id,
            symbol,
            action: 'sell',
            price: stock.price,
            quantity: stock.quantity,
            total: refundAmount
        });
        await historyEntry.save();

        res.json({ message: "Stock deleted and amount refunded successfully!" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Failed to delete stock" });
    }
};

module.exports = { getUserStocks, getStockPrice, buyStock, deleteStock };
