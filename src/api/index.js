const express = require("express");
const {
  fetchSheetSummary,
  appendToSheet,
  fetchRecentEntries,
  updateElectricityBill,
  formatResponseData,
  paginateData
} = require("./modules/sheets");
const { validateRequest } = require("../utils/validate");
const router = express.Router();
require('dotenv').config();

const spreadsheetId = process.env.NODE_GOOGLE_SHEETS_ID;

router.get("/all-flats", async (req, res) => {
  try {
    const sheetsSummary = await fetchSheetSummary(spreadsheetId);
    res.status(200).json({ tenants: sheetsSummary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Append new rent entry
router.post("/add-rent-entry", async (req, res) => {
  const { values, sheet } = req.body;

  // Validate inputs
  if (!sheet || !Array.isArray(values)) {
    return res
      .status(400)
      .json({ error: "Sheet name and values are mandatory." });
  }

  const range = `${sheet}!A7`;

  try {
    const data = await appendToSheet(spreadsheetId, range, values);
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch recent 10 entries
router.get("/recent-entries", async (req, res) => {
  const { sheet, page = 1, pageSize = 10 } = req.query;

  if (!sheet) {
    return res.status(400).json({ error: "Sheet name is mandatory." });
  }

  const parsedPage = parseInt(page, 10);
  const parsedPageSize = parseInt(pageSize, 10);

  if (
    isNaN(parsedPage) ||
    isNaN(parsedPageSize) ||
    parsedPage < 1 ||
    parsedPageSize < 1
  ) {
    return res.status(400).json({ error: "Invalid page or pageSize values." });
  }

  try {
    const data = await fetchRecentEntries(spreadsheetId, `${sheet}!A7:Z`);
    const formattedData = formatResponseData(data);
    const paginatedData = paginateData(
      formattedData,
      parsedPage,
      parsedPageSize
    );
    res.status(200).json({ data: paginatedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update electricity bill
router.put("/update-electricity-bill", async (req, res) => {
  const { values, sheet } = req.body;

  if (!sheet || !values || !Array.isArray(values)) {
    return res
      .status(400)
      .json({ error: "Sheet name and values are mandatory." });
  }

  try {
    const data = await updateElectricityBill(
      spreadsheetId,
      `${sheet}!B2:B10`,
      values
    );
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
