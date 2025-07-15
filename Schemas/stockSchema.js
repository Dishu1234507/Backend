const mongoose = require("mongoose")

const stockSchema = mongoose.Schema({
    id: { type: Number, require: true },
    name: { type: String, require: true },
    price: { type: Number, require: true },
    quantity : {type : Number , require: true},
    totalPrice : {type : Number , require :true}
})

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;