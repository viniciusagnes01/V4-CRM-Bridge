import { google } from 'googleapis';

export function send(res, status, payload) {
  res.status(status).json(payload);
}

export function readJson(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error('Missing environment variable: ' + name);
  return value;
}

export function getGoogleAuth() {
  const email = requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const rawKey = requiredEnv('GOOGLE_PRIVATE_KEY');
  const privateKey = rawKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

export function extractSheetId(urlOrId) {
  if (!urlOrId) return '';
  const match = String(urlOrId).match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : String(urlOrId).trim();
}

export function normalizeSource(source) {
  const text = String(source || '').toLowerCase();
  return {
    meta: Number(text.includes('meta') || text.includes('facebook') || text.includes('instagram') || text.includes('fb')),
    google: Number(text.includes('google') || text.includes('gads') || text.includes('cpc') || text.includes('search') || text.includes('youtube'))
  };
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function stageFlag(stageValues, target) {
  if (!stageValues || !target) return 0;
  const currents = Array.isArray(stageValues) ? stageValues : [stageValues];
  const targets = Array.isArray(target) ? target : String(target).split('|');
  return currents.some(current => targets.some(item => normalizeText(item) === normalizeText(current))) ? 1 : 0;
}

export function toBaseCrmRow(record, stages = {}) {
  const source = normalizeSource(record.source);
  const stageValues = [record.stage, record.stageId].filter(Boolean);
  const flags = record.baseCrmFlags || {};

  return [
    record.date || new Date().toISOString(),
    record.id || '',
    record.name || '',
    record.companyName || '',
    Number(record.value || 0),
    Number(flags.lead ?? stageFlag(stageValues, stages.lead || 'lead')),
    Number(flags.mql ?? stageFlag(stageValues, stages.mql || 'mql')),
    Number(flags.sql ?? stageFlag(stageValues, stages.sql || 'sql')),
    Number(flags.opportunity ?? stageFlag(stageValues, stages.opportunity || 'oportunidade')),
    Number(flags.won ?? stageFlag(stageValues, stages.won || 'compra')),
    Number(flags.lost ?? stageFlag(stageValues, stages.lost || 'perdido')),
    Number(record.sourceMeta ?? source.meta),
    Number(record.sourceGoogle ?? source.google),
    record.owner || '',
    record.lossReason || ''
  ];
}
