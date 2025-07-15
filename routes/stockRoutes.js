const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/mystocks/:id', stockController.getUserStocks);
router.get('/api/stock/:symbol', stockController.getStockPrice);
router.post('/buy/stock/:id', stockController.buyStock);
router.delete('/delete/:symbol/:id', stockController.deleteStock);

module.exports = router;
