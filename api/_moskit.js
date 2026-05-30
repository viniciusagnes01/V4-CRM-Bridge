function pick(obj, paths, fallback = '') {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc && acc[key], obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function normalizeDeal(raw) {
  const stageName = pick(raw, [
    'stage.name',
    'stageName',
    'status.name',
    'dealStage.name',
    'pipelineStage.name',
    'phase.name'
  ]);

  return {
    id: String(pick(raw, ['id', 'dealId', 'uuid', 'externalId'])),
    name: pick(raw, ['name', 'title', 'dealName'], 'Negocio sem nome'),
    companyName: pick(raw, ['company.name', 'organization.name', 'person.name', 'customer.name']),
    value: Number(pick(raw, ['value', 'price', 'amount', 'dealValue'], 0) || 0),
    stage: stageName || String(pick(raw, ['stageId', 'statusId', 'phaseId'], '')),
    date: pick(raw, ['createdAt', 'created_at', 'dateCreated', 'createdDate']) || new Date().toISOString(),
    owner: pick(raw, ['responsible.name', 'owner.name', 'user.name', 'responsibleUser.name']),
    source: pick(raw, ['source', 'origin', 'leadSource.name', 'source.name']),
    lossReason: pick(raw, ['lossReason', 'lostReason.name', 'lostReason'])
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
