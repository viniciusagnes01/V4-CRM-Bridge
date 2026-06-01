(() => {
  const STORE = 'v4_crm_bridge_internal_v3';
  const DEFAULT_SHEET = 'https://docs.google.com/spreadsheets/d/1KLxctUK2ZGaM7jm1y2zj-StwLTgV6qP0PL1a-ZEnMmo/edit';

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); }
    catch { return {}; }
  }

  function writeState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function isSyncPage() {
    const title = document.querySelector('.top h2');
    return title && title.textContent.trim().toLowerCase() === 'sincronização';
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[match]));
  }

  function findClient(name) {
    const state = readState();
    return (state.clients || []).find(client => client.name === name) || {};
  }

  function sheetFor(item) {
    const client = findClient(item.client);
    return client.growthpackUrl || client.sheet || DEFAULT_SHEET;
  }

  function payloadFor(item) {
    return {
      client: {
        name: item.client || 'Cliente sem nome',
        growthpackUrl: sheetFor(item),
        crmTab: item.destination || 'TESTE_BASE_CRM'
      },
      integration: {
        crm: String(item.crm || '').toLowerCase(),
        baseUrl: item.baseUrl || '',
        pipelineId: item.pipeline || ''
      },
      limit: 2000,
      writeToSheet: true,
      writeMode: item.writeMode || 'upsert',
      includeDiagnostics: false
    };
  }

  function saveLog(result, item) {
    const state = readState();
    state.logs = state.logs || [];
    state.logs.unshift({
      type: result.ok ? 'success' : 'error',
      message: result.ok ? `Sync ${item.client}: ${result.records || 0} registros.` : `Erro ${item.client}: ${result.message || 'falha'}`,
      at: new Date().toLocaleString('pt-BR')
    });
    const client = (state.clients || []).find(row => row.name === item.client);
    if (client && result.ok) {
      client.lastSync = new Date().toLocaleString('pt-BR');
      client.records = result.records || result.writtenRows || 0;
    }
    writeState(state);
  }

  async function runIntegration(index, mode) {
    const state = readState();
    const item = (state.integrations || [])[index];
    const out = document.getElementById(`sync-output-${index}`);
    if (!item) return;

    const payload = payloadFor(item);
    payload.writeMode = mode || payload.writeMode;

    if (!payload.integration.pipelineId) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: 'Esta integração ainda não tem funil selecionado.' }, null, 2);
      return;
    }

    if (out) out.textContent = 'Sincronizando...';
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (out) out.textContent = JSON.stringify(result, null, 2);
      saveLog(result, item);
    } catch (error) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: error.message }, null, 2);
    }
  }

  function hideOldFixedPanels() {
    document.querySelectorAll('.main .card').forEach(card => {
      const text = card.textContent || '';
      if (text.includes('Moskit · YouSafer') || text.includes('Fila')) card.style.display = 'none';
    });
  }

  function render() {
    if (!isSyncPage()) return;
    hideOldFixedPanels();
    if (document.getElementById('dynamic-sync-screen')) return;

    const state = readState();
    const integrations = state.integrations || [];
    const main = document.querySelector('.main');
    if (!main) return;

    const section = document.createElement('section');
    section.id = 'dynamic-sync-screen';
    section.className = 'card';
    section.innerHTML = `
      <div class="card-head">
        <div>
          <h3>Sincronizações criadas</h3>
          <p class="muted">Aqui aparecem as integrações cadastradas em Integrações. Cada card executa o CRM e a GrowthPack daquele cliente.</p>
        </div>
        <span class="chip">${integrations.length} ativa(s)</span>
      </div>
      <div class="list">
        ${integrations.length ? integrations.map((item, index) => `
          <article class="item">
            <div>
              <h4>${esc(item.client)}</h4>
              <p>${esc(item.crm)} → ${esc(item.destination || 'TESTE_BASE_CRM')} · ${esc(item.pipelineName || item.pipeline || 'Sem funil')}</p>
              <p>GrowthPack: ${esc(sheetFor(item))}</p>
              <span class="pill ok">${esc(item.status || 'Ativo')}</span>
            </div>
            <div class="item-actions">
              <button class="btn primary small" type="button" onclick="runDynamicSync(${index}, 'upsert')">Sincronizar agora</button>
              <button class="btn secondary small" type="button" onclick="runDynamicSync(${index}, 'rebuild')">Reconstruir aba</button>
            </div>
            <pre id="sync-output-${index}" class="catalog-output" style="grid-column:1/-1;display:block;max-height:220px;">Aguardando execução.</pre>
          </article>
        `).join('') : '<div class="empty">Nenhuma integração criada ainda. Vá em Integrações, crie a integração do cliente e depois volte para Sincronização.</div>'}
      </div>
    `;
    main.appendChild(section);
  }

  window.runDynamicSync = runIntegration;
  const observer = new MutationObserver(render);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', render);
  setTimeout(render, 250);
})();
