const cors = require("cors");

const corsMiddleware = cors({
  origin: /^http:\/\/localhost:\d+$/,
});

module.exports = { corsMiddleware };
