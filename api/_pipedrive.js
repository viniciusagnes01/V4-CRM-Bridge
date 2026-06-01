function text(v) { return v === undefined || v === null ? '' : String(v); }

function datePt(v) {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return text(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

async function json(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await res.text();
  const data = body ? JSON.parse(body) : {};
  if (!res.ok) throw new Error(`PipeDrive API error ${res.status}: ${body.slice(0, 300)}`);
  return data;
}

async function stages(base, key) {
  const data = await json(`${base}/stages?api_token=${encodeURIComponent(key)}`);
  const map = {};
  (data.data || []).forEach(stage => {
    map[String(stage.id)] = { name: stage.name || String(stage.id), pipelineId: String(stage.pipeline_id || ''), rank: Number(stage.order_nr || 1) };
  });
  return map;
}

export async function fetchPipeDriveDeals({ accessKey, limit = 2000, baseUrl, pipelineId }) {
  if (!accessKey) throw new Error('PipeDrive credential is required');
  const base = (baseUrl || 'https://api.pipedrive.com/v1').replace(/\/$/, '');
  const stageMap = await stages(base, accessKey);
  const all = [];
  let start = 0;
  const pageLimit = 100;

  while (all.length < Number(limit || 2000)) {
    const url = `${base}/deals?api_token=${encodeURIComponent(accessKey)}&start=${start}&limit=${pageLimit}`;
    const data = await json(url);
    const list = data.data || [];
    all.push(...list);
    if (!data.additional_data?.pagination?.more_items_in_collection || !list.length) break;
    start = data.additional_data.pagination.next_start;
  }

  return all
    .filter(deal => !pipelineId || String(deal.pipeline_id || '') === String(pipelineId) || stageMap[String(deal.stage_id || '')]?.pipelineId === String(pipelineId))
    .slice(0, Number(limit || 2000))
    .map(deal => {
      const stageId = text(deal.stage_id);
      const stage = stageMap[stageId] || { name: stageId, rank: 1 };
      const rank = Number(stage.rank || 1);
      const status = text(deal.status).toLowerCase();
      const won = status === 'won';
      const lost = status === 'lost';
      return {
        id: deal.id,
        name: deal.person_name || deal.title || `Deal ${deal.id}`,
        companyName: deal.org_name || '',
        value: Number(deal.value || 0),
        stage: stage.name,
        stageId,
        date: datePt(deal.add_time || deal.update_time),
        owner: deal.owner_name || deal.user_id?.name || '',
        source: JSON.stringify(deal),
        lossReason: lost ? (deal.lost_reason || '') : '',
        baseCrmFlags: { lead: 1, mql: rank >= 2 ? 1 : 0, sql: rank >= 3 ? 1 : 0, opportunity: rank >= 4 ? 1 : 0, won: won ? 1 : 0, lost: lost ? 1 : 0 }
      };
    });
}
