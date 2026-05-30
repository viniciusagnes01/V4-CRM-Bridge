import { google } from 'googleapis';
import { fetchKommoLeads } from './_kommo.js';
import { extractSheetId, getGoogleAuth, readJson, send, toBaseCrmRow } from './_utils.js';

function sampleRecords() {
  return [
    { id: 'demo-001', name: 'Lead Demo', value: 0, stage: 'lead', source: 'meta', owner: 'Account V4' },
    { id: 'demo-002', name: 'Oportunidade Demo', value: 1500, stage: 'oportunidade', source: 'google', owner: 'Account V4' },
    { id: 'demo-003', name: 'Compra Demo', value: 2500, stage: 'compra', source: 'google', owner: 'Account V4' }
  ];
}

async function getRecords({ integration, limit }) {
  const crm = integration.crm || 'mock';
  if (crm === 'kommo') {
    const alias = integration.credentialAlias || integration.tokenAlias || '';
    const key = alias ? process.env[alias] : process.env.KOMMO_ACCESS_KEY;
    return fetchKommoLeads({ baseUrl: integration.baseUrl, accessKey: key, limit });
  }
  return sampleRecords();
}

async function writeRows({ growthpackUrl, tabName, rows }) {
  const sheetId = extractSheetId(growthpackUrl);
  if (!sheetId) throw new Error('Missing GrowthPack URL or Sheet ID');
  const sheets = google.sheets({ version: 'v4', auth: getGoogleAuth() });
  const result = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName || 'BASE_CRM'}!A:N`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows }
  });
  return result.data.updates?.updatedRows || rows.length;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'Use POST' });

  try {
    const body = readJson(req);
    const client = body.client || {};
    const integration = body.integration || {};
    const stages = integration.stages || {};
    const limit = Number(body.limit || 50);
    const writeToSheet = Boolean(body.writeToSheet);

    const records = await getRecords({ integration, limit });
    const rows = records.map(record => toBaseCrmRow(record, stages));

    let writtenRows = 0;
    if (writeToSheet) {
      writtenRows = await writeRows({ growthpackUrl: client.growthpackUrl, tabName: client.crmTab || 'BASE_CRM', rows });
    }

    return send(res, 200, {
      ok: true,
      client: client.name || 'Cliente sem nome',
      crm: integration.crm || 'mock',
      records: records.length,
      writtenRows,
      rows,
      message: writeToSheet ? 'Sync completed and rows were sent to BASE_CRM.' : 'Sync completed in preview mode.'
    });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message });
  }
}
