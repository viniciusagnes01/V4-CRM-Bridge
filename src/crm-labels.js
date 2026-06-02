(() => {
  function selectedCrm() {
    const input = document.getElementById('integrationCrm');
    const selectedCard = document.querySelector('[data-crm-app].selected');
    return selectedCard?.dataset?.crmApp || input?.value || '';
  }

  function defaultConnectionName(crm) {
    const value = String(crm || '').toLowerCase();
    if (value.includes('kommo')) return 'Kommo';
    if (value.includes('moskit')) return 'Moskit';
    if (value.includes('hubspot')) return 'HubSpot';
    if (value.includes('pipe')) return 'PipeDrive';
    if (value.includes('bitrix')) return 'Bitrix';
    if (value.includes('sults')) return 'SULTS';
    if (value.includes('c2s') || value.includes('contact')) return 'C2S / Contact2Sale';
    return 'CRM';
  }

  function applyLabels() {
    const crm = selectedCrm();
    const readable = defaultConnectionName(crm);
    const title = document.getElementById('connect-title');
    const subtitle = document.getElementById('connect-subtitle');
    const alias = document.getElementById('integrationAlias');
    const baseUrl = document.getElementById('integrationBaseUrl');
    const secret = document.getElementById('integrationSecret');

    if (title) title.textContent = crm ? `Conectar ${readable}` : 'Conecte sua conta CRM';
    if (subtitle) subtitle.textContent = 'Informe os dados de conexão deste cliente. Depois de salvo, a sincronização usa essa integração automaticamente.';

    document.querySelectorAll('label').forEach(label => {
      const text = label.textContent.trim().toLowerCase();
      if (text === 'nome da credencial salva') label.textContent = 'Nome interno da conexão';
      if (text === 'credencial temporária') label.textContent = 'Credencial para buscar funis';
      if (text.includes('base url')) label.textContent = readable === 'Kommo' ? 'URL da conta Kommo' : 'Base URL / Webhook URL quando necessário';
    });

    if (alias) {
      alias.placeholder = `Ex: ${readable} ${new Date().getFullYear()}`;
      if (/^(MOSKIT_ACCESS_KEY|KOMMO_ACCESS_TOKEN|HUBSPOT_ACCESS_TOKEN|PIPEDRIVE_API_TOKEN|BITRIX_WEBHOOK_URL)$/.test(alias.value || '')) {
        alias.value = `${readable} principal`;
      }
    }
    if (baseUrl) {
      baseUrl.placeholder = readable === 'Kommo' ? 'Ex: https://suaempresa.kommo.com' : 'Ex: URL base ou webhook do CRM';
    }
    if (secret) {
      secret.placeholder = 'Cole aqui o token/API key para buscar funis';
    }
  }

  const originalSelect = window.selectIntegrationCrm;
  window.selectIntegrationCrm = function patchedSelectIntegrationCrm(crm) {
    if (typeof originalSelect === 'function') originalSelect(crm);
    setTimeout(applyLabels, 0);
  };

  const observer = new MutationObserver(applyLabels);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', applyLabels);
  setTimeout(applyLabels, 300);
})();
