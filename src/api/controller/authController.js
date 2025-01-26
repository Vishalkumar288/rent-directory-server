const axios = require("axios");
const { oauth2Client } = require("../../utils/googleConfig");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const googleLogin = async (req, res) => {
  try {
    const { code } = req.query;
    const googleRes = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );
    const { email, name, picture } = userRes.data;
    const isUserExist = process.env.ALLOWED_EMAILS.split(",").includes(
      `${email}`
    );
    if (!isUserExist) {
      return res.status(401).json({ message: "Unauthorized User" });
    }
    const token = jwt.sign({ name, email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_TIMEOUT
    });
    return res
      .status(200)
      .json({ message: "Success", token, ...userRes?.data });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = googleLogin;
