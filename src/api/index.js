const express = require("express");
const {
  fetchSheetSummary,
  appendToSheet,
  fetchRecentEntries,
  formatResponseData,
  paginateData,
  fetchAmountByMonthYear,
  updateAmountByMonthYear
} = require("./modules/sheets");
const googleLogin = require("./controller/authController");
const authenticateToken = require("./middleware/auth");
const router = express.Router();
require("dotenv").config();

const spreadsheetId = process.env.NODE_GOOGLE_SHEETS_ID;

router.get("/google", googleLogin);

// Apply authentication middleware to all routes below this line
router.use(authenticateToken);

router.get("/all-flats", async (req, res) => {
  try {
    const sheetsSummary = await fetchSheetSummary(spreadsheetId);
    res.status(200).json({ tenants: sheetsSummary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Append new rent entry
router.post("/add-rent-entry", async (req, res) => {
  const { values, sheet, isElectricBill } = req.body;

  // Validate inputs
  if (!sheet || !Array.isArray(values)) {
    return res
      .status(400)
      .json({ message: "Sheet name and values are mandatory." });
  }
  let range;
  if (Boolean(isElectricBill)) {
    range = `${sheet}!E7:G7`;
  } else {
    range = `${sheet}!A7`;
  }

  try {
    const data = await appendToSheet(
      spreadsheetId,
      range,
      values,
      isElectricBill
    );
    res.status(200).json({
      message: "Entry Successfully Added",
      data: { entriesAdded: data?.updates?.updatedRows }
    });
  } catch (error) {
    res.status(500).json({ message: "Try again later" });
  }
});

router.get("/recent-entries", async (req, res) => {
  const { sheet, page = 1, pageSize = 10 } = req.query;

  if (!sheet) {
    return res.status(400).json({ message: "Sheet name is mandatory." });
  }

  const parsedPage = parseInt(page, 10);
  const parsedPageSize = parseInt(pageSize, 10);

  if (
    isNaN(parsedPage) ||
    isNaN(parsedPageSize) ||
    parsedPage < 1 ||
    parsedPageSize < 1
  ) {
    return res.status(400).json({ message: "Invalid page or pageSize values." });
  }

  try {
    const { recentEntries, sheetSummary } = await fetchRecentEntries(
      spreadsheetId,
      sheet
    );
    const formattedData = formatResponseData(recentEntries);
    const paginatedData = paginateData(
      formattedData,
      parsedPage,
      parsedPageSize
    );
    res.status(200).json({ data: paginatedData, sheetSummary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch amount based on month, year, and isElectricBill
router.get("/amount", async (req, res) => {
  const { sheet, month, year, isElectricBill } = req.query;

  if (!sheet || !month || !year) {
    return res
      .status(400)
      .json({ message: "Sheet name, month, and year are mandatory." });
  }

  try {
    const amount = await fetchAmountByMonthYear(
      spreadsheetId,
      sheet,
      month,
      year,
      Boolean(isElectricBill)
    );
    res.status(200).json({ amount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update amount based on month, year, and isElectricBill
router.put("/amount", async (req, res) => {
  const { sheet, month, year, isElectricBill, values } = req.body;

  if (!sheet || !month || !year || !values || !Array.isArray(values)) {
    return res
      .status(400)
      .json({ message: "Sheet name, month, year, and values are mandatory." });
  }

  try {
    const data = await updateAmountByMonthYear(
      spreadsheetId,
      sheet,
      month,
      year,
      Boolean(isElectricBill),
      values
    );
    res
      .status(200)
      .json({
        message: "Entry Successfully Updated",
        data: { entriesUpdated: data?.updates?.updatedRows }
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
