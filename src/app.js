const express = require("express");
const apiRoutes = require("./api");
const path = require("path");
const { corsMiddleware } = require("./api/middleware/cors");
require('dotenv').config();

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// API Routes
app.use("/rent", apiRoutes);
const PORT = process.env.NODE_PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
