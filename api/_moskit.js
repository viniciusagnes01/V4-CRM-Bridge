function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

function asText(value, allowId = false) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => asText(item, allowId)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return asText(value.name || value.title || value.label || value.value || value.description || value.email || (allowId ? value.id : '') || '', allowId);
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

function formatDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function stageDiagnostics(raw) {
  const candidates = [
    'stage', 'stage.id', 'stage.name',
    'stageId', 'stage_id', 'stageName',
    'status', 'status.id', 'status.name', 'statusId',
    'dealStage', 'dealStage.id', 'dealStage.name',
    'pipelineStage', 'pipelineStage.id', 'pipelineStage.name',
    'phase', 'phase.id', 'phase.name', 'phaseId',
    'funnelStage', 'funnelStage.id', 'funnelStage.name',
    'dealStatus', 'dealStatus.id', 'dealStatus.name'
  ];

  return candidates
    .map(path => ({ path, value: asText(readPath(raw, path), true) }))
    .filter(item => item.value);
}

function normalizeDeal(raw) {
  const stageName = pickText(raw, [
    'stage.name', 'stage.title', 'stage.label', 'stage',
    'stageName',
    'status.name', 'status.title', 'status.label', 'status',
    'dealStage.name', 'dealStage.title', 'dealStage',
    'pipelineStage.name', 'pipelineStage.title', 'pipelineStage',
    'phase.name', 'phase.title', 'phase',
    'funnelStage.name', 'funnelStage',
    'dealStatus.name', 'dealStatus'
  ], '', false);

  const stageId = pickText(raw, [
    'stage.id', 'stageId', 'stage_id',
    'status.id', 'statusId',
    'dealStage.id',
    'pipelineStage.id',
    'phase.id', 'phaseId',
    'funnelStage.id',
    'dealStatus.id'
  ], '', true);

  return {
    id: pickText(raw, ['id', 'dealId', 'uuid', 'externalId'], '', true),
    name: pickText(raw, ['name', 'title', 'dealName'], 'Negocio sem nome'),
    companyName: pickText(raw, ['company.name', 'organization.name', 'person.name', 'customer.name', 'entity.name', 'companies', 'contacts']),
    value: pickNumber(raw, ['value', 'price', 'amount', 'dealValue'], 0),
    stage: stageName || stageId,
    stageId,
    date: formatDate(pickText(raw, ['createdAt', 'created_at', 'dateCreated', 'createdDate'])),
    owner: pickText(raw, ['responsible.name', 'owner.name', 'user.name', 'responsibleUser.name']) || pickText(raw, ['responsible.id', 'owner.id', 'user.id', 'responsibleUser.id'], '', true),
    source: pickText(raw, ['source.name', 'origin.name', 'leadSource.name', 'source', 'origin', 'leadSource']),
    lossReason: pickText(raw, ['lossReason.name', 'lostReason.name', 'lossReason', 'lostReason']),
    _diagnostics: {
      keys: Object.keys(raw).slice(0, 60),
      stageCandidates: stageDiagnostics(raw)
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
  if (!response.ok) {
    throw new Error(`Moskit API error ${response.status}: ${text.slice(0, 500)}`);
  }

  if (!text) return [];
  return JSON.parse(text);
}

export async function fetchMoskitDeals({ accessKey, limit = 50, baseUrl }) {
  if (!accessKey) throw new Error('Moskit credential is required');

  const base = (baseUrl || 'https://api.moskitcrm.com').replace(/\/$/, '');
  const candidateUrls = [
    `${base}/v1/deals?limit=${limit}`,
    `${base}/v2/deals?limit=${limit}`,
    `${base}/deals?limit=${limit}`,
    `${base}/deals/search?limit=${limit}`
  ];

  let lastError;
  for (const url of candidateUrls) {
    try {
      const data = await requestMoskit({ url, accessKey });
      const list = Array.isArray(data)
        ? data
        : data.items || data.data || data.deals || data.results || data.content || [];
      if (Array.isArray(list)) return list.slice(0, limit).map(normalizeDeal);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Moskit API did not return deals');
}
