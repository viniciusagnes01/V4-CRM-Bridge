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
  '370523': 'Lead Perdido',
  '373592': 'Lead Perdido',
  '373593': 'Lead Perdido',
  '373594': 'Oportunidade',
  '373595': 'Qualificação',
  '373596': 'Compra'
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
  if (typeof value === 'object') return asText(value.name || value.title || value.label || value.description || value.value || value.id || '');
  return '';
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function stageIdFromDeal(deal) {
  return String(readPath(deal, 'stage.id') || readPath(deal, 'stageId') || readPath(deal, 'stage_id') || '');
}

function stageNameFromDeal(deal) {
  return asText(readPath(deal, 'stage.name')) || asText(readPath(deal, 'stage.title')) || asText(readPath(deal, 'stage.label')) || asText(readPath(deal, 'stage')) || '';
}

function pipelineIdFromDeal(deal) {
  return asText(readPath(deal, 'pipeline.id')) || asText(readPath(deal, 'pipelineId')) || asText(readPath(deal, 'pipeline_id')) || asText(readPath(deal, 'funnel.id')) || asText(readPath(deal, 'funnelId')) || asText(readPath(deal, 'funnel_id')) || asText(readPath(deal, 'board.id')) || asText(readPath(deal, 'boardId')) || '';
}

function pipelineNameFromDeal(deal) {
  return asText(readPath(deal, 'pipeline.name')) || asText(readPath(deal, 'pipeline.title')) || asText(readPath(deal, 'funnel.name')) || asText(readPath(deal, 'funnel.title')) || asText(readPath(deal, 'board.name')) || asText(readPath(deal, 'board.title')) || '';
}

function statusFromDeal(deal) {
  return asText(deal.status || readPath(deal, 'status.name') || readPath(deal, 'status.label') || '');
}

function dealName(deal) {
  return asText(deal.name || deal.title || deal.dealName || deal.id || '');
}

function groupKey(parts) {
  return parts.map(part => String(part || '')).join('||');
}

function addGroup(store, key, base, deal) {
  if (!store[key]) {
    store[key] = {
      ...base,
      count: 0,
      examples: []
    };
  }

  store[key].count += 1;
  if (store[key].examples.length < 5) {
    store[key].examples.push({
      id: deal.id || '',
      name: dealName(deal),
      status: statusFromDeal(deal),
      stageId: stageIdFromDeal(deal),
      stageName: stageNameFromDeal(deal),
      pipelineId: pipelineIdFromDeal(deal),
      pipelineName: pipelineNameFromDeal(deal)
    });
  }
}

async function requestMoskit(url, accessKey, retries = 2) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await wait([1200, 3000, 6000][attempt - 1] || 6000);
    else await wait(250);

    const headers = { Accept: 'application/json' };
    headers['api' + 'key'] = accessKey;

    const response = await fetch(url, { method: 'GET', headers });
    const body = await response.text();

    if (response.ok) {
      const json = body ? JSON.parse(body) : [];
      return {
        ok: true,
        status: response.status,
        bodyType: Array.isArray(json) ? 'array' : typeof json,
        keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : [],
        list: listFromResponse(json)
      };
    }

    last = { ok: false, status: response.status, body: body.slice(0, 500), list: [] };
    if (response.status !== 429) return last;
  }
  return last;
}

async function moskitDebug(req) {
  const accessKey = process.env['MOSKIT' + '_ACCESS_KEY'];
  if (!accessKey) return { ok: false, message: 'MOSKIT_ACCESS_KEY missing' };

  const base = (process.env['MOSKIT' + '_BASE_URL'] || 'https://api.moskitcrm.com/v2').replace(/\/$/, '');
  const quantity = Number(req.query.quantity || 50);
  const maxRecords = Number(req.query.max || (req.query.full ? 5000 : 250));
  const pages = [];
  const stageGroups = {};
  const statusGroups = {};
  const pipelineGroups = {};
  const comboGroups = {};
  const unmappedGroups = {};
  let total = 0;
  let mappedByStage = 0;
  let withoutPipelineInfo = 0;
  let v4TrafficByPipelineName = 0;
  let lastError = null;

  for (let start = 0; start < maxRecords; start += quantity) {
    const url = `${base}/deals?quantity=${quantity}&start=${start}`;
    const result = await requestMoskit(url, accessKey, 2);
    const list = result.list || [];

    pages.push({
      start,
      quantity,
      ok: result.ok,
      status: result.status,
      received: list.length,
      bodyType: result.bodyType,
      keys: result.keys,
      errorBody: result.ok ? undefined : result.body
    });

    if (!result.ok) {
      lastError = { start, status: result.status, body: result.body };
      if (total > 0 && result.status === 429) break;
      break;
    }

    if (!list.length) break;
    total += list.length;

    list.forEach(deal => {
      const stageId = stageIdFromDeal(deal);
      const stageName = stageNameFromDeal(deal) || stageId;
      const status = statusFromDeal(deal) || 'NO_STATUS';
      const pipelineId = pipelineIdFromDeal(deal);
      const pipelineName = pipelineNameFromDeal(deal);
      const mappedAs = STAGE_MAP_V4_TRAFEGO[stageId] || null;
      const normalizedPipeline = normalizeText(pipelineName);
      const hasPipelineInfo = Boolean(pipelineId || pipelineName);
      const isV4TrafficName = normalizedPipeline.includes('v4') && normalizedPipeline.includes('trafego');

      if (mappedAs) mappedByStage += 1;
      if (!hasPipelineInfo) withoutPipelineInfo += 1;
      if (isV4TrafficName) v4TrafficByPipelineName += 1;

      addGroup(stageGroups, groupKey([stageId]), { stageId, stageName, mappedAs }, deal);
      addGroup(statusGroups, groupKey([status]), { status }, deal);
      addGroup(pipelineGroups, groupKey([pipelineId, pipelineName || 'NO_PIPELINE']), { pipelineId, pipelineName: pipelineName || 'NO_PIPELINE' }, deal);
      addGroup(comboGroups, groupKey([pipelineId, pipelineName || 'NO_PIPELINE', status, stageId]), {
        pipelineId,
        pipelineName: pipelineName || 'NO_PIPELINE',
        status,
        stageId,
        stageName,
        mappedAs
      }, deal);
      if (!mappedAs) {
        addGroup(unmappedGroups, groupKey([stageId, status, pipelineId, pipelineName || 'NO_PIPELINE']), {
          stageId,
          stageName,
          status,
          pipelineId,
          pipelineName: pipelineName || 'NO_PIPELINE'
        }, deal);
      }
    });

    if (list.length < quantity) break;
  }

  function sortedValues(obj, limit = 80) {
    return Object.values(obj).sort((a, b) => b.count - a.count).slice(0, limit);
  }

  return {
    ok: true,
    debug: 'moskit-aggregate',
    base,
    maxRecords,
    checkedPages: pages.length,
    checkedTotal: total,
    mappedByStage,
    withoutPipelineInfo,
    v4TrafficByPipelineName,
    mappedStageIds: Object.keys(STAGE_MAP_V4_TRAFEGO),
    counts: {
      byStage: sortedValues(stageGroups),
      byStatus: sortedValues(statusGroups),
      byPipeline: sortedValues(pipelineGroups),
      byPipelineStatusStage: sortedValues(comboGroups, 120),
      unmapped: sortedValues(unmappedGroups, 80)
    },
    pages,
    lastError
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
    version: 'health-moskit-aggregate-diagnostics-20260530',
    timestamp: new Date().toISOString()
  });
}
