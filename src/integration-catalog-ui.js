(() => {
  const RESULTS_ID = 'v4-crm-catalog-results';

  function isIntegrationsPage() {
    const title = document.querySelector('.top h2');
    return title && title.textContent.trim().toLowerCase() === 'integrações crm';
  }

  function getForm() {
    return document.querySelector('form.card[onsubmit="submitIntegration(event)"]');
  }

  function relabelCredentialField(aliasInput) {
    const labels = [...document.querySelectorAll('label')];
    const currentLabel = labels.find(label => label.textContent.trim().toLowerCase() === 'alias seguro');
    if (currentLabel) currentLabel.textContent = 'Nome da credencial';
    aliasInput.placeholder = 'Ex: MOSKIT_ACCESS_KEY, KOMMO_ACCESS_TOKEN ou HUBSPOT_ACCESS_TOKEN';
  }

  function ensureDiscoveryUi() {
    if (!isIntegrationsPage()) return;
    const form = getForm();
    if (!form || document.getElementById(RESULTS_ID)) return;

    const aliasInput = document.getElementById('integrationAlias');
    const pipelineInput = document.getElementById('integrationPipeline');
    if (!aliasInput || !pipelineInput) return;

    relabelCredentialField(aliasInput);
    pipelineInput.placeholder = 'Escolha após buscar funis';
    pipelineInput.readOnly = false;

    const help = document.createElement('div');
    help.className = 'notice';
    help.innerHTML = 'Use <strong>Nome da credencial</strong> para informar a variável salva na Vercel. Exemplo: <strong>MOSKIT_ACCESS_KEY</strong>. Para teste rápido, cole uma credencial temporária abaixo; ela não será salva na integração.';
    aliasInput.insertAdjacentElement('afterend', help);

    const secretWrap = document.createElement('div');
    secretWrap.innerHTML = `
      <label>Credencial temporária para buscar funis</label>
      <input id="integrationSecret" type="password" placeholder="Token/API key/webhook URL temporário">
      <label>Base URL / Webhook URL, quando necessário</label>
      <input id="integrationBaseUrl" placeholder="Ex: https://seudominio.bitrix24.com.br/rest/...">
      <div class="actions form-actions">
        <button class="btn secondary" type="button" id="v4-fetch-pipelines">Buscar funis e etapas</button>
      </div>
      <pre id="${RESULTS_ID}" style="white-space:pre-wrap;word-break:break-word;margin-top:10px;max-height:280px;overflow:auto;background:#080a08;border:1px solid var(--line);border-radius:14px;padding:14px;color:var(--text);">Selecione um CRM e clique em Buscar funis e etapas.</pre>
    `;
    pipelineInput.insertAdjacentElement('afterend', secretWrap);

    document.getElementById('v4-fetch-pipelines').addEventListener('click', loadPipelines);
  }

  function optionLabel(stage) {
    return `${stage.name || stage.id} (${stage.id})`;
  }

  function renderCatalog(data) {
    const out = document.getElementById(RESULTS_ID);
    const pipelineInput = document.getElementById('integrationPipeline');
    if (!out) return;

    if (!data || !data.ok) {
      out.textContent = JSON.stringify(data, null, 2);
      return;
    }

    const pipelines = data.pipelines || [];
    if (!pipelines.length) {
      out.textContent = 'Nenhum funil retornado pelo CRM.';
      return;
    }

    const html = pipelines.map((pipeline, index) => {
      const stages = pipeline.stages || [];
      return [
        `${index + 1}. ${pipeline.name} (${pipeline.id})`,
        ...stages.map(stage => `   - ${optionLabel(stage)}`)
      ].join('\n');
    }).join('\n\n');

    out.textContent = html;

    const selectorId = 'v4-pipeline-selector';
    let selector = document.getElementById(selectorId);
    if (!selector) {
      selector = document.createElement('select');
      selector.id = selectorId;
      selector.style.marginTop = '10px';
      pipelineInput.insertAdjacentElement('afterend', selector);
      selector.addEventListener('change', () => {
        const selected = pipelines[Number(selector.value)];
        if (!selected) return;
        pipelineInput.value = selected.id;
        pipelineInput.dataset.pipelineName = selected.name;
      });
    }

    selector.innerHTML = pipelines.map((pipeline, index) => `<option value="${index}">${pipeline.name} · ${pipeline.id}</option>`).join('');
    selector.dispatchEvent(new Event('change'));
  }

  async function loadPipelines() {
    const out = document.getElementById(RESULTS_ID);
    const crm = document.getElementById('integrationCrm')?.value || '';
    const credentialAlias = document.getElementById('integrationAlias')?.value || '';
    const secret = document.getElementById('integrationSecret')?.value || '';
    const baseUrl = document.getElementById('integrationBaseUrl')?.value || '';

    if (out) out.textContent = 'Buscando funis e etapas...';

    try {
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm, credentialAlias, secret, baseUrl })
      });
      const data = await response.json();
      renderCatalog(data);
    } catch (error) {
      if (out) out.textContent = JSON.stringify({ ok: false, message: error.message }, null, 2);
    }
  }

  const observer = new MutationObserver(ensureDiscoveryUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', ensureDiscoveryUi);
  setTimeout(ensureDiscoveryUi, 300);
})();
