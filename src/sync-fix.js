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

  function ensureBaseInputs() {
    document.querySelectorAll('#dynamic-sync-screen article.item').forEach((card, index) => {
      if (card.querySelector(`[data-base-url-index="${index}"]`)) return;
      const state = readState();
      const item = (state.integrations || [])[index] || {};
      const crm = String(item.crm || '').toLowerCase();
      if (!crm.includes('kommo') && !crm.includes('pipedrive') && !crm.includes('bitrix')) return;
      const pre = card.querySelector('pre');
      const row = document.createElement('div');
      row.style.gridColumn = '1/-1';
      row.style.margin = '10px 0 0';
      row.innerHTML = `
        <label style="display:block;font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:900;margin-bottom:6px;">Base URL do CRM</label>
        <input data-base-url-index="${index}" value="${item.baseUrl || ''}" placeholder="Ex: https://suaempresa.kommo.com" style="width:100%;">
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
    const baseUrl = baseInput ? baseInput.value.trim() : (item.baseUrl || '');
    item.baseUrl = baseUrl;
    saveState(state);

    const body = {
      client: {
        name: item.client || 'Cliente sem nome',
        growthpackUrl: sheetFor(state, item),
        crmTab: item.destination || 'TESTE_BASE_CRM'
      },
      integration: {
        crm: String(item.crm || '').toLowerCase(),
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
