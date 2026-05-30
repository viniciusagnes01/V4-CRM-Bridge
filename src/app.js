const STORE = 'v4_crm_bridge_internal_v2';

const tabs = [
  { id: 'dashboard', label: 'Visão Geral', title: 'Visão Geral', subtitle: 'Cockpit interno para integração entre CRM, GrowthPack e BASE_CRM.', icon: 'i-dashboard', color: 'v4' },
  { id: 'accounts', label: 'Accounts', title: 'Accounts', subtitle: 'Gestão dos responsáveis por clientes e projetos da unidade.', icon: 'i-accounts', color: 'blue' },
  { id: 'clients', label: 'Clientes', title: 'Clientes e Projetos', subtitle: 'Cadastro operacional dos GrowthPacks que receberão dados de CRM.', icon: 'i-clients', color: 'orange' },
  { id: 'integrations', label: 'Integrações', title: 'Integrações CRM', subtitle: 'Configuração de CRM, funil, etapas e credencial segura por cliente.', icon: 'i-crm', color: 'v4' },
  { id: 'mapping', label: 'Mapeamento', title: 'Mapeamento BASE_CRM', subtitle: 'Padronização dos campos de CRM para o modelo V4.', icon: 'i-map', color: 'blue' },
  { id: 'sync', label: 'Sincronização', title: 'Sincronização', subtitle: 'Execução controlada de coleta, normalização e envio para a BASE_CRM.', icon: 'i-sync', color: 'v4' },
  { id: 'audit', label: 'Auditoria', title: 'Auditoria de Funil', subtitle: 'Validação de riscos, campos obrigatórios e gargalos comerciais.', icon: 'i-audit', color: 'red' },
  { id: 'logs', label: 'Logs', title: 'Logs Operacionais', subtitle: 'Histórico de ações, sincronizações e falhas do sistema.', icon: 'i-logs', color: 'orange' },
  { id: 'settings', label: 'Configurações', title: 'Configurações', subtitle: 'Parâmetros internos do cockpit da unidade V4 Company.', icon: 'i-settings', color: 'blue' }
];

const baseFields = [
  ['Data', 'created_at', 'Data de criação, entrada ou movimentação do lead'],
  ['Lead ID', 'id', 'Identificador único do registro no CRM'],
  ['Nome', 'name', 'Nome do lead, contato ou oportunidade'],
  ['Valor', 'value', 'Valor da oportunidade ou venda'],
  ['LEAD', 'stage_lead', 'Indicador da etapa Lead'],
  ['MQL', 'stage_mql', 'Indicador da etapa MQL'],
  ['SQL', 'stage_sql', 'Indicador da etapa SQL'],
  ['OPORTUNIDADE', 'stage_opportunity', 'Indicador da etapa Oportunidade'],
  ['COMPRA', 'stage_won', 'Indicador de compra ou ganho'],
  ['LEAD PERDIDO', 'stage_lost', 'Indicador de perda'],
  ['META ADS', 'source_meta', 'Origem Meta, Facebook ou Instagram'],
  ['GOOGLE ADS', 'source_google', 'Origem Google Ads'],
  ['RESPONSAVEL', 'owner', 'Responsável comercial pelo registro'],
  ['MOTIVO DE PERDA', 'loss_reason', 'Motivo informado para perda']
];

const initialState = {
  tab: 'dashboard',
  accounts: [],
  clients: [],
  integrations: [],
  logs: [],
  audit: [],
  settings: {
    operator: 'Vinicius Agnes',
    email: 'vinicius.agnes@v4company.com',
    unit: 'V4 Company',
    backend: 'https://v4-crm-bridge.vercel.app/api/sync'
  }
};

function getState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORE) || '{}') };
  } catch {
    return { ...initialState };
  }
}

function setState(nextState) {
  localStorage.setItem(STORE, JSON.stringify(nextState));
  render();
}

function addLog(type, message) {
  const state = getState();
  state.logs.unshift({ type, message, at: new Date().toLocaleString('pt-BR') });
  setState(state);
}

