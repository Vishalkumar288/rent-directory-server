const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const googleLogin = async (req, res) => {
  try {
    const { id, password } = req.body; // Receive access token from frontend

    if (!id || !password) {
      return res.status(400).json({ message: "Invaild Login" });
    }

    // Check if user is authorized
    const allowedEmails = JSON.parse(process.env.ALLOWED_EMAILS || "[]");

    const user =
      allowedEmails.find(
        (user) => user.id === id && user.password === password
      ) || null;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized User" });
    }

    // Generate JWT for your app
    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_TIMEOUT
    });

    return res.status(200).json({
      message: "Success",
      token,
      user: { email: user?.id, name: user?.name }
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = googleLogin;
