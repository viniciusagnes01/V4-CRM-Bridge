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
  const privateKey = rawKey.replace(/\n/g, '\n');
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

export function recordToBaseCrmObject(record, stages = {}) {
  const source = normalizeSource(record.source);
  const stageValues = [record.stage, record.stageId].filter(Boolean);
  const flags = record.baseCrmFlags || {};
  return {
    data: record.date || new Date().toISOString(),
    leadId: record.id || '',
    nome: record.name || '',
    nomeDaEmpresa: record.companyName || '',
    valor: Number(record.value || 0),
    lead: Number(flags.lead ?? stageFlag(stageValues, stages.lead || 'lead')),
    mql: Number(flags.mql ?? stageFlag(stageValues, stages.mql || 'mql')),
    sql: Number(flags.sql ?? stageFlag(stageValues, stages.sql || 'sql')),
    oportunidade: Number(flags.opportunity ?? stageFlag(stageValues, stages.opportunity || 'oportunidade')),
    compra: Number(flags.won ?? stageFlag(stageValues, stages.won || 'compra')),
    leadPerdido: Number(flags.lost ?? stageFlag(stageValues, stages.lost || 'perdido')),
    metaAds: Number(record.sourceMeta ?? source.meta),
    googleAds: Number(record.sourceGoogle ?? source.google),
    responsavel: record.owner || '',
    motivoDePerda: record.lossReason || ''
  };
}

export function headerKey(header) {
  const key = normalizeText(header).replace(/[^a-z0-9]/g, '');
  const aliases = {
    data: 'data',
    leadid: 'leadId',
    idlead: 'leadId',
    id: 'leadId',
    nome: 'nome',
    nomedaempresa: 'nomeDaEmpresa',
    empresa: 'nomeDaEmpresa',
    valor: 'valor',
    lead: 'lead',
    mql: 'mql',
    sql: 'sql',
    oportunidade: 'oportunidade',
    compra: 'compra',
    leadperdido: 'leadPerdido',
    perdido: 'leadPerdido',
    metaads: 'metaAds',
    googleads: 'googleAds',
    responsavel: 'responsavel',
    responsavelcomercial: 'responsavel',
    motivodeperda: 'motivoDePerda',
    perda: 'motivoDePerda'
  };
  return aliases[key] || key;
}

export function toBaseCrmRow(record, stages = {}, headers = null) {
  const object = recordToBaseCrmObject(record, stages);
  if (Array.isArray(headers) && headers.length) {
    return headers.map(header => object[headerKey(header)] ?? '');
  }
  return [
    object.data,
    object.leadId,
    object.nome,
    object.nomeDaEmpresa,
    object.valor,
    object.lead,
    object.mql,
    object.sql,
    object.oportunidade,
    object.compra,
    object.leadPerdido,
    object.metaAds,
    object.googleAds,
    object.responsavel,
    object.motivoDePerda
  ];
}
