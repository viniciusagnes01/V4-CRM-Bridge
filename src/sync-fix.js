(() => {
  const STORE = 'v4_crm_bridge_internal_v3';

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); }
    catch { return {}; }
  }

  function saveState(next) {
    localStorage.setItem(STORE, JSON.stringify(next));
  }

  function output(index) {
    return document.getElementById(`sync-output-${index}`);
  }

  function sheetFor(state, item) {
    const client = (state.clients || []).find(row => row.name === item.client) || {};
    return client.growthpackUrl || client.sheet || '';
  }

  function defaultAlias(crm) {
    const value = String(crm || '').toLowerCase();
    if (value.includes('kommo')) return 'KOMMO_ACCESS_TOKEN';
    if (value.includes('moskit')) return 'MOSKIT_ACCESS_KEY';
    if (value.includes('hubspot')) return 'HUBSPOT_ACCESS_TOKEN';
    if (value.includes('pipedrive')) return 'PIPEDRIVE_API_TOKEN';
    if (value.includes('bitrix')) return 'BITRIX_WEBHOOK_URL';
    return '';
  }

  function ensureBaseInputs() {
    document.querySelectorAll('#dynamic-sync-screen article.item').forEach((card, index) => {
      if (card.querySelector(`[data-base-url-index="${index}"]`)) return;
      const state = readState();
      const item = (state.integrations || [])[index] || {};
      const crm = String(item.crm || '').toLowerCase();
      if (!crm.includes('kommo') && !crm.includes('pipedrive') && !crm.includes('bitrix') && !crm.includes('hubspot') && !crm.includes('moskit')) return;
      const pre = card.querySelector('pre');
      const row = document.createElement('div');
      row.style.gridColumn = '1/-1';
      row.style.margin = '10px 0 0';
      row.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:900;margin-bottom:6px;">Base URL do CRM</label>
            <input data-base-url-index="${index}" value="${item.baseUrl || ''}" placeholder="Ex: https://suaempresa.kommo.com" style="width:100%;">
          </div>
          <div>
            <label style="display:block;font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:900;margin-bottom:6px;">Nome da credencial</label>
            <input data-credential-index="${index}" value="${item.alias || item.credentialAlias || defaultAlias(item.crm)}" placeholder="Ex: KOMMO_ACCESS_TOKEN" style="width:100%;">
          </div>
        </div>
      `;
      if (pre) card.insertBefore(row, pre);
      else card.appendChild(row);
    });
  }

  async function run(index, mode) {
    const state = readState();
    const item = (state.integrations || [])[index];
    const out = output(index);
    if (!item) return;

    const baseInput = document.querySelector(`[data-base-url-index="${index}"]`);
    const credentialInput = document.querySelector(`[data-credential-index="${index}"]`);
    const baseUrl = baseInput ? baseInput.value.trim() : (item.baseUrl || '');
    const credentialAlias = credentialInput ? credentialInput.value.trim() : (item.alias || item.credentialAlias || defaultAlias(item.crm));
    item.baseUrl = baseUrl;
    item.alias = credentialAlias;
    saveState(state);

    const body = {
      client: {
        name: item.client || 'Cliente sem nome',
        growthpackUrl: sheetFor(state, item),
        crmTab: item.destination || 'TESTE_BASE_CRM'
      },
      integration: {
        crm: String(item.crm || '').toLowerCase(),
        credentialAlias,
        baseUrl,
        pipelineId: item.pipeline || ''
      },
      limit: 2000,
      writeToSheet: true,
      writeMode: mode || item.writeMode || 'upsert',
      includeDiagnostics: false
    };

    if (!body.client.growthpackUrl) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: 'GrowthPack do cliente não encontrada. Cadastre/edite o cliente com a URL da planilha.' }, null, 2);
      return;
    }
    if (!body.integration.pipelineId) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: 'Esta integração não tem funil selecionado.' }, null, 2);
      return;
    }
    if (String(body.integration.crm).includes('kommo') && !body.integration.baseUrl) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: 'Informe a Base URL do Kommo. Ex: https://suaempresa.kommo.com' }, null, 2);
      return;
    }
    if (!body.integration.credentialAlias) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: 'Informe o nome da credencial. Ex: KOMMO_ACCESS_TOKEN' }, null, 2);
      return;
    }

    if (out) out.textContent = 'Sincronizando...';
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (out) out.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: error.message }, null, 2);
    }
  }

  window.runDynamicSync = run;
  const observer = new MutationObserver(ensureBaseInputs);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', ensureBaseInputs);
  setTimeout(ensureBaseInputs, 400);
})();
