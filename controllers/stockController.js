const Stock = require('../Schemas/stockSchema');
const User = require('../Schemas/userSchema');
const UserHistory = require('../Schemas/userHistorySchema');
const { validateId, CheckBalance } = require('./authController');
const userHistorySchema = require('../Schemas/userHistorySchema');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// ------------------------
// 📊 Get User's Stocks
// ------------------------

const getUserStocks = async (req, res) => {
    const id = Number(req.params.id);
    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }

    try {
        const stockData = await Stock.find({ id });
        res.json(stockData);
    } catch (err) {
        console.error("Error fetching user stocks:", err);
        res.status(500).json({ message: "Failed to fetch stocks" });
    }
};

// ------------------------
// 💰 Get Live Stock Price
// ------------------------

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
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ error: "Failed to fetch stock data" });
    }
};

// ------------------------
// 🛒 Buy Stock
// ------------------------

const buyStock = async (req, res) => {
    const id = Number(req.params.id);
    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }

    const { symbol, price, quantity } = req.body;
    const totalPrice = price * quantity;
    const balance = await CheckBalance(id);

    if (balance < totalPrice) {
        return res.status(400).json({ message: "Insufficient Balance" });
    }

    try {
        const existingStock = await Stock.findOne({ id, name: symbol });
        const updatedBalance = balance - totalPrice;
        await User.updateOne({ id }, { $set: { balance: updatedBalance } });

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
    } catch (err) {
        console.error("Buy stock error:", err);
        res.status(500).json({ message: "Failed to buy stock" });
    }
};

// ------------------------
// ❌ Sell Stock
// ------------------------

const deleteStock = async (req, res) => {
    const id = Number(req.params.id);
    const symbol = req.params.symbol.toUpperCase();
    const quantityToSell = req.body.quantity;

    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }

    if (!quantityToSell || quantityToSell <= 0) {
        return res.status(400).json({ message: "Invalid quantity to sell" });
    }

    try {
        const stock = await Stock.findOne({ id, name: symbol });
        if (!stock) {
            return res.status(404).json({ message: "Stock not found for the user" });
        }

        if (quantityToSell > stock.quantity) {
            return res.status(400).json({ message: "You can't sell more than you own" });
        }

        // Fetch current live price (you may also choose to use req.body.price)
        const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "error") {
            return res.status(400).json({ error: data.message });
        }

        const currentPrice = parseFloat(data.price);
        const avgBuyPrice = stock.totalPrice / stock.quantity;
        const profitPerShare = currentPrice - avgBuyPrice;
        const totalProfit = profitPerShare * quantityToSell;
        const totalRefund = currentPrice * quantityToSell;

        const balance = await CheckBalance(id);
        const updatedBalance = balance + totalRefund;
        await User.updateOne({ id }, { $set: { balance: updatedBalance } });

        if (quantityToSell === stock.quantity) {
            await Stock.deleteOne({ _id: stock._id });
        } else {
            stock.quantity -= quantityToSell;
            stock.totalPrice = stock.quantity * avgBuyPrice;
            await stock.save();
        }

        const historyEntry = new UserHistory({
            userId: id,
            symbol,
            action: 'sell',
            price: currentPrice,
            profit: totalProfit,
            quantity: quantityToSell,
            total: totalRefund,
            buyPrice: avgBuyPrice // 👈 Add this line
        });

        await historyEntry.save();

        res.json({ message: `${quantityToSell} ${symbol} shares sold successfully.`, profit: totalProfit.toFixed(2) });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Failed to process stock sell request" });
    }
};

const userHistory = async (req, res) => {
    const id = req.params.id;

    // ✅ Validate user ID
    if (!(await validateId(id))) {
        return res.status(404).json({ message: "Invalid User ID" });
    }

    try {
        // ✅ Fetch user transaction history
        const history = await userHistorySchema.find({ userId: id });
        res.json(history);
    } catch (err) {
        console.error("Error fetching user history:", err);
        res.status(500).json({ message: "Failed to fetch user history" });
    }
};


// ------------------------
// 📦 Export Controller
// ------------------------

module.exports = {
    getUserStocks,
    getStockPrice,
    buyStock,
    deleteStock,
    userHistory
};
