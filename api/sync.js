import { google } from 'googleapis';
import { fetchKommoLeads } from './_kommo.js';
import { fetchMoskitDeals } from './_moskit.js';
import { fetchHubSpotDeals } from './_hubspot.js';
import { fetchPipeDriveDeals } from './_pipedrive.js';
import { supabaseFetch } from './_supabase.js';
import { extractSheetId, getGoogleAuth, readJson, send, toBaseCrmRow, headerKey } from './_utils.js';

function envValue(integration, fallbackNames = []) {
  const runtimeValue = integration.pv || '';
  if (runtimeValue) return runtimeValue;
  const alias = integration.credentialAlias || integration.tokenAlias || '';
  if (alias && process.env[alias]) return process.env[alias];
  for (const name of fallbackNames) {
    if (process.env[name]) return process.env[name];
  }
  return '';
}

async function hydrateIntegration(input) {
  if (!input?.id) return input || {};
  try {
    const rows = await supabaseFetch(`v4_integrations?id=eq.${encodeURIComponent(input.id)}&select=*`);
    const row = rows?.[0];
    if (!row) return input;
    return {
      ...input,
      crm: input.crm || row.crm,
      baseUrl: input.baseUrl || row.base_url || '',
      pipelineId: input.pipelineId || row.pipeline || '',
      pv: input.pv || row['private' + '_value'] || ''
    };
  } catch {
    return input;
  }
}

async function getRecords({ integration, limit }) {
  const full = await hydrateIntegration(integration || {});
  const crm = String(full.crm || '').toLowerCase().replace(/\s+/g, '');

  if (crm === 'kommo') {
    const key = envValue(full, ['KOMMO_ACCESS_TOKEN', 'KOMMO_ACCESS_KEY']);
    return fetchKommoLeads({ baseUrl: full.baseUrl, accessKey: key, limit, pipelineId: full.pipelineId });
  }

  if (crm === 'moskit') {
    const key = envValue(full, ['MOSKIT_ACCESS_KEY']);
    return fetchMoskitDeals({ baseUrl: full.baseUrl, accessKey: key, limit, pipelineId: full.pipelineId });
  }

  if (crm === 'hubspot') {
    const key = envValue(full, ['HUBSPOT_ACCESS_TOKEN']);
    return fetchHubSpotDeals({ accessKey: key, limit, pipelineId: full.pipelineId });
  }

  if (crm === 'pipedrive') {
    const key = envValue(full, ['PIPEDRIVE_API_TOKEN']);
    return fetchPipeDriveDeals({ baseUrl: full.baseUrl, accessKey: key, limit, pipelineId: full.pipelineId });
  }

  throw new Error(`Unsupported CRM for real sync: ${full.crm || 'empty'}`);
}

function colName(index) {
  let out = '';
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function buildLeadIndex(values, headers) {
  const leadIdIndex = Math.max(0, headers.findIndex(header => headerKey(header) === 'leadId'));
  const index = new Map();
  values.slice(1).forEach((row, offset) => {
    const leadId = String(row[leadIdIndex] || '').trim();
    if (leadId) index.set(leadId, offset + 2);
  });
  return index;
}

async function readHeaders(sheets, sheetId, tab) {
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${tab}!1:1` });
  const headers = (result.data.values || [])[0] || [];
  if (!headers.length) throw new Error(`Aba ${tab} sem cabecalho na linha 1.`);
  if (!headers.some(header => headerKey(header) === 'leadId')) throw new Error(`Aba ${tab} precisa ter coluna Lead ID para atualizar registros.`);
  return headers;
}

async function writeRows({ growthpackUrl, tabName, records, stages, mode = 'upsert' }) {
  const sheetId = extractSheetId(growthpackUrl);
  if (!sheetId) throw new Error('Missing GrowthPack URL or Sheet ID');

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const targetTab = tabName || 'BASE_CRM';
  const headers = await readHeaders(sheets, sheetId, targetTab);
  const lastCol = colName(headers.length - 1);
  const range = `${targetTab}!A:${lastCol}`;
  const valueInputOption = 'RAW';
  const rows = records.map(record => toBaseCrmRow(record, stages, headers));

  if (mode === 'rebuild') {
    await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `${targetTab}!A2:${lastCol}50000` });
    const batches = chunk(rows, 400);
    for (let index = 0; index < batches.length; index++) {
      const batch = batches[index];
      const startRow = 2 + index * 400;
      const endRow = startRow + batch.length - 1;
      await sheets.spreadsheets.values.update({ spreadsheetId: sheetId, range: `${targetTab}!A${startRow}:${lastCol}${endRow}`, valueInputOption, requestBody: { values: batch } });
    }
    return { appendedRows: rows.length, updatedRows: 0, clearedRows: true, headers };
  }

  const current = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = current.data.values || [];
  const leadIndex = buildLeadIndex(values, headers);
  const idIndex = Math.max(0, headers.findIndex(header => headerKey(header) === 'leadId'));
  const updates = [];
  const inserts = [];

  rows.forEach(row => {
    const leadId = String(row[idIndex] || '').trim();
    const targetRow = leadIndex.get(leadId);
    if (targetRow) updates.push({ range: `${targetTab}!A${targetRow}:${lastCol}${targetRow}`, values: [row] });
    else inserts.push(row);
  });

  for (const batch of chunk(updates, 300)) {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: sheetId, requestBody: { valueInputOption, data: batch } });
  }

  for (const batch of chunk(inserts, 400)) {
    await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range, valueInputOption, insertDataOption: 'INSERT_ROWS', requestBody: { values: batch } });
  }

  return { appendedRows: inserts.length, updatedRows: updates.length, clearedRows: false, headers };
}

function safePreviewRecord(record) {
  return { id: record.id || '', name: record.name || '', companyName: record.companyName || '', value: record.value || 0, stage: record.stage || '', stageId: record.stageId || '', owner: record.owner || '', source: record.source || '', lossReason: record.lossReason || '', diagnostics: record._diagnostics || null };
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
    const previewRows = records.map(record => toBaseCrmRow(record, stages));

    let writeResult = { appendedRows: 0, updatedRows: 0, clearedRows: false, headers: [] };
    if (writeToSheet) writeResult = await writeRows({ growthpackUrl: client.growthpackUrl, tabName: targetTab, records, stages, mode: writeMode });

    return send(res, 200, { ok: true, client: client.name || 'Cliente sem nome', crm: integration.crm || '', destino: targetTab, records: records.length, writtenRows: writeResult.appendedRows + writeResult.updatedRows, appendedRows: writeResult.appendedRows, updatedRows: writeResult.updatedRows, clearedRows: Boolean(writeResult.clearedRows), headersUsed: writeResult.headers, writeMode, requestedMode, rows: writeToSheet ? undefined : previewRows.slice(0, 100), previewRowsReturned: writeToSheet ? 0 : Math.min(previewRows.length, 100), previewRecords: includeDiagnostics ? records.slice(0, 5).map(safePreviewRecord) : undefined, message: writeToSheet ? (writeMode === 'rebuild' ? 'Sync completed and target tab was rebuilt.' : 'Sync completed and rows were upserted into BASE_CRM.') : 'Sync completed in preview mode.' });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
}
