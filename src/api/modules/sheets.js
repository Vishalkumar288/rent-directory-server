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
    // Fetch the list of sheets in the spreadsheet
    const sheetsInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = sheetsInfo.data.sheets.map(
      (sheet) => sheet.properties.title
    );

    const summary = [];

    for (const sheet of sheetNames) {
      // Fetch rows from row 7 to the end
      const range = `${sheet}!A7:Z`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });
      const rows = response.data.values || [];

      // Count rows for each category
      const rentRows = rows.filter(
        (row) => row[0] && (row[0] !== "" || row[1] !== "" || row[2] !== "")
      ).length;
      const electricityBillRows = rows.filter(
        (row) => row[4] && (row[4] !== "" || row[5] !== "" || row[6] !== "")
      ).length;

      // Fetch Agreed Upon Rent and Security Deposit
      const rentRange = `${sheet}!I3:J4`;
      const securityDepositRange = `${sheet}!I7:J8`;

      const rentAmountResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: rentRange
      });
      const securityDepositResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: securityDepositRange
      });

      const agreedRent =
        +rentAmountResponse.data.values?.flat().join(" ") || "";
      const securityDeposit =
        +securityDepositResponse.data.values?.flat().join(" ") || "";

      // Find the most recent date (assuming date is in column B)
      let lastEntryDate = "";
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][0]) {
          // Assuming date is in the second column
          lastEntryDate = rows[i][0];
          break;
        }
      }

      // Add summary for the sheet
      summary.push({
        sheetName: sheet,
        rentRows,
        electricityBillRows,
        agreedRent,
        securityDeposit,
        lastEntryDate
      });
    }

    return summary;
  } catch (error) {
    throw new Error(`Error fetching sheet summary: ${error.message}`);
  }
};

// Append data to a sheet
const appendToSheet = async (spreadsheetId, range, values) => {
  try {
    const response = await sheets.spreadsheets.values.append({
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
const fetchRecentEntries = async (spreadsheetId, range) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    const allRows = response.data.values || [];

    return allRows.reverse(); // Reverse rows to get descending order
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

// Update electricity bill values
const updateElectricityBill = async (spreadsheetId, range, values) => {
  try {
    const response = await sheets.spreadsheets.values.update({
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

module.exports = {
  fetchSheetSummary,
  appendToSheet,
  fetchRecentEntries,
  formatResponseData,
  updateElectricityBill,
  paginateData
};
