const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const app = express();

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.use(express.json());

app.post('/append-to-sheet', async (req, res) => {
  const { values } = req.body;
  const spreadsheetId = '1l7puy7JS7bxRZ8LoWIVKS5g1I60WgjRuqRpo15tONyw';
  const range = 'Sheet1!A1'; // Adjust as needed

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    res.status(200).json({ data: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
