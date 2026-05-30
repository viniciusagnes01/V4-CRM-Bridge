import { google } from 'googleapis';
import { extractSheetId, getGoogleAuth, readJson, send } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'Use POST' });

  try {
    const body = readJson(req);
    const sheetId = extractSheetId(body.growthpackUrl || body.sheetId);
    const tabName = body.tabName || 'BASE_CRM';
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!sheetId) return send(res, 400, { ok: false, message: 'Missing sheet id' });
    if (!rows.length) return send(res, 400, { ok: false, message: 'Missing rows' });

    const sheets = google.sheets({ version: 'v4', auth: getGoogleAuth() });
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A:N`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });

    return send(res, 200, {
      ok: true,
      sheetId,
      tabName,
      updatedRows: result.data.updates?.updatedRows || rows.length
    });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message });
  }
}
