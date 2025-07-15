const jwt = require("jsonwebtoken")
const user_model = require("../Schemas/userSchema")
require("dotenv").config()

const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization");
        if (!token) {
            return res.status(400).json({ status: false, message: "User not found" })
        }
        const payload = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
        const user = await user_model.findOne({ id: payload.id }).select("-password");

        if (!user) {
            return res.status(400).json({ status: false, message: "User not found" })
        }
        req.user = user
        next();
    } catch (err) {
        console.log(err)
    }
}

module.exports = auth