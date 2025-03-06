const jwt = require("jsonwebtoken");
require("dotenv").config();

const demoLogin = async (req, res) => {
  try {
    const allowedEmails = JSON.parse(process.env.ALLOWED_EMAILS || "[]");
    const user = allowedEmails[0];
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
    res.status(500).json({ message: "Demo login error" });
  }
};

module.exports = demoLogin;
