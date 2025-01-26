const cors = require("cors");

// Define the CORS middleware with multiple origins
const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://rent-directory.netlify.app", // Production origin
      /^http:\/\/localhost:\d+$/, // Regex for any localhost with a dynamic port
    ];

    // Check if the origin matches any of the allowed origins
    if (
      allowedOrigins.some((allowedOrigin) =>
        typeof allowedOrigin === "string"
          ? allowedOrigin === origin
          : allowedOrigin.test(origin)
      )
    ) {
      callback(null, true); // Allow the origin
    } else {
      callback(new Error("Not allowed by CORS")); // Deny the origin
    }
  },
  credentials: true, // Optional: If you need to support cookies
});

module.exports = { corsMiddleware };
