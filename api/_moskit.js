const STAGE_MAP_V4_TRAFEGO = {
  '370298': { name: 'Novo Lead', rank: 1, won: false, lost: false },
  '370300': { name: 'Primeiro Contato', rank: 2, won: false, lost: false },
  '370299': { name: 'Qualificação', rank: 2, won: false, lost: false },
  '370301': { name: 'Apresentação/agendamento de reunião', rank: 3, won: false, lost: false },
  '372772': { name: 'Envio de Proposta', rank: 4, won: false, lost: false },
  '372773': { name: 'Reunião de Alinhamento', rank: 4, won: false, lost: false },
  '458934': { name: 'Compra', rank: 5, won: true, lost: false },
  '458935': { name: 'Lead Perdido', rank: 1, won: false, lost: true },
  '370524': { name: 'Lead Perdido', rank: 1, won: false, lost: true },
  '373595': { name: 'Qualificação', rank: 2, won: false, lost: false }
};

function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

function asText(value, allowId = false) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => asText(item, allowId)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return asText(value.name || value.nome || value.fullName || value.full_name || value.title || value.label || value.value || value.description || value.reason || value.text || value.email || (allowId ? value.id : '') || '', allowId);
  }
  return '';
}

function pickText(obj, paths, fallback = '', allowId = false) {
  for (const path of paths) {
    const text = asText(readPath(obj, path), allowId);
    if (text) return text;
  }
  return fallback;
}

