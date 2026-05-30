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

function asText(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
  if (typeof value === 'object') return asText(value.name || value.title || value.label || value.description || value.id || '');
  return '';
}

function stageNameFromDeal(deal) {
  return asText(readPath(deal, 'stage.name')) || asText(readPath(deal, 'stage.title')) || asText(readPath(deal, 'stage.label')) || asText(readPath(deal, 'stage')) || '';
}

function dealName(deal) {
  return asText(deal.name || deal.title || deal.dealName || deal.id || '');
}

async function requestMoskit(url, accessKey) {
  const headers = { Accept: 'application/json' };
  headers['api' + 'key'] = accessKey;

  const response = await fetch(url, { method: 'GET', headers });
  const body = await response.text();

  if (!response.ok) {
    return { ok: false, status: response.status, body: body.slice(0, 500), list: [] };
  }

  const json = body ? JSON.parse(body) : [];
  return {
    ok: true,
    status: response.status,
    bodyType: Array.isArray(json) ? 'array' : typeof json,
    keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : [],
    list: listFromResponse(json)
  };
}

async function moskitDebug(req) {
  const accessKey = process.env['MOSKIT' + '_ACCESS_KEY'];
  if (!accessKey) return { ok: false, message: 'MOSKIT_ACCESS_KEY missing' };

  const base = (process.env['MOSKIT' + '_BASE_URL'] || 'https://api.moskitcrm.com/v2').replace(/\/$/, '');
  const quantity = Number(req.query.quantity || 50);
  const starts = [0, quantity, quantity * 2, quantity * 3];
  const pages = [];
  const stages = {};
  let total = 0;
  let filtered = 0;

  for (const start of starts) {
    const url = `${base}/deals?quantity=${quantity}&start=${start}`;
    const result = await requestMoskit(url, accessKey);
    const list = result.list || [];
    total += list.length;

    list.forEach(deal => {
      const stageId = String(readPath(deal, 'stage.id') || '');
      if (!stageId) return;

      if (!stages[stageId]) {
        stages[stageId] = {
          stageId,
          stageName: stageNameFromDeal(deal),
          count: 0,
          mappedAs: STAGE_MAP_V4_TRAFEGO[stageId] || null,
          examples: []
        };
      }

      stages[stageId].count += 1;
      if (!stages[stageId].stageName) stages[stageId].stageName = stageNameFromDeal(deal);
      if (stages[stageId].examples.length < 3) {
        stages[stageId].examples.push({
          id: deal.id || '',
          name: dealName(deal),
          status: asText(deal.status || ''),
          price: deal.price || deal.value || deal.amount || 0
        });
      }

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
      firstStages: list.slice(0, 10).map(item => ({
        id: String(readPath(item, 'stage.id') || ''),
        name: stageNameFromDeal(item)
      })),
      errorBody: result.ok ? undefined : result.body
    });
  }

  const stageSummary = Object.values(stages)
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);

  const unmappedStages = stageSummary.filter(stage => !stage.mappedAs);

  return {
    ok: true,
    debug: 'moskit',
    base,
    checkedPages: pages.length,
    checkedTotal: total,
    matchedV4TrafficStages: filtered,
    unmappedCount: unmappedStages.reduce((sum, stage) => sum + stage.count, 0),
    mappedStageIds: Object.keys(STAGE_MAP_V4_TRAFEGO),
    unmappedStages,
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
    version: 'health-debug-moskit-stage-names-20260530',
    timestamp: new Date().toISOString()
  });
}
