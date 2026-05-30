export async function fetchKommoLeads({ baseUrl, accessKey, limit = 50 }) {
  if (!baseUrl) throw new Error('Kommo baseUrl is required');
  if (!accessKey) throw new Error('Kommo credential is required');

  const cleanBase = String(baseUrl).replace(/\/$/, '');
  const url = `${cleanBase}/api/v4/leads?limit=${Number(limit) || 50}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessKey}`,
      Accept: 'application/json'
    }
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Kommo API error ${response.status}: ${text.slice(0, 300)}`);

  const json = JSON.parse(text);
  const leads = json?._embedded?.leads || [];

  return leads.map(lead => ({
    id: String(lead.id || ''),
    name: lead.name || '',
    value: lead.price || 0,
    stage: String(lead.status_id || ''),
    date: lead.created_at ? new Date(lead.created_at * 1000).toISOString() : new Date().toISOString(),
    owner: String(lead.responsible_user_id || ''),
    source: getCustomField(lead, 'origem'),
    lossReason: ''
  }));
}

function getCustomField(lead, contains) {
  const fields = lead.custom_fields_values || [];
  const target = String(contains).toLowerCase();
  const found = fields.find(field => String(field.field_name || '').toLowerCase().includes(target));
  return found?.values?.[0]?.value || '';
}
