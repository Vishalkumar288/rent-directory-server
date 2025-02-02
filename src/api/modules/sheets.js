const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

const googleServiceAccount = JSON.parse(
  process.env.NODE_GOOGLE_SERVICE_ACCOUNT_JSON
);

const auth = new google.auth.GoogleAuth({
  credentials: googleServiceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

const fetchSheetSummary = async (spreadsheetId) => {
  try {
    const sheetName = "Sheet-Summary"; // Specify the sheet name directly
    const range = `${sheetName}!A2:G6`; // Adjusted to match the range for the provided table

    // Fetch data from the specific sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    const rows = response.data.values || [];

    // Process the rows to extract the required data
    const summary = rows.map((row) => ({
      floor: row[0] || "", // Column A: Floor
      rentPerMonth: +row[1] || 0, // Column B: Rent / Month
      securityDeposit: +row[2] || 0, // Column C: Security Deposit
      totalRentCollected: +row[3] || 0, // Column D: Total Rent Collected
      totalElectricityCollected: +row[4] || 0, // Column E: Total Electricity Collected
      rentStartDate: row[5] || "", // Column F: rent Start Date
      lastEntryDate: row[6] || "" // Column G: recent Entry Date
    }));

    return summary;
  } catch (error) {
    throw new Error(`Error fetching data from Sheet-Summary: ${error.message}`);
  }
};

const fetchSheetSummaryForSheet = async (spreadsheetId, sheet) => {
  try {
    const summary = await fetchSheetSummary(spreadsheetId);
    const matchingRow = summary.find((row) => row.floor === sheet);

    if (!matchingRow) {
      throw new Error(`No matching floor found for sheetId: ${sheet}`);
    }
    const {
      floor,
      rentPerMonth,
      securityDeposit,
      totalRentCollected,
      totalElectricityCollected,
      rentStartDate,
      lastEntryDate
    } = matchingRow;
    return {
      floor,
      rentPerMonth,
      securityDeposit,
      totalRentCollected,
      totalElectricityCollected,
      rentStartDate,
      lastEntryDate
    };
  } catch (error) {
    throw new Error(`Error fetching sheet summary: ${error.message}`);
  }
};

// Append data to a sheet
const appendToSheet = async (
  spreadsheetId,
  range,
  values,
  isElectricBill = false
) => {
  try {
    // If appending to E, F, G columns, find the last row with data
    if (isElectricBill) {
      const sheet = range.split("!")[0];
      const columnRange = `${sheet}!E:E`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: columnRange
      });

      const rows = response.data.values || [];
      const lastRow = rows.length; // Adjust for the starting row (E7)

      range = `${sheet}!E${lastRow + 1}:G${lastRow + 1}`;
    }

    const response = isElectricBill
      ? await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: "USER_ENTERED",
          resource: { values }
        })
      : await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: "USER_ENTERED",
          resource: { values }
        });

    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Fetch recent 10 entries
const fetchRecentEntries = async (spreadsheetId, sheet) => {
  try {
    const range = `${sheet}!A7:Z`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    const allRows = response.data.values || [];
    const recentEntries = allRows.reverse(); // Reverse rows to get descending order

    // Fetch sheet summary for the specified sheet
    const sheetSummary = await fetchSheetSummaryForSheet(spreadsheetId, sheet);

    return {
      recentEntries,
      sheetSummary
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const paginateData = (data, page, pageSize) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = data.slice(startIndex, endIndex);

  return {
    page,
    pageSize,
    totalEntries: data.length,
    totalPages: Math.ceil(data.length / pageSize),
    rows: paginatedRows
  };
};

const formatResponseData = (rows) => {
  return rows
    .map((row) => {
      const rentData = row.slice(0, 3);
      const electricityStartIndex = 4;
      const electricityData = row[electricityStartIndex]
        ? row.slice(electricityStartIndex, electricityStartIndex + 3)
        : null;

      const formattedRow = { rentData };

      if (electricityData && electricityData.some((value) => value)) {
        formattedRow.electricityData = electricityData;
      }

      return formattedRow;
    })
    .filter((row) => Object.keys(row).length > 0); // Filter out rows with no valid data
};

const fetchAmountByMonthYear = async (
  spreadsheetId,
  sheet,
  month,
  year,
  isElectricBill
) => {
  try {
    const columnRange = isElectricBill ? `${sheet}!E7:G` : `${sheet}!A7:C`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: columnRange
    });

    const rows = response.data.values || [];
    const targetRow = rows.find((row) => {
      const date = new Date(row[0].split("/").reverse().join("/"));
      return (
        date.getMonth() + 1 === parseInt(month) &&
        date.getFullYear() === parseInt(year)
      );
    });
    if (!targetRow) {
      throw new Error(
        "No matching entry found for the specified month and year."
      );
    }

    return targetRow.slice(0, 3);
  } catch (error) {
    throw new Error(`Error fetching amount: ${error.message}`);
  }
};

const updateAmountByMonthYear = async (
  spreadsheetId,
  sheet,
  month,
  year,
  isElectricBill,
  values
) => {
  try {
    const columnRange = isElectricBill ? `${sheet}!E7:G` : `${sheet}!A7:C`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: columnRange
    });

    const rows = response.data.values || [];
    const targetRowIndex = rows.findIndex((row) => {
      const date = new Date(row[0].split("/").reverse().join("/"));

      return (
        date.getMonth() + 1 === parseInt(month) &&
        date.getFullYear() === parseInt(year)
      );
    });

    if (targetRowIndex === -1) {
      throw new Error(
        "No matching entry found for the specified month and year."
      );
    }

    const range = isElectricBill
      ? `${sheet}!E${targetRowIndex + 7}:G${targetRowIndex + 7}`
      : `${sheet}!A${targetRowIndex + 7}:C${targetRowIndex + 7}`;

    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      resource: { values }
    });

    return updateResponse.data;
  } catch (error) {
    throw new Error(`Error updating amount: ${error.message}`);
  }
};

module.exports = {
  fetchSheetSummary,
  appendToSheet,
  fetchRecentEntries,
  formatResponseData,
  paginateData,
  fetchAmountByMonthYear,
  updateAmountByMonthYear
};
