const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Schemas/userSchema');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);

// ------------------------
// 🔐 Token Helpers
// ------------------------

const createAccessToken = (payload) => {
    return jwt.sign(payload, process.env.ACCESS_SECRET_KEY, { expiresIn: '1d' });
};

const createRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_KEY, { expiresIn: '7d' });
};

// ------------------------
// 🧠 Helper: Validate ID
// ------------------------

const validateId = async (id) => {
    console.log(id)
    if (isNaN(id)) return false; // Prevent CastError
    const foundUser = await User.findOne({ id: Number(id) });
    return !!foundUser;
};

// ------------------------
// 💰 Helper: Check Balance
// ------------------------

const CheckBalance = async (id) => {
    if (isNaN(id)) return 0;
    const foundUser = await User.findOne({ id: Number(id) });
    return foundUser?.balance ?? 0;
};

// ------------------------
// 👤 Get Full User Profile
// ------------------------

const userProfile = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid User ID" });

    try {
        const foundUser = await User.findOne({ id }, { password: 0 }); // Exclude password
        if (!foundUser) return res.status(404).json({ message: "User not found" });
        res.json(foundUser);
    } catch (error) {
        console.error("Error in userProfile:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ------------------------
// 📝 Register
// ------------------------

const register = async (req, res) => {
    try {
        const lastUser = await User.findOne().sort({ id: -1 });
        const newId = lastUser ? lastUser.id + 1 : 1;

        const { name, email, password, balance } = req.body;

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = new User({
            id: newId,
            name,
            email,
            password: hashedPassword,
            balance: balance ?? 0
        });

        await newUser.save();

        const accessToken = createAccessToken({ id: newId });
        const refreshToken = createRefreshToken({ id: newId });

        res.cookie("refreshtoken", refreshToken, {
            httpOnly: true,
            path: "/user/refreshtoken"
        });

        res.json({
            message: "User registered successfully",
            id: newId,
            accessToken
        });
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).json({ message: "Registration failed" });
    }
};

// ------------------------
// 🔓 Login
// ------------------------

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const foundUser = await User.findOne({ email });

        if (!foundUser)
            return res.status(404).json({ message: "Email not registered!" });

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch)
            return res.status(401).json({ message: "Invalid Password" });

        const accessToken = createAccessToken({ id: foundUser.id });
        const refreshToken = createRefreshToken({ id: foundUser.id });

        res.cookie("refreshtoken", refreshToken, {
            httpOnly: true,
            path: "/user/refreshtoken"
        });

        res.json({
            message: "Login Success",
            id: foundUser.id,
            accessToken
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ------------------------
// ♻️ Refresh Token
// ------------------------

const refreshToken = (req, res) => {
    try {
        const refToken = req.cookies.refreshtoken;
        if (!refToken)
            return res.status(401).json({ message: "Please login or register" });

        jwt.verify(refToken, process.env.REFRESH_TOKEN_KEY, (err, user) => {
            if (err)
                return res.status(403).json({ message: "Invalid or expired token" });

            const accessToken = createAccessToken({ id: user.id });
            res.json({ accessToken });
        });
    } catch (err) {
        console.error("Refresh token error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ------------------------
// 🚪 Logout
// ------------------------

const logout = async (req, res) => {
    try {
        res.clearCookie("refreshtoken", { path: "/user/refreshtoken" });
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Logout error" });
    }
};

// ------------------------
// 🔐 Get User from Token (Protected Route Middleware)
// ------------------------

const getUser = async (req, res) => {
    try {
        res.status(200).json({ user: req.user });
    } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

// ------------------------
// 📦 Export All
// ------------------------

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    validateId,
    CheckBalance,
    userProfile,
    getUser
};
