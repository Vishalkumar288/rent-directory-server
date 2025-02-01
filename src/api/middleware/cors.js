const cors = require("cors");

// Define the CORS middleware with multiple origins
const corsMiddleware = cors();

module.exports = { corsMiddleware };
