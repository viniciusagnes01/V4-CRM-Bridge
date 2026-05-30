const STAGE_MAP_V4_TRAFEGO = {
  '370298': 'Novo Lead',
  '370300': 'Primeiro Contato',
  '370299': 'Qualificação',
  '370301': 'Apresentação/agendamento de reunião',
  '372772': 'Envio de Proposta',
  '372773': 'Reunião de Alinhamento',
  '458934': 'Compra',
  '458935': 'Lead Perdido',
  '370524': 'Lead Perdido',
  '373595': 'Qualificação'
};

function listFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return data.items || data.data || data.deals || data.results || data.content || [];
}

function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

async function requestMoskit(url, accessKey) {
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
  if (!response.ok) {
    return { ok: false, status: response.status, body: text.slice(0, 500), list: [] };
  }

  const json = text ? JSON.parse(text) : [];
  return {
    ok: true,
    status: response.status,
    bodyType: Array.isArray(json) ? 'array' : typeof json,
    keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : [],
    list: listFromResponse(json)
  };
}

async function moskitDebug(req) {
  const accessKey = process.env.MOSKIT_ACCESS_KEY;
  if (!accessKey) return { ok: false, message: 'MOSKIT_ACCESS_KEY missing' };

  const base = (process.env.MOSKIT_BASE_URL || 'https://api.moskitcrm.com/v2').replace(/\/$/, '');
  const quantity = Number(req.query.quantity || 50);
  const starts = [0, quantity, quantity * 2, quantity * 3];
  const pages = [];
  const stageCounts = {};
  let total = 0;
  let filtered = 0;

  for (const start of starts) {
    const url = `${base}/deals?quantity=${quantity}&start=${start}`;
    const result = await requestMoskit(url, accessKey);
    const list = result.list || [];
    total += list.length;

    list.forEach(deal => {
      const stageId = String(readPath(deal, 'stage.id') || '');
      if (stageId) stageCounts[stageId] = (stageCounts[stageId] || 0) + 1;
      if (STAGE_MAP_V4_TRAFEGO[stageId]) filtered++;
    });

    pages.push({
      start,
      quantity,
      ok: result.ok,
      status: result.status,
      bodyType: result.bodyType,
      keys: result.keys,
      received: list.length,
      firstIds: list.slice(0, 5).map(item => item.id),
      firstStageIds: list.slice(0, 10).map(item => String(readPath(item, 'stage.id') || '')),
      errorBody: result.ok ? undefined : result.body
    });
  }

  const stageSummary = Object.keys(stageCounts)
    .sort((a, b) => stageCounts[b] - stageCounts[a])
    .slice(0, 30)
    .map(stageId => ({
      stageId,
      count: stageCounts[stageId],
      mappedAs: STAGE_MAP_V4_TRAFEGO[stageId] || null
    }));

  return {
    ok: true,
    debug: 'moskit',
    base,
    checkedPages: pages.length,
    checkedTotal: total,
    matchedV4TrafficStages: filtered,
    mappedStageIds: Object.keys(STAGE_MAP_V4_TRAFEGO),
    stageSummary,
    pages
  };
}

export default async function handler(req, res) {
  if (req.query.debug === 'moskit') {
    const result = await moskitDebug(req);
    return res.status(result.ok ? 200 : 500).json(result);
  }

  res.status(200).json({
    ok: true,
    service: 'v4-crm-bridge',
    runtime: 'vercel',
    version: 'health-debug-moskit-20260530',
    timestamp: new Date().toISOString()
  });
}
