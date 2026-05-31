function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function send(res, status, payload) {
  res.status(status).json(payload);
}

function credentialFromRequest({ crm, credentialAlias, secret }) {
  if (secret) return secret;

  const alias = String(credentialAlias || '').trim();
  if (alias && process.env[alias]) return process.env[alias];

  const normalizedCrm = normalize(crm).toUpperCase();
  const candidates = [
    `${normalizedCrm}_ACCESS_KEY`,
    `${normalizedCrm}_ACCESS_TOKEN`,
    `${normalizedCrm}_API_TOKEN`,
    `${normalizedCrm}_TOKEN`,
    `${normalizedCrm}_WEBHOOK_URL`,
    'MOSKIT_ACCESS_KEY',
    'KOMMO_ACCESS_KEY',
    'KOMMO_ACCESS_TOKEN',
    'HUBSPOT_ACCESS_TOKEN',
    'PIPEDRIVE_API_TOKEN',
    'BITRIX_WEBHOOK_URL'
  ];

  for (const key of candidates) {
    if (process.env[key]) return process.env[key];
  }

  return '';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`CRM API error ${response.status}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
  }

  return data;
}

function listFrom(data, paths = []) {
  if (Array.isArray(data)) return data;
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc && acc[key], data);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function moskitCatalog() {
  return {
    ok: true,
    crm: 'Moskit',
    message: 'Catálogo Moskit baseado no funil V4 - Tráfego validado.',
    pipelines: [
      {
        id: 'v4-trafego',
        name: 'V4 - Tráfego',
        stages: [
          { id: '370298', name: 'Novo Lead' },
          { id: '370300', name: 'Primeiro Contato' },
          { id: '370299', name: 'Qualificação' },
          { id: '370301', name: 'Apresentação/agendamento de reunião' },
          { id: '372772', name: 'Envio de Proposta' },
          { id: '372773', name: 'Reunião de Alinhamento' },
          { id: '458935', name: 'Aguardando Assinatura' },
          { id: '458934', name: 'Compra' }
        ]
      }
    ]
  };
}

async function kommoCatalog({ credential, baseUrl }) {
  if (!credential) throw new Error('Informe KOMMO_ACCESS_KEY/KOMMO_ACCESS_TOKEN ou token temporário.');
  if (!baseUrl) throw new Error('Informe a Base URL da Kommo, exemplo: https://suaempresa.kommo.com');

  const base = String(baseUrl).replace(/\/$/, '');
  const data = await fetchJson(`${base}/api/v4/leads/pipelines`, {
    headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json' }
  });

  const pipelines = listFrom(data, ['_embedded.pipelines']).map(pipeline => ({
    id: String(pipeline.id || ''),
    name: pipeline.name || String(pipeline.id || ''),
    stages: listFrom(pipeline, ['_embedded.statuses', 'statuses']).map(status => ({
      id: String(status.id || ''),
      name: status.name || String(status.id || '')
    }))
  }));

  return { ok: true, crm: 'Kommo', pipelines };
}

async function hubspotCatalog({ credential }) {
  if (!credential) throw new Error('Informe HUBSPOT_ACCESS_TOKEN ou token temporário.');

  const data = await fetchJson('https://api.hubapi.com/crm/v3/pipelines/deals', {
    headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json' }
  });

  return {
    ok: true,
    crm: 'HubSpot',
    pipelines: (data.results || []).map(pipeline => ({
      id: pipeline.id,
      name: pipeline.label || pipeline.displayOrder || pipeline.id,
      stages: (pipeline.stages || []).map(stage => ({ id: stage.id, name: stage.label || stage.id }))
    }))
  };
}

async function pipedriveCatalog({ credential, baseUrl }) {
  if (!credential) throw new Error('Informe PIPEDRIVE_API_TOKEN ou token temporário.');

  const base = (baseUrl || 'https://api.pipedrive.com/v1').replace(/\/$/, '');
  const pipelineData = await fetchJson(`${base}/pipelines?api_token=${encodeURIComponent(credential)}`);
  const pipelines = listFrom(pipelineData, ['data']).map(pipeline => ({
    id: String(pipeline.id),
    name: pipeline.name || String(pipeline.id),
    stages: []
  }));

  for (const pipeline of pipelines) {
    const stageData = await fetchJson(`${base}/stages?pipeline_id=${encodeURIComponent(pipeline.id)}&api_token=${encodeURIComponent(credential)}`);
    pipeline.stages = listFrom(stageData, ['data']).map(stage => ({ id: String(stage.id), name: stage.name || String(stage.id) }));
  }

  return { ok: true, crm: 'PipeDrive', pipelines };
}

async function bitrixCatalog({ credential, baseUrl }) {
  const webhook = (baseUrl || credential || '').replace(/\/$/, '');
  if (!webhook) throw new Error('Informe BITRIX_WEBHOOK_URL ou URL do webhook temporária.');

  const categories = await fetchJson(`${webhook}/crm.category.list.json?entityTypeId=2`);
  const categoryItems = listFrom(categories, ['result.categories', 'result.items', 'result']);
  const pipelines = [];

  if (!categoryItems.length) {
    const stages = await fetchJson(`${webhook}/crm.status.list.json?filter[ENTITY_ID]=DEAL_STAGE`);
    pipelines.push({
      id: '0',
      name: 'Pipeline padrão',
      stages: listFrom(stages, ['result']).map(stage => ({ id: stage.STATUS_ID || stage.ID, name: stage.NAME || stage.STATUS_ID || stage.ID }))
    });
    return { ok: true, crm: 'Bitrix', pipelines };
  }

  for (const category of categoryItems) {
    const categoryId = String(category.id || category.ID || '0');
    const entityId = categoryId === '0' ? 'DEAL_STAGE' : `DEAL_STAGE_${categoryId}`;
    const stages = await fetchJson(`${webhook}/crm.status.list.json?filter[ENTITY_ID]=${encodeURIComponent(entityId)}`);
    pipelines.push({
      id: categoryId,
      name: category.name || category.NAME || `Pipeline ${categoryId}`,
      stages: listFrom(stages, ['result']).map(stage => ({ id: stage.STATUS_ID || stage.ID, name: stage.NAME || stage.STATUS_ID || stage.ID }))
    });
  }

  return { ok: true, crm: 'Bitrix', pipelines };
}

function pendingAdapter(crm) {
  return {
    ok: false,
    crm,
    message: `Conector ${crm} ainda precisa da documentação/credencial oficial para listar funis automaticamente. A opção já aparece no app, mas o adapter real precisa ser configurado.`
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'Use POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const crm = body.crm || '';
    const normalized = normalize(crm);
    const credential = credentialFromRequest({ crm, credentialAlias: body.credentialAlias, secret: body.secret });
    const baseUrl = body.baseUrl || '';

    if (normalized === 'moskit') return send(res, 200, moskitCatalog());
    if (normalized === 'kommo') return send(res, 200, await kommoCatalog({ credential, baseUrl }));
    if (normalized === 'hubspot') return send(res, 200, await hubspotCatalog({ credential }));
    if (normalized === 'pipedrive') return send(res, 200, await pipedriveCatalog({ credential, baseUrl }));
    if (normalized === 'bitrix') return send(res, 200, await bitrixCatalog({ credential, baseUrl }));
    if (normalized.includes('sults')) return send(res, 200, pendingAdapter('SULTS'));
    if (normalized.includes('c2s') || normalized.includes('contact2sale')) return send(res, 200, pendingAdapter('C2S / Contact2Sale'));

    return send(res, 200, pendingAdapter(crm || 'CRM'));
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message });
  }
}
