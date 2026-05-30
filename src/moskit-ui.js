(() => {
  const PANEL_ID = 'v4-moskit-real-sync-panel';
  const SHEET_ID = '1KLxctUK2ZGaM7jm1y2zj-StwLTgV6qP0PL1a-ZEnMmo';

  function isSyncPage() {
    const title = document.querySelector('.top h2');
    return title && title.textContent.trim().toLowerCase() === 'sincronização';
  }

  function payload(writeToSheet) {
    return {
      client: {
        name: 'Moskit V4 - Tráfego',
        growthpackUrl: 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit',
        crmTab: 'TESTE_BASE_CRM'
      },
      integration: {
        crm: 'moskit',
        stages: {
          lead: ['Novo Lead'],
          mql: ['Primeiro Contato', 'Qualificação', '373595'],
          sql: ['Apresentação/agendamento de reunião'],
          opportunity: ['Envio de Proposta', 'Reunião de Alinhamento', 'Enviar Contrato', 'Aguardando Assinatura'],
          won: ['Ganhou', 'WON'],
          lost: ['Perdeu', 'LOST', '370524']
        }
      },
      limit: 10,
      writeToSheet,
      writeMode: 'upsert',
      includeDiagnostics: !writeToSheet
    };
  }

  async function run(writeToSheet) {
    const out = document.getElementById('v4-moskit-real-sync-output');
    const buttons = document.querySelectorAll('[data-moskit-action]');
    buttons.forEach(button => button.disabled = true);
    out.textContent = writeToSheet ? 'Atualizando TESTE_BASE_CRM...' : 'Consultando Moskit...';

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(writeToSheet))
      });
      const data = await response.json();
      out.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      out.textContent = JSON.stringify({ ok: false, message: error.message }, null, 2);
    } finally {
      buttons.forEach(button => button.disabled = false);
    }
  }

  function injectPanel() {
    if (!isSyncPage()) return;
    if (document.getElementById(PANEL_ID)) return;

    const main = document.querySelector('.main');
    if (!main) return;

    const firstCard = main.querySelector('.card');
    const panel = document.createElement('section');
    panel.className = 'card';
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="card-head">
        <div>
          <h3>Moskit · YouSafer</h3>
          <p class="muted">Integração real com upsert por Lead ID. Validação em TESTE_BASE_CRM.</p>
        </div>
        <span class="chip">Produção assistida</span>
      </div>
      <div class="matrix">
        <div><strong>Origem</strong><span>Moskit · V4 - Tráfego</span></div>
        <div><strong>Destino</strong><span>GrowthPack V26 · TESTE_BASE_CRM</span></div>
        <div><strong>Modo</strong><span>Atualiza existentes e cria novos registros.</span></div>
      </div>
      <div class="actions form-actions">
        <button class="btn secondary" data-moskit-action="preview">Rodar prévia</button>
        <button class="btn primary" data-moskit-action="sync">Atualizar TESTE_BASE_CRM</button>
      </div>
      <pre id="v4-moskit-real-sync-output" style="white-space:pre-wrap;word-break:break-word;margin-top:14px;max-height:360px;overflow:auto;background:#080a08;border:1px solid var(--line);border-radius:14px;padding:14px;color:var(--text);">Nenhuma execução nesta sessão.</pre>
    `;

    if (firstCard) main.insertBefore(panel, firstCard);
    else main.appendChild(panel);

    panel.querySelector('[data-moskit-action="preview"]').addEventListener('click', () => run(false));
    panel.querySelector('[data-moskit-action="sync"]').addEventListener('click', () => {
      const ok = window.confirm('Confirmar atualização da TESTE_BASE_CRM via upsert por Lead ID?');
      if (ok) run(true);
    });
  }

  const observer = new MutationObserver(() => injectPanel());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', injectPanel);
  setTimeout(injectPanel, 300);
})();
