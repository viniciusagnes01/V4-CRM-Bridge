import { supabaseFetch } from './_supabase.js';

const TABLES = {
  accounts: 'v4_accounts',
  clients: 'v4_clients',
  integrations: 'v4_integrations',
  logs: 'v4_logs'
};

const ORDER = {
  accounts: 'created_at.desc',
  clients: 'created_at.desc',
  integrations: 'created_at.desc',
  logs: 'created_at.desc'
};

function send(res, status, payload) {
  res.status(status).json(payload);
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function tableFor(resource) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Invalid resource: ${resource}`);
  return table;
}

function normalizeResource(resource, row) {
  if (!row) return row;
  if (resource === 'integrations') {
    return {
      id: row.id,
      client: row.client,
      crm: row.crm,
      alias: row.alias,
      baseUrl: row.base_url,
      pipeline: row.pipeline,
      pipelineName: row.pipeline_name,
      trigger: row.trigger,
      destination: row.destination,
      frequency: row.frequency,
      writeMode: row.write_mode,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  if (resource === 'clients') {
    return {
      id: row.id,
      name: row.name,
      account: row.account,
      sheet: row.sheet,
      growthpackUrl: row.sheet,
      status: row.status,
      lastSync: row.last_sync,
      records: row.records,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  if (resource === 'accounts') {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  if (resource === 'logs') {
    return {
      id: row.id,
      type: row.type,
      message: row.message,
      at: row.at,
      createdAt: row.created_at
    };
  }
  return row;
}

function toDb(resource, item) {
  if (resource === 'integrations') {
    return {
      client: item.client || '',
      crm: item.crm || '',
      alias: item.alias || item.credentialAlias || '',
      base_url: item.baseUrl || item.base_url || '',
      pipeline: item.pipeline || '',
      pipeline_name: item.pipelineName || item.pipeline_name || '',
      trigger: item.trigger || '',
      destination: item.destination || 'TESTE_BASE_CRM',
      frequency: item.frequency || 'Manual',
      write_mode: item.writeMode || item.write_mode || 'upsert',
      status: item.status || 'Ativo'
    };
  }
  if (resource === 'clients') {
    return {
      name: item.name || '',
      account: item.account || '',
      sheet: item.sheet || item.growthpackUrl || '',
      status: item.status || 'Ativo',
      last_sync: item.lastSync || item.last_sync || '',
      records: Number(item.records || 0)
    };
  }
  if (resource === 'accounts') {
    return {
      name: item.name || '',
      email: item.email || '',
      role: item.role || 'Account',
      status: item.status || 'Ativo'
    };
  }
  if (resource === 'logs') {
    return {
      type: item.type || 'info',
      message: item.message || '',
      at: item.at || new Date().toLocaleString('pt-BR')
    };
  }
  return item;
}

async function listAll() {
  const out = {};
  for (const resource of Object.keys(TABLES)) {
    const table = tableFor(resource);
    const rows = await supabaseFetch(`${table}?select=*&order=${ORDER[resource]}`);
    out[resource] = (rows || []).map(row => normalizeResource(resource, row));
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const resource = String(req.query.resource || '').trim();
    const id = String(req.query.id || '').trim();
    const data = body(req);

    if (req.method === 'GET' && !resource) {
      return send(res, 200, { ok: true, ...(await listAll()) });
    }

    const table = tableFor(resource);

    if (req.method === 'GET') {
      const rows = await supabaseFetch(`${table}?select=*&order=${ORDER[resource]}`);
      return send(res, 200, { ok: true, [resource]: (rows || []).map(row => normalizeResource(resource, row)) });
    }

    if (req.method === 'POST') {
      const rows = await supabaseFetch(table, { method: 'POST', body: JSON.stringify(toDb(resource, data)) });
      return send(res, 200, { ok: true, item: normalizeResource(resource, rows?.[0]) });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!id) return send(res, 400, { ok: false, message: 'Missing id' });
      const rows = await supabaseFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(toDb(resource, data)) });
      return send(res, 200, { ok: true, item: normalizeResource(resource, rows?.[0]) });
    }

    if (req.method === 'DELETE') {
      if (!id) return send(res, 400, { ok: false, message: 'Missing id' });
      await supabaseFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, message: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message });
  }
}
