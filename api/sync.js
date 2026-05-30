import { readJson, send, toBaseCrmRow } from './_utils.js';

function sampleRecords() {
  return [
    { id: 'demo-001', name: 'Lead Demo', value: 0, stage: 'lead', source: 'meta', owner: 'Account V4' },
    { id: 'demo-002', name: 'Oportunidade Demo', value: 1500, stage: 'oportunidade', source: 'google', owner: 'Account V4' },
    { id: 'demo-003', name: 'Compra Demo', value: 2500, stage: 'compra', source: 'google', owner: 'Account V4' }
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, message: 'Use POST' });
  }

  try {
    const body = readJson(req);
    const client = body.client || {};
    const integration = body.integration || {};
    const stages = integration.stages || {};
    const mode = body.mode || 'dry-run';

    const records = sampleRecords();
    const rows = records.map(record => toBaseCrmRow(record, stages));

    return send(res, 200, {
      ok: true,
      mode,
      client: client.name || 'Cliente sem nome',
      crm: integration.crm || 'mock',
      records: records.length,
      rows,
      message: 'Sync endpoint is working. Sheet writing is the next layer.'
    });
  } catch (error) {
    return send(res, 500, { ok: false, message: error.message });
  }
}
