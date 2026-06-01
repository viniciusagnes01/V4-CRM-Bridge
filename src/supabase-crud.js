(() => {
  const STORE = 'v4_crm_bridge_internal_v3';
  const FLAG = 'v4_crm_bridge_supabase_loaded';

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); }
    catch { return {}; }
  }

  function saveLocal(next) {
    localStorage.setItem(STORE, JSON.stringify(next));
  }

  async function api(resource, method = 'GET', data = null, id = '') {
    const qs = resource ? `?resource=${encodeURIComponent(resource)}${id ? `&id=${encodeURIComponent(id)}` : ''}` : '';
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const response = await fetch('/api/db' + qs, options);
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || 'Erro no Supabase');
    return result;
  }

  async function loadAll() {
    if (sessionStorage.getItem(FLAG) === '1') return;
    try {
      const result = await api('');
      const current = readLocal();
      const next = {
        ...current,
        accounts: result.accounts || current.accounts || [],
        clients: result.clients || current.clients || [],
        integrations: result.integrations || current.integrations || [],
        logs: result.logs || current.logs || []
      };
      saveLocal(next);
      sessionStorage.setItem(FLAG, '1');
      if (typeof window.render === 'function') window.render();
    } catch (error) {
      console.warn('Supabase load failed:', error.message);
    }
  }

  async function create(resource, item) {
    const result = await api(resource, 'POST', item);
    const state = readLocal();
    state[resource] = state[resource] || [];
    state[resource].unshift(result.item);
    saveLocal(state);
    return result.item;
  }

  async function remove(resource, id) {
    await api(resource, 'DELETE', null, id);
    const state = readLocal();
    state[resource] = (state[resource] || []).filter(item => item.id !== id);
    saveLocal(state);
  }

  async function patch(resource, id, item) {
    const result = await api(resource, 'PATCH', item, id);
    const state = readLocal();
    state[resource] = (state[resource] || []).map(row => row.id === id ? result.item : row);
    saveLocal(state);
    return result.item;
  }

  function addDeleteButtons() {
    const state = readLocal();
    const screens = [
      { resource: 'accounts', key: 'email' },
      { resource: 'clients', key: 'name' },
      { resource: 'integrations', key: 'client' }
    ];
    screens.forEach(screen => {
      (state[screen.resource] || []).forEach(item => {
        if (!item.id) return;
        const cards = [...document.querySelectorAll('.item')];
        const card = cards.find(el => (el.textContent || '').includes(item[screen.key] || item.name || item.client));
        if (!card || card.querySelector(`[data-delete-id="${item.id}"]`)) return;
        const actions = card.querySelector('.item-actions') || card;
        const button = document.createElement('button');
        button.className = 'btn ghost small';
        button.type = 'button';
        button.dataset.deleteId = item.id;
        button.textContent = 'Excluir';
        button.onclick = async () => {
          if (!confirm('Excluir este registro?')) return;
          await remove(screen.resource, item.id);
          if (typeof window.render === 'function') window.render();
        };
        actions.appendChild(button);
      });
    });
  }

  function patchForms() {
    const accountForm = document.querySelector('form[onsubmit="submitAccount(event)"]');
    if (accountForm && !accountForm.dataset.supabaseCrud) {
      accountForm.dataset.supabaseCrud = '1';
      accountForm.onsubmit = async event => {
        event.preventDefault();
        await create('accounts', {
          name: document.getElementById('accountName').value,
          email: document.getElementById('accountEmail').value,
          role: document.getElementById('accountRole').value,
          status: document.getElementById('accountStatus').value
        });
        event.target.reset();
        if (typeof window.render === 'function') window.render();
      };
    }

    const clientForm = document.querySelector('form[onsubmit="submitClient(event)"]');
    if (clientForm && !clientForm.dataset.supabaseCrud) {
      clientForm.dataset.supabaseCrud = '1';
      clientForm.onsubmit = async event => {
        event.preventDefault();
        await create('clients', {
          name: document.getElementById('clientName').value,
          account: document.getElementById('clientAccount').value,
          sheet: document.getElementById('clientSheet').value,
          status: document.getElementById('clientStatus').value,
          lastSync: '',
          records: 0
        });
        event.target.reset();
        if (typeof window.render === 'function') window.render();
      };
    }

    const integrationForm = document.getElementById('integration-builder');
    if (integrationForm && !integrationForm.dataset.supabaseCrud) {
      integrationForm.dataset.supabaseCrud = '1';
      integrationForm.onsubmit = async event => {
        event.preventDefault();
        const pipelineInput = document.getElementById('integrationPipeline');
        const crm = document.getElementById('integrationCrm').value;
        await create('integrations', {
          client: document.getElementById('integrationClient').value,
          crm,
          alias: document.getElementById('integrationAlias')?.value || '',
          baseUrl: document.getElementById('integrationBaseUrl')?.value || '',
          pipeline: pipelineInput?.value || '',
          pipelineName: pipelineInput?.dataset?.pipelineName || pipelineInput?.value || '',
          trigger: document.getElementById('integrationTrigger').value,
          destination: document.getElementById('integrationDestination').value,
          frequency: 'Manual',
          writeMode: document.getElementById('integrationWriteMode')?.value || 'upsert',
          status: document.getElementById('integrationStatus').value
        });
        event.target.reset();
        if (typeof window.render === 'function') window.render();
      };
    }
  }

  function boot() {
    loadAll();
    patchForms();
    addDeleteButtons();
  }

  window.v4SupabaseCrud = { loadAll, create, remove, patch };
  const observer = new MutationObserver(boot);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', boot);
  setTimeout(boot, 500);
})();
