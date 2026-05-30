import { google } from 'googleapis';
import { fetchKommoLeads } from './_kommo.js';
import { fetchMoskitDeals } from './_moskit.js';
import { extractSheetId, getGoogleAuth, readJson, send, toBaseCrmRow } from './_utils.js';

function sampleRecords() {
  return [
    { id: 'demo-001', name: 'Lead Demo', value: 0, stage: 'lead', source: 'meta', owner: 'Account V4' },
    { id: 'demo-002', name: 'Oportunidade Demo', value: 1500, stage: 'oportunidade', source: 'google', owner: 'Account V4' },
    { id: 'demo-003', name: 'Compra Demo', value: 2500, stage: 'compra', source: 'google', owner: 'Account V4' }
  ];
}

async function getRecords({ integration, limit }) {
  const crm = String(integration.crm || 'mock').toLowerCase();

  if (crm === 'kommo') {
    const alias = integration.credentialAlias || integration.tokenAlias || '';
    const key = alias ? process.env[alias] : process.env.KOMMO_ACCESS_KEY;
    return fetchKommoLeads({ baseUrl: integration.baseUrl, accessKey: key, limit });
  }

  if (crm === 'moskit') {
    const alias = integration.credentialAlias || integration.tokenAlias || '';
    const key = alias ? process.env[alias] : process.env.MOSKIT_ACCESS_KEY;
    return fetchMoskitDeals({ baseUrl: integration.baseUrl, accessKey: key, limit });
  }

  return sampleRecords();
}

function buildLeadIndex(values) {
  const index = new Map();
  values.slice(1).forEach((row, offset) => {
    const leadId = String(row[1] || '').trim();
    if (leadId) index.set(leadId, offset + 2);
  });
  return index;
}

async function writeRows({ growthpackUrl, tabName, rows, mode = 'upsert' }) {
  const sheetId = extractSheetId(growthpackUrl);
  if (!sheetId) throw new Error('Missing GrowthPack URL or Sheet ID');

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${tabName || 'BASE_CRM'}!A:O`;

  if (mode !== 'upsert') {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });
    return { appendedRows: result.data.updates?.updatedRows || rows.length, updatedRows: 0 };
  }

  const current = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = current.data.values || [];
  const leadIndex = buildLeadIndex(values);

  const updates = [];
  const inserts = [];

  rows.forEach(row => {
    const leadId = String(row[1] || '').trim();
    const targetRow = leadIndex.get(leadId);
    if (targetRow) {
      updates.push({ range: `${tabName || 'BASE_CRM'}!A${targetRow}:O${targetRow}`, values: [row] });
    } else {
      inserts.push(row);
    }
  });

  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });
  }

  if (inserts.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: inserts }
    });
  }

  return { appendedRows: inserts.length, updatedRows: updates.length };
}

function safePreviewRecord(record) {
  return {
    id: record.id || '',
    name: record.name || '',
    companyName: record.companyName || '',
    value: record.value || 0,
    stage: record.stage || '',
    stageId: record.stageId || '',
    owner: record.owner || '',
    source: record.source || '',
    lossReason: record.lossReason || '',
    diagnostics: record._diagnostics || null
  };
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
    const writeMode = body.writeMode || 'upsert';
    const includeDiagnostics = Boolean(body.includeDiagnostics) && !writeToSheet;

    const records = await getRecords({ integration, limit });
    const rows = records.map(record => toBaseCrmRow(record, stages));

    let writeResult = { appendedRows: 0, updatedRows: 0 };
    if (writeToSheet) {
      writeResult = await writeRows({ growthpackUrl: client.growthpackUrl, tabName: client.crmTab || 'BASE_CRM', rows, mode: writeMode });
    }

    return send(res, 200, {
      ok: true,
      client: client.name || 'Cliente sem nome',
      crm: integration.crm || 'mock',
      records: records.length,
      writtenRows: writeResult.appendedRows + writeResult.updatedRows,
      appendedRows: writeResult.appendedRows,
      updatedRows: writeResult.updatedRows,
      writeMode,
      rows,
      previewRecords: includeDiagnostics ? records.slice(0, 5).map(safePreviewRecord) : undefined,
      message: writeToSheet ? 'Sync completed and rows were upserted into BASE_CRM.' : 'Sync completed in preview mode.'
    });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message });
  }
}
