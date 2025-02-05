const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body; // Receive access token from frontend

    if (!access_token) {
      return res.status(400).json({ message: "Access token is required" });
    }

    // Verify the Google access token and get user info
    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`
    );

    const { email, name, picture } = userRes.data;

    // Check if user is authorized
    const isUserExist = process.env.ALLOWED_EMAILS.split(",").includes(email);
    if (!isUserExist) {
      return res.status(401).json({ message: "Unauthorized User" });
    }

    // Generate JWT for your app
    const token = jwt.sign({ name, email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_TIMEOUT
    });

    return res.status(200).json({
      message: "Success",
      token,
      user: { email, name, picture }
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = googleLogin;
