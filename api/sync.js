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
    return fetchMoskitDeals({ baseUrl: integration.baseUrl, accessKey: key, limit, pipelineId: integration.pipelineId });
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

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function writeRows({ growthpackUrl, tabName, rows, mode = 'upsert' }) {
  const sheetId = extractSheetId(growthpackUrl);
  if (!sheetId) throw new Error('Missing GrowthPack URL or Sheet ID');

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const targetTab = tabName || 'BASE_CRM';
  const range = `${targetTab}!A:O`;
  const valueInputOption = 'RAW';

  if (mode === 'rebuild') {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${targetTab}!A2:O50000`
    });

    const batches = chunk(rows, 400);
    for (let index = 0; index < batches.length; index++) {
      const batch = batches[index];
      const startRow = 2 + index * 400;
      const endRow = startRow + batch.length - 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${targetTab}!A${startRow}:O${endRow}`,
        valueInputOption,
        requestBody: { values: batch }
      });
    }

    return { appendedRows: rows.length, updatedRows: 0, clearedRows: true };
  }

  if (mode !== 'upsert') {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption,
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });
    return { appendedRows: result.data.updates?.updatedRows || rows.length, updatedRows: 0, clearedRows: false };
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
      updates.push({ range: `${targetTab}!A${targetRow}:O${targetRow}`, values: [row] });
    } else {
      inserts.push(row);
    }
  });

  const updateBatches = chunk(updates, 300);
  for (const batch of updateBatches) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption,
        data: batch
      }
    });
  }

  if (inserts.length) {
    const insertBatches = chunk(inserts, 400);
    for (const batch of insertBatches) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range,
        valueInputOption,
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: batch }
      });
    }
  }

  return { appendedRows: inserts.length, updatedRows: updates.length, clearedRows: false };
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
    const targetTab = client.crmTab || 'BASE_CRM';
    const requestedMode = String(body.writeMode || 'upsert').toLowerCase();
    const forceRebuild = Boolean(body.rebuild || body.fullRebuild || body.clearBeforeWrite || body.replaceTarget);
    const writeMode = (requestedMode === 'rebuild' || forceRebuild) ? 'rebuild' : 'upsert';
    const includeDiagnostics = Boolean(body.includeDiagnostics) && !writeToSheet;

    const records = await getRecords({ integration, limit });
    const rows = records.map(record => toBaseCrmRow(record, stages));

    let writeResult = { appendedRows: 0, updatedRows: 0, clearedRows: false };
    if (writeToSheet) {
      writeResult = await writeRows({ growthpackUrl: client.growthpackUrl, tabName: targetTab, rows, mode: writeMode });
    }

    return send(res, 200, {
      ok: true,
      client: client.name || 'Cliente sem nome',
      crm: integration.crm || 'mock',
      destino: targetTab,
      records: records.length,
      writtenRows: writeResult.appendedRows + writeResult.updatedRows,
      appendedRows: writeResult.appendedRows,
      updatedRows: writeResult.updatedRows,
      clearedRows: Boolean(writeResult.clearedRows),
      writeMode,
      requestedMode,
      rows: writeToSheet ? undefined : rows.slice(0, 100),
      previewRowsReturned: writeToSheet ? 0 : Math.min(rows.length, 100),
      previewRecords: includeDiagnostics ? records.slice(0, 5).map(safePreviewRecord) : undefined,
      message: writeToSheet
        ? (writeMode === 'rebuild' ? 'Sync completed and target tab was rebuilt.' : 'Sync completed and rows were upserted into BASE_CRM.')
        : 'Sync completed in preview mode.'
    });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
}