function pickNumber(obj, paths, fallback = 0) {
  for (const path of paths) {
    const value = readPath(obj, path);
    if (value !== undefined && value !== null && value !== '') {
      const number = Number(value);
      if (!Number.isNaN(number)) return number;
    }
  }
  return fallback;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function containsAny(text, terms) {
  const normalized = normalizeText(text);
  return terms.some(term => normalized.includes(normalizeText(term)));
}

function firstId(value) {
  if (!value) return '';
  if (Array.isArray(value) && value.length) return firstId(value[0]);
  if (typeof value === 'object' && value.id) return value.id;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return '';
}

function formatDate(value) {
  const fallback = new Date();
  const date = value ? new Date(value) : fallback;

  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  const text = String(value || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  return text;
}

function listFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return data.items || data.data || data.deals || data.results || data.content || data.users || data.reasons || data.lostReasons || data.lossReasons || [];
}

function buildIdNameMap(items) {
  const map = {};
  (items || []).forEach(item => {
    const id = pickText(item, ['id', '_id', 'uuid', 'userId', 'responsibleId', 'reasonId'], '', true);
    const name = asText(item, false);
    if (id && name) map[String(id)] = name;
  });
  return map;
}

function mapId(value, map) {
  const key = String(value || '').trim();
  if (!key) return '';
  return map && map[key] ? map[key] : key;
}

function uniqueById(items) {
  const seen = new Set();
  const unique = [];
  (items || []).forEach(item => {
    const id = String(item && item.id ? item.id : '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    unique.push(item);
  });
  return unique;
}

function collectReferenceIds(deals) {
  const ids = { users: {}, companies: {}, contacts: {}, lostReasons: {} };

  function add(bucket, value) {
    const id = firstId(value);
    if (id) bucket[String(id)] = true;
  }

  function addList(bucket, value) {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(item => add(bucket, item));
    add(bucket, value);
  }

  deals.forEach(deal => {
    add(ids.users, readPath(deal, 'responsible.id'));
    add(ids.users, deal.responsible);
    add(ids.users, readPath(deal, 'owner.id'));
    add(ids.users, deal.owner);

    add(ids.lostReasons, readPath(deal, 'lostReason.id'));
    add(ids.lostReasons, deal.lostReason);
    add(ids.lostReasons, readPath(deal, 'lossReason.id'));
    add(ids.lostReasons, deal.lossReason);

    addList(ids.companies, deal.companies);
    addList(ids.companies, deal.company);
    addList(ids.companies, deal.organization);
    addList(ids.companies, deal.account);

    addList(ids.contacts, deal.contacts);
    addList(ids.contacts, deal.contactParticipants);
    addList(ids.contacts, deal.contact);
    addList(ids.contacts, deal.person);
  });

  return ids;
}

function stageDiagnostics(raw) {
  const candidates = ['stage', 'stage.id', 'stage.name', 'stageId', 'stage_id', 'stageName', 'status', 'status.id', 'status.name', 'statusId'];
  return candidates.map(path => ({ path, value: asText(readPath(raw, path), true) })).filter(item => item.value);
}

function lossReasonDiagnostics(raw) {
  const candidates = ['lostReason', 'lostReason.id', 'lostReason.name', 'lostReason.description', 'lossReason', 'lossReason.id', 'lossReason.name', 'lostReasonId', 'lossReasonId'];
  return candidates.map(path => ({ path, value: asText(readPath(raw, path), true) })).filter(item => item.value);
}

function normalizeDeal(raw, context = {}) {
  const leadId = pickText(raw, ['id', 'dealId', 'uuid', 'externalId'], '', true);
  const dealName = pickText(raw, ['name', 'title', 'dealName'], leadId ? `Lead #${leadId}` : 'Negocio sem nome');
  const stageId = String(pickText(raw, ['stage.id', 'stageId', 'stage_id'], '', true));
  const stageInfo = STAGE_MAP_V4_TRAFEGO[stageId] || { name: stageId, rank: 1, won: false, lost: false };
  const rank = Number(stageInfo.rank || 1);
  const status = normalizeText(pickText(raw, ['status', 'status.name']));

  const contactId = firstId(raw.contacts) || firstId(raw.contactParticipants) || firstId(raw.contact) || firstId(raw.person);
  const companyId = firstId(raw.companies) || firstId(raw.company) || firstId(raw.organization) || firstId(raw.account);

  const personName = pickText(raw, ['contact.name', 'person.name', 'customer.name', 'lead.name']) || mapId(contactId, context.contacts) || '';
  const companyName = pickText(raw, ['company.name', 'organization.name', 'account.name']) || mapId(companyId, context.companies) || dealName;

  const ownerId = String(pickText(raw, ['responsible.id', 'owner.id', 'user.id', 'responsibleUser.id'], '', true) || pickText(raw, ['responsible', 'owner'], '', true));
  const owner = pickText(raw, ['responsible.name', 'owner.name', 'user.name', 'responsibleUser.name']) || mapId(ownerId, context.users);

  const lostReasonId = String(pickText(raw, ['lostReason.id', 'lossReason.id'], '', true) || pickText(raw, ['lostReason', 'lossReason'], '', true));
  const isLost = stageInfo.lost === true || status === 'lost' || status === 'perdido' || Boolean(lostReasonId);
  const lossReason = isLost ? (pickText(raw, ['lostReason.name', 'lossReason.name']) || mapId(lostReasonId, context.lostReasons)) : '';

  const sourceText = [raw.source || '', raw.origin || '', dealName || '', JSON.stringify(raw.entityCustomFields || [])].join(' | ');
  const isWon = stageInfo.won === true || status === 'won' || status === 'ganho' || status === 'ganha' || status === 'vendido' || status === 'vendida' || rank >= 5;

  return {
    id: leadId,
    name: personName || dealName,
    companyName,
    value: pickNumber(raw, ['price', 'value', 'amount', 'dealValue'], 0),
    stage: stageInfo.name,
    stageId,
    date: formatDate(pickText(raw, ['dateCreated', 'createdAt', 'created_at', 'createdDate'])),
    owner,
    source: sourceText,
    sourceMeta: containsAny(sourceText, ['meta', 'facebook', 'fb', 'instagram', 'ig']) ? 1 : 0,
    sourceGoogle: containsAny(sourceText, ['google', 'gads', 'search', 'youtube']) ? 1 : 0,
    lossReason,
    baseCrmFlags: {
      lead: 1,
      mql: rank >= 2 ? 1 : 0,
      sql: rank >= 3 ? 1 : 0,
      opportunity: rank >= 4 ? 1 : 0,
      won: isWon ? 1 : 0,
      lost: isLost ? 1 : 0
    },
    _diagnostics: {
      stageCandidates: stageDiagnostics(raw),
      lossReasonCandidates: lossReasonDiagnostics(raw),
      contactId,
      companyId,
      ownerId,
      lostReasonId
    }
  };
}

async function requestMoskit({ url, accessKey }) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      apikey: accessKey,
      'X-API-KEY': accessKey,
      Authorization: `Bearer ${accessKey}`
    }
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Moskit API error ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : [];
}

