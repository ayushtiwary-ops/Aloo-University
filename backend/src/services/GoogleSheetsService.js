/**
 * GoogleSheetsService
 *
 * Appends audit records to a Google Sheet via the Sheets v4 API,
 * authenticated with a Service Account JSON key file.
 *
 * Authentication:
 *   Reads the key file path from env.googleServiceAccountKeyPath.
 *   The service account must have "Editor" access to the target sheet.
 *
 * Performance:
 *   All rows are appended in a single spreadsheets.values.append call
 *   (batch insert — not one-by-one).
 */

import { google } from 'googleapis';
import { env }    from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Column order exported to the sheet
const HEADERS = [
  'Name',
  'Email',
  'ExceptionCount',
  'Flagged',
  'RiskLevel',
  'EligibilityStatus',
  'Timestamp',
];

/**
 * Derives a risk level label from a numeric risk score.
 * Fallback for records that do not carry a stored riskLevel.
 */
function _riskLevel(score) {
  if (score <= 20) return 'Low';
  if (score <= 50) return 'Medium';
  return 'High';
}

/**
 * Flattens one audit record into a row array matching HEADERS order.
 *
 * @param {object} record
 * @returns {(string|number|boolean)[]}
 */
function _toRow(record) {
  const snap = record.candidateSnapshot ?? {};
  const vs   = record.validationSummary ?? {};
  return [
    snap.fullName        ?? '',
    snap.email           ?? '',
    vs.exceptionCount    ?? 0,
    vs.flagged           ? 'Yes' : 'No',
    record.riskLevel     ?? _riskLevel(record.riskScore ?? 0),
    vs.eligibilityStatus ?? '',
    record.timestamp     ?? '',
  ];
}

/**
 * Validates that the required Google Sheets env vars are present.
 * Called at request time (not at startup) so missing vars only
 * fail the export route, not the entire server.
 *
 * @throws {ApiError} 503 if either variable is missing
 */
function _assertConfig() {
  const missing = [];
  if (!env.googleServiceAccountKeyPath) missing.push('GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
  if (!env.googleSheetId)               missing.push('GOOGLE_SHEET_ID');
  if (missing.length) {
    throw new ApiError(
      503,
      `Google Sheets export is not configured. Missing environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`
    );
  }
}

/**
 * Appends all provided audit records to the configured Google Sheet.
 *
 * @param {object[]} records - Array of audit records from AuditService
 * @returns {Promise<{ updatedRows: number }>}
 * @throws {ApiError} on missing config or Google API errors
 */
export async function appendRecordsToSheet(records) {
  _assertConfig();

  if (!records.length) {
    return { updatedRows: 0 };
  }

  // Authenticate via Service Account
  const auth = new google.auth.GoogleAuth({
    keyFile: env.googleServiceAccountKeyPath,
    scopes:  ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Build rows: header + one row per record
  const values = [HEADERS, ...records.map(_toRow)];

  // Single batch append — range auto-expands to fit all rows
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId:   env.googleSheetId,
    range:           'Sheet1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody:     { values },
  });

  const updatedRows = response.data.updates?.updatedRows ?? values.length;
  return { updatedRows };
}
