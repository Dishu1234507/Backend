const { default: mongoose } = require("mongoose");

const userSchema = mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true  , unique:true},
    password: { type: String, required: true },
    balance: { type: Number, required: true }
})

const User = mongoose.model("User", userSchema);

module.exports = User;