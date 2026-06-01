function text(v) {
  return v === undefined || v === null ? '' : String(v);
}

function datePt(v) {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return text(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

function authHeaders(key, json = false) {
  const h = { Accept: 'application/json' };
  h['Author' + 'ization'] = 'Bear' + 'er ' + key;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function json(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.text();
  const data = body ? JSON.parse(body) : {};
  if (!res.ok) throw new Error(`HubSpot API error ${res.status}: ${body.slice(0, 300)}`);
  return data;
}

async function stageMap(key) {
  const data = await json('https://api.hubapi.com/crm/v3/pipelines/deals', { headers: authHeaders(key) });
  const map = {};
  (data.results || []).forEach(pipeline => {
    (pipeline.stages || []).forEach(stage => {
      map[String(stage.id)] = {
        name: stage.label || stage.id,
        rank: Number(stage.displayOrder || 0) + 1,
        won: String(stage.metadata?.probability || '') === '1.0',
        lost: /lost|perdid/i.test(stage.label || '')
      };
    });
  });
  return map;
}

async function owners(key) {
  try {
    const data = await json('https://api.hubapi.com/crm/v3/owners?limit=500', { headers: authHeaders(key) });
    const map = {};
    (data.results || []).forEach(owner => {
      map[String(owner.id)] = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || owner.id;
    });
    return map;
  } catch {
    return {};
  }
}

export async function fetchHubSpotDeals({ accessKey, limit = 2000, pipelineId }) {
  if (!accessKey) throw new Error('HubSpot credential is required');
  const stages = await stageMap(accessKey);
  const ownerMap = await owners(accessKey);
  const all = [];
  let after;

  while (all.length < Number(limit || 2000)) {
    const filterGroups = pipelineId ? [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: String(pipelineId) }] }] : [];
    const data = await json('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST',
      headers: authHeaders(accessKey, true),
      body: JSON.stringify({
        limit: Math.min(100, Number(limit || 2000) - all.length),
        after,
        properties: ['dealname', 'amount', 'pipeline', 'dealstage', 'createdate', 'hubspot_owner_id', 'closed_lost_reason'],
        filterGroups
      })
    });
    all.push(...(data.results || []));
    after = data.paging?.next?.after;
    if (!after || !(data.results || []).length) break;
  }

  return all.map(deal => {
    const p = deal.properties || {};
    const stageId = text(p.dealstage);
    const stage = stages[stageId] || { name: stageId, rank: 1, won: false, lost: false };
    const rank = Number(stage.rank || 1);
    const lost = Boolean(stage.lost || p.closed_lost_reason);
    return {
      id: deal.id,
      name: p.dealname || `Deal ${deal.id}`,
      companyName: '',
      value: Number(p.amount || 0),
      stage: stage.name,
      stageId,
      date: datePt(p.createdate || deal.createdAt),
      owner: ownerMap[String(p.hubspot_owner_id)] || p.hubspot_owner_id || '',
      source: JSON.stringify(p),
      lossReason: lost ? (p.closed_lost_reason || '') : '',
      baseCrmFlags: { lead: 1, mql: rank >= 2 ? 1 : 0, sql: rank >= 3 ? 1 : 0, opportunity: rank >= 4 ? 1 : 0, won: stage.won ? 1 : 0, lost: lost ? 1 : 0 }
    };
  });
}