function setTab(tabId) {
  const state = getState();
  state.tab = tabId;
  setState(state);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function icon(tab) {
  return `<span class="icon ${tab.color} ${tab.icon}"></span>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function seedInternalBase() {
  const state = getState();
  state.accounts = [
    { name: 'Vinicius Agnes', email: 'vinicius.agnes@v4company.com', role: 'Admin', status: 'Ativo' },
    { name: 'Account V4', email: 'account@v4company.com', role: 'Account', status: 'Ativo' }
  ];
  state.clients = [
    { name: 'ST1 Internet', account: 'vinicius.agnes@v4company.com', sheet: 'GrowthPack ST1 Internet', status: 'Ativo', lastSync: '', records: 0 },
    { name: 'Cliente Piloto', account: 'account@v4company.com', sheet: 'GrowthPack Cliente Piloto', status: 'Implantação', lastSync: '', records: 0 }
  ];
  state.integrations = [
    { client: 'ST1 Internet', crm: 'Kommo', alias: 'st1_kommo', pipeline: 'Inside Sales', status: 'Ativo' }
  ];
  state.logs.unshift({ type: 'success', message: 'Base interna de exemplo carregada.', at: new Date().toLocaleString('pt-BR') });
  setState(state);
}

function exportState() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'v4-crm-bridge-base.json';
  link.click();
}

function submitAccount(event) {
  event.preventDefault();
  const state = getState();
  state.accounts.unshift({
    name: document.getElementById('accountName').value,
    email: document.getElementById('accountEmail').value,
    role: document.getElementById('accountRole').value,
    status: document.getElementById('accountStatus').value
  });
  event.target.reset();
  setState(state);
  addLog('success', 'Account cadastrado com sucesso.');
}

function submitClient(event) {
  event.preventDefault();
  const state = getState();
  state.clients.unshift({
    name: document.getElementById('clientName').value,
    account: document.getElementById('clientAccount').value,
    sheet: document.getElementById('clientSheet').value,
    status: document.getElementById('clientStatus').value,
    lastSync: '',
    records: 0
  });
  event.target.reset();
  setState(state);
  addLog('success', 'Cliente cadastrado com sucesso.');
}

function submitIntegration(event) {
  event.preventDefault();
  const state = getState();
  state.integrations.unshift({
    client: document.getElementById('integrationClient').value,
    crm: document.getElementById('integrationCrm').value,
    alias: document.getElementById('integrationAlias').value,
    pipeline: document.getElementById('integrationPipeline').value,
    status: document.getElementById('integrationStatus').value
  });
  event.target.reset();
  setState(state);
  addLog('success', 'Integração cadastrada com sucesso.');
}

function syncClient(clientName) {
  const state = getState();
  const client = state.clients.find(item => item.name === clientName);
  if (!client) return;
  client.lastSync = new Date().toLocaleString('pt-BR');
  client.records = Math.floor(Math.random() * 120) + 15;
  setState(state);
  addLog('success', `Sincronização de prévia executada para ${clientName}.`);
}

function syncAll() {
  const state = getState();
  state.clients.filter(client => client.status !== 'Pausado').forEach(client => {
    client.lastSync = new Date().toLocaleString('pt-BR');
    client.records = Math.floor(Math.random() * 120) + 15;
  });
  setState(state);
  addLog('success', 'Sincronização em lote executada em modo prévia.');
}

function runAudit() {
  const state = getState();
  const findings = [];
  state.clients.forEach(client => {
    const integration = state.integrations.find(item => item.client === client.name);
    if (!integration) findings.push([client.name, 'Cliente sem integração CRM ativa', 'Cadastrar integração e validar funil', 'Alta']);
    if (!client.sheet) findings.push([client.name, 'GrowthPack não informado', 'Cadastrar planilha destino', 'Alta']);
    if (client.status === 'Implantação') findings.push([client.name, 'Cliente em implantação', 'Validar credenciais, funil e BASE_CRM', 'Média']);
  });
  state.audit = findings;
  setState(state);
  addLog('success', 'Auditoria operacional executada.');
}

function saveSettings(event) {
  event.preventDefault();
  const state = getState();
  state.settings.operator = document.getElementById('settingOperator').value;
  state.settings.email = document.getElementById('settingEmail').value;
  state.settings.unit = document.getElementById('settingUnit').value;
  state.settings.backend = document.getElementById('settingBackend').value;
  setState(state);
  addLog('success', 'Configurações atualizadas.');
}

function layout(content) {
  const state = getState();
  const current = tabs.find(tab => tab.id === state.tab) || tabs[0];
  return `
    <div class="shell">
      <aside class="side">
        <div class="brand">
          <div class="mark">V4</div>
          <div>
            <h1>CRM Bridge</h1>
            <p>Cockpit interno V4 Company</p>
          </div>
        </div>
        <nav class="nav">
          ${tabs.map(tab => `<button class="${state.tab === tab.id ? 'active' : ''}" onclick="setTab('${tab.id}')">${icon(tab)}<span>${tab.label}</span></button>`).join('')}
        </nav>
        <div class="operator-card">
          <strong>${escapeHtml(state.settings.operator)}</strong>
          <span>${escapeHtml(state.settings.email)}</span>
          <small>${escapeHtml(state.settings.unit)}</small>
          <button class="btn secondary full" onclick="seedInternalBase()">Carregar base de exemplo</button>
          <button class="btn ghost full" onclick="exportState()">Exportar base local</button>
        </div>
      </aside>
      <main class="main">
        <header class="top">
          <div>
            <h2>${current.title}</h2>
            <p>${current.subtitle}</p>
          </div>
          <div class="actions">
            <button class="btn primary" onclick="setTab('sync')">Executar sincronização</button>
            <button class="btn secondary" onclick="setTab('clients')">Cadastrar cliente</button>
          </div>
        </header>
        ${content}
        <footer class="footer">V4 CRM Bridge · Uso interno V4 Company · Coleta, organização, auditoria e sincronização controlada.</footer>
      </main>
    </div>
  `;
}

function pageDashboard() {
  const state = getState();
  const activeClients = state.clients.filter(item => item.status === 'Ativo').length;
  const activeIntegrations = state.integrations.filter(item => item.status === 'Ativo').length;
  return `
    <section class="hero-card">
      <div>
        <span class="eyebrow">Sistema interno de integrações</span>
        <h1>CRM, GrowthPack e BASE_CRM em uma operação única.</h1>
        <p>Centralize accounts, clientes, integrações, mapeamento, sincronização e auditoria de funil em um cockpit operacional para a unidade V4 Company.</p>
      </div>
    </section>
    <section class="kpis">
      <div class="kpi"><small>Accounts</small><b>${state.accounts.length}</b><span>responsáveis cadastrados</span></div>
      <div class="kpi"><small>Clientes ativos</small><b>${activeClients}</b><span>${state.clients.length} clientes no total</span></div>
      <div class="kpi"><small>Integrações ativas</small><b>${activeIntegrations}</b><span>${state.integrations.length} conexões cadastradas</span></div>
      <div class="kpi"><small>Logs</small><b>${state.logs.length}</b><span>eventos operacionais</span></div>
    </section>
    <section class="grid two">
      <div class="card tall">
        <h3>Matriz operacional V4</h3>
        <p class="muted">Automatizar coleta, organização, normalização, logs e auditoria. Manter validação humana para promessa ao cliente, orçamento, decisões estratégicas e alterações críticas no CRM.</p>
        <div class="matrix">
          <div><strong>Automatizar</strong><span>Coleta de dados, normalização e envio para BASE_CRM.</span></div>
          <div><strong>Semi-automatizar</strong><span>Health Score, FCA e recomendações de tarefa.</span></div>
          <div><strong>Validar manualmente</strong><span>Decisões comerciais, orçamento e comunicações sensíveis.</span></div>
        </div>
      </div>
      <div class="card logs-card">
        <h3>Últimos logs</h3>
        <div class="logs">
          ${state.logs.slice(0, 6).map(log => `<div class="log ${log.type}"><strong>${log.type}</strong><span>${escapeHtml(log.message)}</span><small>${log.at}</small></div>`).join('') || '<div class="empty">Nenhum evento registrado.</div>'}
        </div>
      </div>
    </section>
  `;
}

function pageAccounts() {
  const state = getState();
  return `
    <section class="grid two">
      <form class="card" onsubmit="submitAccount(event)">
        <h3>Novo account</h3>
        <label>Nome</label><input id="accountName" required placeholder="Nome do account">
        <label>E-mail V4</label><input id="accountEmail" required placeholder="nome@v4company.com">
        <div class="form2">
          <div><label>Perfil</label><select id="accountRole"><option>Admin</option><option>Account</option><option>Viewer</option></select></div>
          <div><label>Status</label><select id="accountStatus"><option>Ativo</option><option>Pausado</option></select></div>
        </div>
        <div class="actions form-actions"><button class="btn primary">Salvar account</button></div>
      </form>
      <div class="card">
        <h3>Accounts cadastrados</h3>
        <div class="list">${state.accounts.map(account => `<article class="item"><div><h4>${escapeHtml(account.name)}</h4><p>${escapeHtml(account.email)}</p><span class="pill">${escapeHtml(account.role)}</span></div></article>`).join('') || '<div class="empty">Nenhum account cadastrado.</div>'}</div>
      </div>
    </section>
  `;
}

function pageClients() {
  const state = getState();
  return `
    <section class="grid two">
      <form class="card" onsubmit="submitClient(event)">
        <h3>Novo cliente ou projeto</h3>
        <label>Cliente</label><input id="clientName" required placeholder="Nome do cliente">
        <label>Account responsável</label><select id="clientAccount">${state.accounts.map(account => `<option>${escapeHtml(account.email)}</option>`).join('')}</select>
        <label>GrowthPack</label><input id="clientSheet" required placeholder="URL ou identificação da planilha">
        <label>Status</label><select id="clientStatus"><option>Ativo</option><option>Implantação</option><option>Pausado</option><option>Churn</option></select>
        <div class="actions form-actions"><button class="btn primary">Salvar cliente</button></div>
      </form>
      <div class="card">
        <h3>Clientes cadastrados</h3>
        <div class="list">${state.clients.map(client => `<article class="item"><div><h4>${escapeHtml(client.name)}</h4><p>${escapeHtml(client.account)}</p><p>${escapeHtml(client.sheet)}</p><span class="pill">${escapeHtml(client.status)}</span></div><div class="item-actions"><button class="btn secondary small" onclick="syncClient('${escapeHtml(client.name)}')">Sincronizar</button></div></article>`).join('') || '<div class="empty">Nenhum cliente cadastrado.</div>'}</div>
      </div>
    </section>
  `;
}

function pageIntegrations() {
  const state = getState();
  return `
    <section class="grid two">
      <form class="card" onsubmit="submitIntegration(event)">
        <h3>Nova integração CRM</h3>
        <label>Cliente</label><select id="integrationClient">${state.clients.map(client => `<option>${escapeHtml(client.name)}</option>`).join('')}</select>
        <div class="form2">
          <div><label>CRM</label><select id="integrationCrm"><option>Kommo</option><option>RD Station</option><option>HubSpot</option><option>Moskit</option><option>IXC</option><option>OPA</option></select></div>
          <div><label>Status</label><select id="integrationStatus"><option>Ativo</option><option>Pendente</option><option>Erro</option><option>Pausado</option></select></div>
        </div>
        <label>Alias da credencial segura</label><input id="integrationAlias" required placeholder="identificador interno da credencial">
        <label>Pipeline ou funil</label><input id="integrationPipeline" placeholder="Nome ou ID do funil">
        <div class="actions form-actions"><button class="btn primary">Salvar integração</button></div>
      </form>
      <div class="card">
        <h3>Integrações cadastradas</h3>
        <div class="list">${state.integrations.map(item => `<article class="item"><div><h4>${escapeHtml(item.client)}</h4><p>${escapeHtml(item.crm)} · ${escapeHtml(item.pipeline || 'Funil não informado')}</p><p>Credencial: ${escapeHtml(item.alias)}</p><span class="pill">${escapeHtml(item.status)}</span></div></article>`).join('') || '<div class="empty">Nenhuma integração cadastrada.</div>'}</div>
      </div>
    </section>
  `;
}

function pageMapping() {
  return `
    <section class="card">
      <h3>Contrato BASE_CRM</h3>
      <p class="muted">Campos padronizados usados para consolidar dados de CRMs diferentes dentro dos GrowthPacks.</p>
      <div class="table"><table><thead><tr><th>Campo V4</th><th>Campo origem sugerido</th><th>Uso operacional</th></tr></thead><tbody>${baseFields.map(field => `<tr><td>${field[0]}</td><td><input value="${field[1]}"></td><td>${field[2]}</td></tr>`).join('')}</tbody></table></div>
    </section>
  `;
}

function pageSync() {
  const state = getState();
  return `
    <section class="card">
      <div class="section-head"><div><h3>Fila de sincronização</h3><p class="muted">Execute prévias ou sincronizações reais pelo backend configurado.</p></div><button class="btn primary" onclick="syncAll()">Sincronizar todos</button></div>
      <div class="table"><table><thead><tr><th>Cliente</th><th>Status</th><th>Último sync</th><th>Registros</th><th>Ação</th></tr></thead><tbody>${state.clients.map(client => `<tr><td>${escapeHtml(client.name)}</td><td>${escapeHtml(client.status)}</td><td>${client.lastSync || '-'}</td><td>${client.records || 0}</td><td><button class="btn secondary small" onclick="syncClient('${escapeHtml(client.name)}')">Sincronizar</button></td></tr>`).join('')}</tbody></table></div>
    </section>
  `;
}

function pageAudit() {
  const state = getState();
  return `
    <section class="card">
      <div class="section-head"><div><h3>Auditoria operacional</h3><p class="muted">Validação rápida para identificar riscos antes dos check-ins.</p></div><button class="btn primary" onclick="runAudit()">Rodar auditoria</button></div>
    </section>
    <section class="card">
      <div class="table"><table><thead><tr><th>Cliente</th><th>Problema</th><th>Ação corretiva</th><th>Severidade</th></tr></thead><tbody>${state.audit.map(item => `<tr><td>${escapeHtml(item[0])}</td><td>${escapeHtml(item[1])}</td><td>${escapeHtml(item[2])}</td><td>${escapeHtml(item[3])}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum achado registrado.</td></tr>'}</tbody></table></div>
    </section>
  `;
}

function pageLogs() {
  const state = getState();
  return `
    <section class="card">
      <h3>Logs operacionais</h3>
      <div class="logs full-logs">${state.logs.map(log => `<div class="log ${log.type}"><strong>${log.type}</strong><span>${escapeHtml(log.message)}</span><small>${log.at}</small></div>`).join('') || '<div class="empty">Nenhum log registrado.</div>'}</div>
    </section>
  `;
}

function pageSettings() {
  const state = getState();
  return `
    <form class="card settings-form" onsubmit="saveSettings(event)">
      <h3>Configurações da unidade</h3>
      <label>Operador</label><input id="settingOperator" value="${escapeHtml(state.settings.operator)}">
      <label>E-mail</label><input id="settingEmail" value="${escapeHtml(state.settings.email)}">
      <label>Unidade</label><input id="settingUnit" value="${escapeHtml(state.settings.unit)}">
      <label>Backend</label><input id="settingBackend" value="${escapeHtml(state.settings.backend)}">
      <div class="actions form-actions"><button class="btn primary">Salvar configurações</button></div>
    </form>
  `;
}

function render() {
  const state = getState();
  const pages = {
    dashboard: pageDashboard,
    accounts: pageAccounts,
    clients: pageClients,
    integrations: pageIntegrations,
    mapping: pageMapping,
    sync: pageSync,
    audit: pageAudit,
    logs: pageLogs,
    settings: pageSettings
  };
  document.getElementById('app').innerHTML = layout((pages[state.tab] || pageDashboard)());
}

window.setTab = setTab;
window.seedInternalBase = seedInternalBase;
window.exportState = exportState;
window.submitAccount = submitAccount;
window.submitClient = submitClient;
window.submitIntegration = submitIntegration;
window.syncClient = syncClient;
window.syncAll = syncAll;
window.runAudit = runAudit;
window.saveSettings = saveSettings;

render();