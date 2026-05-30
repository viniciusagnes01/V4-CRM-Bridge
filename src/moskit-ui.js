(() => {
  const PANEL_ID = 'v4-moskit-real-sync-panel';
  const SHEET_ID = '1KLxctUK2ZGaM7jm1y2zj-StwLTgV6qP0PL1a-ZEnMmo';
  const TAB_KEY = 'v4_crm_bridge_target_tab';
  const DEFAULT_LIMIT = 5000;

  function isSyncPage() {
    const title = document.querySelector('.top h2');
    return title && title.textContent.trim().toLowerCase() === 'sincronização';
  }

  function targetTab() {
    const selected = document.getElementById('v4-moskit-target-tab');
    return selected ? selected.value : (localStorage.getItem(TAB_KEY) || 'TESTE_BASE_CRM');
  }

  function setTargetTab(value) {
    localStorage.setItem(TAB_KEY, value || 'TESTE_BASE_CRM');
    updateDestinationCopy();
  }

  function updateDestinationCopy() {
    const tab = targetTab();
    const destination = document.getElementById('v4-moskit-destination');
    const syncButton = document.querySelector('[data-moskit-action="sync"]');
    const rebuildButton = document.querySelector('[data-moskit-action="rebuild"]');
    const warning = document.getElementById('v4-moskit-warning');
    if (destination) destination.textContent = 'GrowthPack V26 · ' + tab;
    if (syncButton) syncButton.textContent = tab === 'BASE_CRM' ? 'Atualizar BASE_CRM' : 'Atualizar TESTE_BASE_CRM';
    if (rebuildButton) rebuildButton.textContent = tab === 'BASE_CRM' ? 'Reconstruir BASE_CRM' : 'Reconstruir TESTE_BASE_CRM';
    if (warning) {
      warning.textContent = tab === 'BASE_CRM'
        ? 'Modo produção: dados serão gravados na BASE_CRM oficial. Valide a prévia antes de executar.'
        : 'Modo seguro: dados serão gravados apenas na TESTE_BASE_CRM.';
    }
  }

  function hideMockQueue() {
    if (!isSyncPage()) return;
    const cards = [...document.querySelectorAll('.main > .card')];
    cards.forEach(card => {
      const title = card.querySelector('.card-head h3');
      if (title && title.textContent.trim().toLowerCase() === 'fila') {
        card.style.display = 'none';
      }
    });
  }

  function payload(writeToSheet, mode) {
    return {
      client: {
        name: 'Moskit V4 - Tráfego',
        growthpackUrl: 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit',
        crmTab: targetTab()
      },
      integration: {
        crm: 'moskit'
      },
      limit: DEFAULT_LIMIT,
      writeToSheet,
      writeMode: mode || 'upsert',
      includeDiagnostics: !writeToSheet
    };
  }

  function summary(data) {
    if (!data || !data.ok) return JSON.stringify(data, null, 2);
    return JSON.stringify({
      ok: data.ok,
      client: data.client,
      crm: data.crm,
      destino: targetTab(),
      records: data.records,
      writtenRows: data.writtenRows,
      appendedRows: data.appendedRows,
      updatedRows: data.updatedRows,
      clearedRows: data.clearedRows,
      writeMode: data.writeMode,
      message: data.message
    }, null, 2);
  }

  async function run(writeToSheet, mode) {
    const out = document.getElementById('v4-moskit-real-sync-output');
    const buttons = document.querySelectorAll('[data-moskit-action]');
    const tab = targetTab();
    buttons.forEach(button => button.disabled = true);
    out.textContent = writeToSheet
      ? (mode === 'rebuild' ? 'Reconstruindo ' + tab + '...' : 'Atualizando ' + tab + '...')
      : 'Consultando funil inteiro no Moskit...';

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(writeToSheet, mode))
      });
      const data = await response.json();
      out.textContent = writeToSheet ? summary(data) : JSON.stringify(data, null, 2);
    } catch (error) {
      out.textContent = JSON.stringify({ ok: false, message: error.message }, null, 2);
    } finally {
      buttons.forEach(button => button.disabled = false);
    }
  }

  function injectPanel() {
    if (!isSyncPage()) return;
    hideMockQueue();
    if (document.getElementById(PANEL_ID)) return;

    const main = document.querySelector('.main');
    if (!main) return;

    const firstCard = main.querySelector('.card');
    const currentTab = localStorage.getItem(TAB_KEY) || 'TESTE_BASE_CRM';
    const panel = document.createElement('section');
    panel.className = 'card';
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="card-head">
        <div>
          <h3>Moskit · YouSafer</h3>
          <p class="muted">Integração real com upsert por Lead ID e destino controlado. Busca até ${DEFAULT_LIMIT} negócios do funil V4 - Tráfego.</p>
        </div>
        <span class="chip">Produção assistida</span>
      </div>
      <div class="matrix">
        <div><strong>Origem</strong><span>Moskit · V4 - Tráfego</span></div>
        <div><strong>Destino</strong><span id="v4-moskit-destination">GrowthPack V26 · ${currentTab}</span></div>
        <div><strong>Modo</strong><span>Atualiza existentes, cria novos ou reconstrói a aba de teste.</span></div>
      </div>
      <div class="grid two" style="margin-top:14px;gap:12px;">
        <div>
          <label>Aba de destino</label>
          <select id="v4-moskit-target-tab">
            <option value="TESTE_BASE_CRM" ${currentTab === 'TESTE_BASE_CRM' ? 'selected' : ''}>TESTE_BASE_CRM</option>
            <option value="BASE_CRM" ${currentTab === 'BASE_CRM' ? 'selected' : ''}>BASE_CRM</option>
          </select>
        </div>
        <div class="notice" id="v4-moskit-warning" style="align-self:end;">Modo seguro: dados serão gravados apenas na TESTE_BASE_CRM.</div>
      </div>
      <div class="actions form-actions">
        <button class="btn secondary" data-moskit-action="preview">Rodar prévia completa</button>
        <button class="btn primary" data-moskit-action="sync">Atualizar TESTE_BASE_CRM</button>
        <button class="btn secondary" data-moskit-action="rebuild">Reconstruir TESTE_BASE_CRM</button>
      </div>
      <pre id="v4-moskit-real-sync-output" style="white-space:pre-wrap;word-break:break-word;margin-top:14px;max-height:360px;overflow:auto;background:#080a08;border:1px solid var(--line);border-radius:14px;padding:14px;color:var(--text);">Nenhuma execução nesta sessão.</pre>
    `;

    if (firstCard) main.insertBefore(panel, firstCard);
    else main.appendChild(panel);

    panel.querySelector('#v4-moskit-target-tab').addEventListener('change', event => setTargetTab(event.target.value));
    panel.querySelector('[data-moskit-action="preview"]').addEventListener('click', () => run(false, 'upsert'));
    panel.querySelector('[data-moskit-action="sync"]').addEventListener('click', () => {
      const tab = targetTab();
      const ok = window.confirm('Confirmar atualização da ' + tab + ' via upsert por Lead ID?');
      if (ok) run(true, 'upsert');
    });
    panel.querySelector('[data-moskit-action="rebuild"]').addEventListener('click', () => {
      const tab = targetTab();
      const ok = window.confirm('Reconstruir a ' + tab + '? Isso limpa os registros atuais da aba e grava apenas o resultado atual do Moskit.');
      if (ok) run(true, 'rebuild');
    });
    updateDestinationCopy();
  }

  const observer = new MutationObserver(() => {
    injectPanel();
    hideMockQueue();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', injectPanel);
  setTimeout(injectPanel, 300);
})();