async function tryRequestMoskit(args) {
  try {
    return await requestMoskit(args);
  } catch {
    return null;
  }
}

async function fetchCatalogMap({ base, accessKey, listEndpoints, byIdEndpoints, ids }) {
  const map = {};

  for (const endpoint of listEndpoints) {
    let start = 0;
    let previous = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      const sep = endpoint.includes('?') ? '&' : '?';
      const data = await tryRequestMoskit({ url: `${base}${endpoint}${sep}quantity=100&start=${start}`, accessKey });
      const list = listFromResponse(data);
      if (!list.length) break;
      const signature = list.map(item => item.id || item._id || JSON.stringify(item).slice(0, 80)).join('|');
      if (signature === previous) break;
      previous = signature;
      Object.assign(map, buildIdNameMap(list));
      if (list.length < 100) break;
      start += 100;
    }
  }

  for (const id of ids || []) {
    if (!id || map[String(id)]) continue;
    for (const template of byIdEndpoints) {
      const data = await tryRequestMoskit({ url: `${base}${template.replace('{id}', encodeURIComponent(String(id)))}`, accessKey });
      const name = asText(data && (data.data || data.item || data.result || data), false);
      if (name) {
        map[String(id)] = name;
        break;
      }
    }
  }

  return map;
}

async function fetchAllDeals({ base, accessKey, limit }) {
  const all = [];
  const quantity = 50;
  let start = 0;
  let previous = '';
  const max = Number(limit || 2000);

  for (let attempt = 0; attempt < 500 && all.length < max; attempt++) {
    const data = await requestMoskit({ url: `${base}/deals?quantity=${quantity}&start=${start}`, accessKey });
    const deals = listFromResponse(data);
    if (!deals.length) break;

    const signature = deals.map(deal => deal.id).join('|');
    if (signature === previous) break;
    previous = signature;

    deals.forEach(deal => all.push(deal));
    if (deals.length < quantity) break;
    start += quantity;
  }

  return uniqueById(all).slice(0, max);
}

export async function fetchMoskitDeals({ accessKey, limit = 2000, baseUrl }) {
  if (!accessKey) throw new Error('Moskit credential is required');

  const base = (baseUrl || 'https://api.moskitcrm.com/v2').replace(/\/$/, '');
  const allDeals = await fetchAllDeals({ base, accessKey, limit });
  const stageIds = Object.keys(STAGE_MAP_V4_TRAFEGO);
  const filtered = allDeals.filter(deal => stageIds.includes(String(readPath(deal, 'stage.id') || '')));

  const ids = collectReferenceIds(filtered);
  const users = await fetchCatalogMap({ base, accessKey, listEndpoints: ['/users'], byIdEndpoints: ['/users/{id}'], ids: Object.keys(ids.users) });
  const companies = await fetchCatalogMap({ base, accessKey, listEndpoints: ['/companies'], byIdEndpoints: ['/companies/{id}'], ids: Object.keys(ids.companies) });
  const contacts = await fetchCatalogMap({ base, accessKey, listEndpoints: ['/contacts'], byIdEndpoints: ['/contacts/{id}'], ids: Object.keys(ids.contacts) });
  const lostReasons = await fetchCatalogMap({ base, accessKey, listEndpoints: ['/lostReasons', '/lossReasons', '/dealLostReasons', '/dealLossReasons'], byIdEndpoints: ['/lostReasons/{id}', '/lossReasons/{id}', '/dealLostReasons/{id}', '/dealLossReasons/{id}'], ids: Object.keys(ids.lostReasons) });

  return filtered.map(deal => normalizeDeal(deal, { users, companies, contacts, lostReasons }));
}
