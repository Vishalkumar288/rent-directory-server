const express = require("express");
const apiRoutes = require("./api");
const path = require("path");
const { corsMiddleware } = require("./api/middleware/cors");

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// API Routes
app.use("/rent", apiRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
