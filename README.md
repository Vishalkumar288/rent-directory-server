Summary
-------------------------------------------

What this repo is
- A small Express.js backend (package name: google-sheets-backend) that uses the Google Sheets API as its data store to manage rent/tenant information. It exposes authentication endpoints and a set of APIs to read, append, update, paginate, and delete rent-related rows in specific spreadsheets.

Primary responsibilities / features
- Authentication: simple JWT-based auth with two entry points
  - POST /auth/google — accepts id/password and issues a JWT if credentials match an ALLOWED_EMAILS list (from env).
  - POST /auth/demo-user — issues a demo JWT (first user in ALLOWED_EMAILS).
  - All other routes are protected by a JWT middleware.
- Sheets operations (via googleapis and a service account)
  - Fetch sheet summary (Sheet-Summary).
  - List available flat sheets (excluding summary/financial sheets).
  - Fetch totals for tenants in a date range (Financial-Report).
  - Append new rent entries (normal or “electric bill” entries).
  - Fetch recent entries with pagination and formatting.
  - Get / update / delete amounts for a given month-year (regular or electric).
  - Update summary info for a flat.
- Utilities
  - googleConfig sets up an OAuth2 client (CLIENT_ID/SECRET).
  - A CORS middleware wrapper.
- Runs on an Express server (src/app.js) and reads configuration from environment variables.

Key files and their roles
- src/app.js — app bootstrap (CORS, body parser, mounts /auth routes) and starts listener on NODE_PORT.
- src/api/index.js — route definitions (auth endpoints, protected sheets-related endpoints).
- src/api/controller/authController.js and demoController.js — create JWTs for clients.
- src/api/middleware/auth.js — JWT verification middleware.
- src/api/modules/sheets.js — all Google Sheets API logic (get/append/update/delete, formatting, pagination).
- src/utils/googleConfig.js — creates OAuth2 client (though most sheets access uses service account credentials).
- .env.sample — lists expected environment variables (service account JSON, sheet IDs, JWT secret, etc).
- package.json — dependencies (googleapis, express, dotenv, jsonwebtoken, axios, cors, moment).

Environment / setup notes
- Required/expected env vars (see .env.sample): ALLOWED_EMAILS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, JWT_TIMEOUT, NODE_GOOGLE_SERVICE_ACCOUNT_JSON (JSON string of service account credentials), NODE_GOOGLE_SHEETS_ID, NODE_DEMO_SHEETS_ID, NODE_PORT.
- Typical run: npm install, set env (or copy .env.sample -> .env and fill), npm start or npm run dev (nodemon).
- The service account JSON is expected to be provided as a JSON string in NODE_GOOGLE_SERVICE_ACCOUNT_JSON.

Notable implementation details & caveats
- Authentication is not Google OAuth despite filenames — it validates id/password pairs defined in ALLOWED_EMAILS (a JSON array) and issues JWTs.
- The Sheets module uses a service account credential parsed from NODE_GOOGLE_SERVICE_ACCOUNT_JSON to call the Sheets API.
- Many operations assume specific sheet layouts & ranges (e.g., rent entries start at row 7, Sheet-Summary columns A–H, Financial-Report A:F). The API will break if sheet structure differs.
- Some potential bugs / issues to be aware of:
  - updateSheetSummary in src/api/modules/sheets.js references res (res.status(...)) inside the module function — but this module has no access to an Express response, so that will throw if that code path runs.
  - appendToSheet’s logic for finding the next free row when writing electric bills uses the length of values returned from a single-column fetch (E:E) and then calculates lastRow + 1 relative to E7 — this may miscalculate the intended insertion row depending on empty rows and where the data truly starts.
  - fetchAmountByMonthYear / update/delete functions fetch ranges like E7:G or A7:C and then check row[1] for monthYear — the effective index depends on the chosen range. If the month-year column index is not aligned with expectations, lookups will fail.
  - ALLOWED_EMAILS is parsed from an environment variable on each auth request; malformed JSON will cause runtime errors.
  - Sensitive secrets (service account JSON, JWT secret) are expected in environment variables; ensure they’re stored securely.
- Error handling is simple (mostly rethrow or send message) — no structured error codes.

Suggestions / improvements
- Fix bugs: remove direct res usage from sheets module and handle errors/validation in routes; verify row index math when calculating ranges.
- Use proper OAuth flows if you intend real Google sign-in (googleConfig sets up OAuth2 but not used for actual login).
- Add input validation (Joi or similar) and more specific HTTP status codes.
- Store secrets securely (use a secret manager) and avoid large JSON values in single env vars if possible (or read file).
- Add tests and CI checks.
- Add rate limiting, logging, and structured error responses.
- Consider caching sheet metadata to avoid frequent calls (if appropriate).

Quick run instructions
- npm install
- Create a .env from .env.sample and fill values (especially NODE_GOOGLE_SERVICE_ACCOUNT_JSON with JSON string, and sheet IDs).
- npm run dev (or npm start)
- API base path: /auth (so endpoints like POST /auth/google, GET /auth/all-flats, etc.)
