import { google } from 'googleapis';
import { getGoogleAuth, send } from './_utils.js';

const SPREADSHEET_ID = '1KLxctUK2ZGaM7jm1y2zj-StwLTgV6qP0PL1a-ZEnMmo';
const TAB_NAME = 'TESTE_BASE_CRM';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, {
        ok: false,
        message: 'Endpoint de teste bloqueado para acesso direto. Use POST com um segredo temporario.'
      });
    }

    const providedSecret = req.headers['x-test-secret'];
    const expectedSecret = process.env.TEST_GROWTHPACK_SECRET;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return send(res, 401, {
        ok: false,
        message: 'Teste protegido. Configure TEST_GROWTHPACK_SECRET no Vercel e envie o header x-test-secret para executar novamente.'
      });
    }

    const sheets = google.sheets({ version: 'v4', auth: getGoogleAuth() });
    const now = new Date().toISOString();

    const rows = [
      [now, 'teste-001', 'Lead teste V4 Bridge', 0, 1, 0, 0, 0, 0, 0, 1, 0, 'V4 CRM Bridge', ''],
      [now, 'teste-002', 'Oportunidade teste V4 Bridge', 1500, 0, 0, 0, 1, 0, 0, 0, 1, 'V4 CRM Bridge', ''],
      [now, 'teste-003', 'Compra teste V4 Bridge', 2500, 0, 0, 0, 0, 1, 0, 0, 1, 'V4 CRM Bridge', '']
    ];

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A:N`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });

    return send(res, 200, {
      ok: true,
      message: 'Teste enviado para a GrowthPack.',
      spreadsheetId: SPREADSHEET_ID,
      tabName: TAB_NAME,
      writtenRows: result.data.updates?.updatedRows || rows.length,
      updatedRange: result.data.updates?.updatedRange || null
    });
  } catch (error) {
    return send(res, 500, {
      ok: false,
      message: error.message,
      hint: 'Verifique as variaveis do Vercel e o compartilhamento da planilha com a service account.'
    });
  }
}
