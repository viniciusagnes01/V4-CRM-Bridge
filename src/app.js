const STORE = 'v4_crm_bridge_internal_v3';

const crmApps = [
  { id: 'Moskit', name: 'Moskit', badge: 'MOS', description: 'Negócios, funis, etapas e responsáveis.', available: true },
  { id: 'Kommo', name: 'Kommo', badge: 'KOM', description: 'Leads, pipelines e status do Kommo.', available: true },
  { id: 'HubSpot', name: 'HubSpot', badge: 'HUB', description: 'Deals, pipelines e estágios.', available: true },
  { id: 'PipeDrive', name: 'PipeDrive', badge: 'PIP', description: 'Negócios, pipelines e stages.', available: true },
  { id: 'Bitrix', name: 'Bitrix', badge: 'BIT', description: 'Deals, categorias e estágios.', available: true },
  { id: 'SULTS', name: 'SULTS', badge: 'SUL', description: 'Conector em preparação.', available: false },
  { id: 'C2S / Contact2Sale', name: 'C2S / Contact2Sale', badge: 'C2S', description: 'Conector em preparação.', available: false },
  { id: 'RD Station', name: 'RD Station', badge: 'RD', description: 'Conector futuro.', available: false },
  { id: 'IXC', name: 'IXC', badge: 'IXC', description: 'Conector futuro.', available: false },
  { id: 'OPA', name: 'OPA', badge: 'OPA', description: 'Conector futuro.', available: false }
];

const crmOptions = crmApps.map(app => app.name);

const tabs = [
  { id: 'dashboard', label: 'Visão Geral', title: 'Visão Geral', subtitle: 'Operação CRM, GrowthPack e BASE_CRM.', icon: 'i-dashboard', color: 'v4' },
  { id: 'accounts', label: 'Accounts', title: 'Accounts', subtitle: 'Responsáveis por clientes e projetos.', icon: 'i-accounts', color: 'blue' },
  { id: 'clients', label: 'Clientes', title: 'Clientes', subtitle: 'GrowthPacks e projetos conectados.', icon: 'i-clients', color: 'orange' },
  { id: 'integrations', label: 'Integrações', title: 'Integrações CRM', subtitle: 'Conecte apps, escolha funis, mapeie campos e ative automações.', icon: 'i-crm', color: 'v4' },
  { id: 'mapping', label: 'Mapeamento', title: 'Mapeamento', subtitle: 'Contrato de campos da BASE_CRM.', icon: 'i-map', color: 'blue' },
  { id: 'sync', label: 'Sincronização', title: 'Sincronização', subtitle: 'Coleta, normalização e envio controlado.', icon: 'i-sync', color: 'v4' },
  { id: 'audit', label: 'Auditoria', title: 'Auditoria', subtitle: 'Riscos, pendências e qualidade do funil.', icon: 'i-audit', color: 'red' },
  { id: 'logs', label: 'Logs', title: 'Logs', subtitle: 'Histórico operacional do sistema.', icon: 'i-logs', color: 'orange' },
  { id: 'settings', label: 'Configurações', title: 'Configurações', subtitle: 'Parâmetros da unidade.', icon: 'i-settings', color: 'blue' }
];

const baseFields = [
  ['Data', 'created_at', 'Data do registro'],
  ['Lead ID', 'id', 'Chave única'],
  ['Nome', 'name', 'Lead ou oportunidade'],
  ['Nome da Empresa', 'companyName', 'Empresa ou negócio'],
  ['Valor', 'value', 'Valor comercial'],
  ['LEAD', 'stage_lead', 'Etapa Lead'],
  ['MQL', 'stage_mql', 'Etapa MQL'],
  ['SQL', 'stage_sql', 'Etapa SQL'],
  ['OPORTUNIDADE', 'stage_opportunity', 'Etapa oportunidade'],
  ['COMPRA', 'stage_won', 'Ganho'],
  ['LEAD PERDIDO', 'stage_lost', 'Perdido'],
  ['META ADS', 'source_meta', 'Origem Meta'],
  ['GOOGLE ADS', 'source_google', 'Origem Google'],
  ['RESPONSAVEL', 'owner', 'Dono do lead'],
  ['MOTIVO DE PERDA', 'loss_reason', 'Motivo registrado']
];

const defaultCredentialNames = {
  Moskit: 'MOSKIT_ACCESS_KEY',
  Kommo: 'KOMMO_ACCESS_TOKEN',
  HubSpot: 'HUBSPOT_ACCESS_TOKEN',
  PipeDrive: 'PIPEDRIVE_API_TOKEN',
  Bitrix: 'BITRIX_WEBHOOK_URL'
};

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
    const stored = JSON.parse(localStorage.getItem(STORE) || '{}');
    return { ...initialState, ...stored, settings: { ...initialState.settings, ...(stored.settings || {}) } };
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

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('ativo') || value.includes('success')) return 'ok';
  if (value.includes('erro') || value.includes('alta')) return 'danger';
  if (value.includes('implant') || value.includes('pendente') || value.includes('média')) return 'warn';
  return 'neutral';
}

function seedInternalBase() {
  const state = getState();
  state.accounts = [
    { name: 'Vinicius Agnes', email: 'vinicius.agnes@v4company.com', role: 'Admin', status: 'Ativo' },
    { name: 'Account V4', email: 'account@v4company.com', role: 'Account', status: 'Ativo' }
  ];
  state.clients = [
    { name: 'YouSafer', account: 'vinicius.agnes@v4company.com', sheet: 'GrowthPack V26', status: 'Ativo', lastSync: '', records: 0 },
    { name: 'ST1 Internet', account: 'vinicius.agnes@v4company.com', sheet: 'GrowthPack ST1 Internet', status: 'Ativo', lastSync: '', records: 0 },
    { name: 'Cliente Piloto', account: 'account@v4company.com', sheet: 'GrowthPack Cliente Piloto', status: 'Implantação', lastSync: '', records: 0 }
  ];
  state.integrations = [
    { client: 'YouSafer', crm: 'Moskit', alias: 'MOSKIT_ACCESS_KEY', pipeline: 'v4-trafego', pipelineName: 'V4 - Tráfego', trigger: 'Todos os negócios do funil', destination: 'TESTE_BASE_CRM', frequency: 'A cada 10 minutos', status: 'Ativo' }
  ];
  state.logs.unshift({ type: 'success', message: 'Base de exemplo carregada.', at: new Date().toLocaleString('pt-BR') });
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
  addLog('success', 'Account cadastrado.');
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
  addLog('success', 'Cliente cadastrado.');
}

function selectedPipelineName() {
  const pipelineInput = document.getElementById('integrationPipeline');
  return pipelineInput?.dataset?.pipelineName || pipelineInput?.value || '';
}

function submitIntegration(event) {
  event.preventDefault();
  const state = getState();
  const crm = document.getElementById('integrationCrm').value;
  const pipelineName = selectedPipelineName();
  state.integrations.unshift({
    client: document.getElementById('integrationClient').value,
    crm,
    alias: document.getElementById('integrationAlias').value || defaultCredentialNames[crm] || '',
    pipeline: document.getElementById('integrationPipeline').value,
    pipelineName,
    trigger: document.getElementById('integrationTrigger').value,
    destination: document.getElementById('integrationDestination').value,
    frequency: document.getElementById('integrationFrequency').value,
    status: document.getElementById('integrationStatus').value
  });
  event.target.reset();
  setState(state);
  addLog('success', `Automação ${crm} → BASE_CRM cadastrada.`);
}

function syncClient(clientName) {
  const state = getState();
  const client = state.clients.find(item => item.name === clientName);
  if (!client) return;
  client.lastSync = new Date().toLocaleString('pt-BR');
  client.records = Math.floor(Math.random() * 120) + 15;
  setState(state);
  addLog('success', `Prévia de sync: ${clientName}.`);
}

function syncAll() {
  const state = getState();
  state.clients.filter(client => client.status !== 'Pausado').forEach(client => {
    client.lastSync = new Date().toLocaleString('pt-BR');
    client.records = Math.floor(Math.random() * 120) + 15;
  });
  setState(state);
  addLog('success', 'Sync em lote executado em prévia.');
}

function runAudit() {
  const state = getState();
  const findings = [];
  state.clients.forEach(client => {
    const integration = state.integrations.find(item => item.client === client.name);
    if (!integration) findings.push([client.name, 'Sem CRM ativo', 'Cadastrar integração', 'Alta']);
    if (!client.sheet) findings.push([client.name, 'Sem GrowthPack', 'Informar planilha destino', 'Alta']);
    if (client.status === 'Implantação') findings.push([client.name, 'Em implantação', 'Validar funil e BASE_CRM', 'Média']);
  });
  state.audit = findings;
  setState(state);
  addLog('success', 'Auditoria executada.');
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
            <p>Unidade V4 Company</p>
          </div>
        </div>
        <nav class="nav">
          ${tabs.map(tab => `<button class="${state.tab === tab.id ? 'active' : ''}" onclick="setTab('${tab.id}')">${icon(tab)}<span>${tab.label}</span></button>`).join('')}
        </nav>
        <div class="operator-card">
          <strong>${escapeHtml(state.settings.operator)}</strong>
          <span>${escapeHtml(state.settings.email)}</span>
          <div class="operator-actions">
            <button class="btn secondary full" onclick="seedInternalBase()">Base exemplo</button>
            <button class="btn ghost full" onclick="exportState()">Exportar</button>
          </div>
        </div>
      </aside>
      <main class="main">
        <header class="top">
          <div>
            <h2>${current.title}</h2>
            <p>${current.subtitle}</p>
          </div>
          <div class="actions">
            <button class="btn primary" onclick="setTab('sync')">Sincronizar</button>
            <button class="btn secondary" onclick="setTab('clients')">Novo cliente</button>
          </div>
        </header>
        ${content}
      </main>
    </div>
  `;
}

function progress(label, value) {
  return `<div class="progress-row"><span>${label}</span><div><i style="width:${value}%"></i></div><b>${value}%</b></div>`;
}

function pageDashboard() {
  const state = getState();
  const activeClients = state.clients.filter(item => item.status === 'Ativo').length;
  const activeIntegrations = state.integrations.filter(item => item.status === 'Ativo').length;
  const auditCount = state.audit.length;
  return `
    <section class="hero-clean">
      <div>
        <span class="eyebrow">Operação integrada</span>
        <h1>CRM → GrowthPack → BASE_CRM</h1>
      </div>
      <div class="hero-actions">
        <button class="btn primary" onclick="syncAll()">Rodar prévia</button>
        <button class="btn secondary" onclick="runAudit()">Auditar</button>
      </div>
    </section>

    <section class="kpis">
      <div class="kpi"><small>Accounts</small><b>${state.accounts.length}</b><span>Cadastrados</span></div>
      <div class="kpi"><small>Clientes</small><b>${activeClients}</b><span>${state.clients.length} no total</span></div>
      <div class="kpi"><small>Integrações</small><b>${activeIntegrations}</b><span>${state.integrations.length} conexões</span></div>
      <div class="kpi"><small>Pendências</small><b>${auditCount}</b><span>Auditoria</span></div>
    </section>

    <section class="dashboard-grid">
      <div class="card visual-card">
        <div class="card-head"><h3>Saúde da operação</h3><button class="btn ghost small" onclick="runAudit()">Atualizar</button></div>
        <div class="progress-list">
          ${progress('Cadastro', Math.min(100, state.clients.length * 35))}
          ${progress('Integrações', Math.min(100, state.integrations.length * 45))}
          ${progress('Auditoria', auditCount ? 40 : 100)}
          ${progress('Logs', Math.min(100, state.logs.length * 12))}
        </div>
      </div>

      <div class="card visual-card">
        <div class="card-head"><h3>Próximas ações</h3><span class="chip">V4</span></div>
        <div class="action-list">
          <button onclick="setTab('clients')"><span>Cadastrar cliente</span><b>GrowthPack</b></button>
          <button onclick="setTab('integrations')"><span>Conectar CRM</span><b>App + funil</b></button>
          <button onclick="setTab('mapping')"><span>Validar campos</span><b>BASE_CRM</b></button>
        </div>
      </div>

      <div class="card visual-card logs-card">
        <div class="card-head"><h3>Logs recentes</h3><button class="btn ghost small" onclick="setTab('logs')">Ver todos</button></div>
        <div class="logs compact">
          ${state.logs.slice(0, 5).map(log => `<div class="log ${log.type}"><strong>${escapeHtml(log.type)}</strong><span>${escapeHtml(log.message)}</span><small>${log.at}</small></div>`).join('') || '<div class="empty">Sem eventos.</div>'}
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
        <div class="actions form-actions"><button class="btn primary">Salvar</button></div>
      </form>
      <div class="card">
        <div class="card-head"><h3>Lista</h3><span class="chip">${state.accounts.length}</span></div>
        <div class="list">${state.accounts.map(account => `<article class="item"><div><h4>${escapeHtml(account.name)}</h4><p>${escapeHtml(account.email)}</p><span class="pill ${statusClass(account.status)}">${escapeHtml(account.role)}</span></div></article>`).join('') || '<div class="empty">Nenhum account.</div>'}</div>
      </div>
    </section>
  `;
}

function pageClients() {
  const state = getState();
  return `
    <section class="grid two">
      <form class="card" onsubmit="submitClient(event)">
        <h3>Novo cliente</h3>
        <label>Cliente</label><input id="clientName" required placeholder="Nome do cliente">
        <label>Account</label><select id="clientAccount">${state.accounts.map(account => `<option>${escapeHtml(account.email)}</option>`).join('')}</select>
        <label>GrowthPack</label><input id="clientSheet" required placeholder="URL ou identificação da planilha">
        <label>Status</label><select id="clientStatus"><option>Ativo</option><option>Implantação</option><option>Pausado</option><option>Churn</option></select>
        <div class="actions form-actions"><button class="btn primary">Salvar</button></div>
      </form>
      <div class="card">
        <div class="card-head"><h3>Clientes</h3><span class="chip">${state.clients.length}</span></div>
        <div class="list">${state.clients.map(client => `<article class="item"><div><h4>${escapeHtml(client.name)}</h4><p>${escapeHtml(client.account)}</p><span class="pill ${statusClass(client.status)}">${escapeHtml(client.status)}</span></div><div class="item-actions"><button class="btn secondary small" onclick="syncClient('${escapeHtml(client.name)}')">Sync</button></div></article>`).join('') || '<div class="empty">Nenhum cliente.</div>'}</div>
      </div>
    </section>
  `;
}

function appCard(app) {
  return `
    <button type="button" class="app-card ${app.id === 'Moskit' ? 'selected' : ''}" data-crm-app="${escapeHtml(app.id)}" onclick="selectIntegrationCrm('${escapeHtml(app.id)}')">
      <span class="app-logo">${escapeHtml(app.badge)}</span>
      <strong>${escapeHtml(app.name)}</strong>
      <small>${escapeHtml(app.description)}</small>
      <em>${app.available ? 'Disponível' : 'Em breve'}</em>
    </button>
  `;
}

function automationFieldRows() {
  return baseFields.map(field => `
    <tr>
      <td>${escapeHtml(field[0])}</td>
      <td><select><option>${escapeHtml(field[1])}</option><option>Não mapear</option><option>Valor fixo</option></select></td>
      <td>${escapeHtml(field[2])}</td>
    </tr>
  `).join('');
}

function pageIntegrations() {
  const state = getState();
  const clientOptions = state.clients.length
    ? state.clients.map(client => `<option>${escapeHtml(client.name)}</option>`).join('')
    : '<option>YouSafer</option>';

  return `
    <section class="automation-hero card">
      <div>
        <span class="eyebrow">Criador de automação</span>
        <h3>Conecte um CRM ao GrowthPack em poucos passos</h3>
        <p class="muted">Escolha o app, conecte a conta, selecione o funil, confira o mapeamento e ative a rotina de atualização.</p>
      </div>
      <button class="btn primary" onclick="document.getElementById('integration-builder').scrollIntoView({behavior:'smooth'})">Criar automação</button>
    </section>

    <form id="integration-builder" class="card automation-builder" onsubmit="submitIntegration(event)">
      <input type="hidden" id="integrationCrm" value="Moskit">
      <input type="hidden" id="integrationPipeline" value="">

      <div class="builder-step">
        <div class="step-index">1</div>
        <div class="step-body">
          <h3>Escolha o app de origem</h3>
          <p class="muted">De onde os negócios serão buscados?</p>
          <div class="app-grid">${crmApps.map(appCard).join('')}</div>
        </div>
      </div>

      <div class="builder-step">
        <div class="step-index">2</div>
        <div class="step-body">
          <h3>Escolha o cliente e o destino</h3>
          <div class="form2">
            <div><label>Cliente</label><select id="integrationClient">${clientOptions}</select></div>
            <div><label>Destino</label><select id="integrationDestination"><option value="TESTE_BASE_CRM">GrowthPack · TESTE_BASE_CRM</option><option value="BASE_CRM">GrowthPack · BASE_CRM</option></select></div>
          </div>
          <div class="form2">
            <div><label>Evento</label><select id="integrationTrigger"><option>Todos os negócios do funil</option><option>Novo negócio criado</option><option>Negócio mudou de etapa</option><option>Negócio ganho</option><option>Negócio perdido</option></select></div>
            <div><label>Frequência</label><select id="integrationFrequency"><option>A cada 10 minutos</option><option>A cada 30 minutos</option><option>1 vez por hora</option><option>Manual</option></select></div>
          </div>
        </div>
      </div>

      <div class="builder-step">
        <div class="step-index">3</div>
        <div class="step-body">
          <h3>Conecte a conta</h3>
          <p class="muted">Na operação normal, o usuário só clica para conectar. A credencial técnica fica escondida em “Configuração avançada”.</p>
          <div class="connect-card">
            <div>
              <strong id="connect-title">Conectar Moskit</strong>
              <span id="connect-subtitle">Use a credencial salva ou informe uma temporária apenas para buscar funis.</span>
            </div>
            <button class="btn secondary" type="button" onclick="toggleCredentialPanel()">Configuração avançada</button>
          </div>
          <div id="credential-panel" class="advanced-panel" hidden>
            <div class="form2">
              <div><label>Nome da credencial salva</label><input id="integrationAlias" placeholder="Ex: MOSKIT_ACCESS_KEY" value="MOSKIT_ACCESS_KEY"></div>
              <div><label>Credencial temporária</label><input id="integrationSecret" type="password" placeholder="Token/API key/webhook URL temporário"></div>
            </div>
            <label>Base URL / Webhook URL quando necessário</label><input id="integrationBaseUrl" placeholder="Ex: https://suaempresa.kommo.com ou webhook Bitrix">
          </div>
        </div>
      </div>

      <div class="builder-step">
        <div class="step-index">4</div>
        <div class="step-body">
          <h3>Escolha o funil</h3>
          <p class="muted">O app busca os funis e etapas disponíveis no CRM conectado.</p>
          <div class="actions form-actions">
            <button class="btn secondary" type="button" onclick="loadCrmPipelines()">Buscar funis e etapas</button>
            <button class="btn ghost" type="button" onclick="clearPipelineSelection()">Limpar seleção</button>
          </div>
          <div id="v4-pipeline-selector-wrap" class="pipeline-result empty">Nenhum funil carregado ainda.</div>
          <pre id="v4-crm-catalog-results" class="catalog-output">Clique em “Buscar funis e etapas”.</pre>
        </div>
      </div>

      <div class="builder-step">
        <div class="step-index">5</div>
        <div class="step-body">
          <h3>Mapeie os campos</h3>
          <p class="muted">O padrão já está preenchido para a BASE_CRM. Ajustes finos podem ser feitos depois.</p>
          <div class="table compact-map"><table><thead><tr><th>Campo BASE_CRM</th><th>Campo do CRM</th><th>Uso</th></tr></thead><tbody>${automationFieldRows()}</tbody></table></div>
        </div>
      </div>

      <div class="builder-step final-step">
        <div class="step-index">6</div>
        <div class="step-body">
          <h3>Teste e ative</h3>
          <div class="form2">
            <div><label>Status</label><select id="integrationStatus"><option>Ativo</option><option>Pendente</option><option>Erro</option><option>Pausado</option></select></div>
            <div><label>Rotina automática</label><input value="A cada 10 minutos quando ativo" readonly></div>
          </div>
          <div class="actions form-actions">
            <button class="btn secondary" type="button" onclick="testAutomationDraft()">Testar automação</button>
            <button class="btn primary">Ativar automação</button>
          </div>
        </div>
      </div>
    </form>

    <section class="card">
      <div class="card-head"><h3>Automações criadas</h3><span class="chip">${state.integrations.length}</span></div>
      <div class="list">${state.integrations.map(item => `<article class="item"><div><h4>${escapeHtml(item.client)}</h4><p>${escapeHtml(item.crm)} → ${escapeHtml(item.destination || 'BASE_CRM')} · ${escapeHtml(item.pipelineName || item.pipeline || 'Sem funil')}</p><p>${escapeHtml(item.trigger || 'Todos os negócios do funil')} · ${escapeHtml(item.frequency || 'Manual')}</p><span class="pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div><div class="item-actions"><button class="btn secondary small" onclick="setTab('sync')">Sincronizar</button></div></article>`).join('') || '<div class="empty">Nenhuma automação criada.</div>'}</div>
    </section>
  `;
}

function pageMapping() {
  return `
    <section class="card">
      <div class="card-head"><h3>Contrato BASE_CRM</h3><span class="chip">${baseFields.length} campos</span></div>
      <div class="table"><table><thead><tr><th>Campo V4</th><th>Campo origem</th><th>Uso</th></tr></thead><tbody>${baseFields.map(field => `<tr><td>${field[0]}</td><td><input value="${field[1]}"></td><td>${field[2]}</td></tr>`).join('')}</tbody></table></div>
    </section>
  `;
}

function pageSync() {
  const state = getState();
  return `
    <section class="card">
      <div class="card-head"><h3>Fila</h3><button class="btn primary" onclick="syncAll()">Sincronizar todos</button></div>
      <div class="table"><table><thead><tr><th>Cliente</th><th>Status</th><th>Último sync</th><th>Registros</th><th>Ação</th></tr></thead><tbody>${state.clients.map(client => `<tr><td>${escapeHtml(client.name)}</td><td><span class="pill ${statusClass(client.status)}">${escapeHtml(client.status)}</span></td><td>${client.lastSync || '-'}</td><td>${client.records || 0}</td><td><button class="btn secondary small" onclick="syncClient('${escapeHtml(client.name)}')">Sync</button></td></tr>`).join('') || '<tr><td colspan="5">Nenhum cliente.</td></tr>'}</tbody></table></div>
    </section>
  `;
}

function pageAudit() {
  const state = getState();
  return `
    <section class="card">
      <div class="card-head"><h3>Riscos</h3><button class="btn primary" onclick="runAudit()">Rodar auditoria</button></div>
      <div class="table"><table><thead><tr><th>Cliente</th><th>Problema</th><th>Ação</th><th>Severidade</th></tr></thead><tbody>${state.audit.map(item => `<tr><td>${escapeHtml(item[0])}</td><td>${escapeHtml(item[1])}</td><td>${escapeHtml(item[2])}</td><td><span class="pill ${statusClass(item[3])}">${escapeHtml(item[3])}</span></td></tr>`).join('') || '<tr><td colspan="4">Sem achados.</td></tr>'}</tbody></table></div>
    </section>
  `;
}

function pageLogs() {
  const state = getState();
  return `
    <section class="card">
      <div class="card-head"><h3>Histórico</h3><span class="chip">${state.logs.length}</span></div>
      <div class="logs full-logs">${state.logs.map(log => `<div class="log ${log.type}"><strong>${escapeHtml(log.type)}</strong><span>${escapeHtml(log.message)}</span><small>${log.at}</small></div>`).join('') || '<div class="empty">Sem logs.</div>'}</div>
    </section>
  `;
}

function pageSettings() {
  const state = getState();
  return `
    <form class="card settings-form" onsubmit="saveSettings(event)">
      <h3>Configurações</h3>
      <label>Operador</label><input id="settingOperator" value="${escapeHtml(state.settings.operator)}">
      <label>E-mail</label><input id="settingEmail" value="${escapeHtml(state.settings.email)}">
      <label>Unidade</label><input id="settingUnit" value="${escapeHtml(state.settings.unit)}">
      <label>Backend</label><input id="settingBackend" value="${escapeHtml(state.settings.backend)}">
      <div class="actions form-actions"><button class="btn primary">Salvar</button></div>
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

function selectIntegrationCrm(crm) {
  const input = document.getElementById('integrationCrm');
  const alias = document.getElementById('integrationAlias');
  const title = document.getElementById('connect-title');
  const subtitle = document.getElementById('connect-subtitle');
  if (input) input.value = crm;
  if (alias) alias.value = defaultCredentialNames[crm] || '';
  if (title) title.textContent = `Conectar ${crm}`;
  if (subtitle) subtitle.textContent = crm === 'Bitrix' ? 'Use a URL do webhook do Bitrix na configuração avançada.' : 'Use uma conta conectada ou uma credencial temporária para buscar funis.';
  document.querySelectorAll('[data-crm-app]').forEach(card => card.classList.toggle('selected', card.dataset.crmApp === crm));
  clearPipelineSelection(false);
}

function toggleCredentialPanel() {
  const panel = document.getElementById('credential-panel');
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

function clearPipelineSelection(clearOutput = true) {
  const wrap = document.getElementById('v4-pipeline-selector-wrap');
  const pipelineInput = document.getElementById('integrationPipeline');
  const out = document.getElementById('v4-crm-catalog-results');
  if (pipelineInput) {
    pipelineInput.value = '';
    pipelineInput.dataset.pipelineName = '';
  }
  if (wrap) wrap.className = 'pipeline-result empty', wrap.innerHTML = 'Nenhum funil carregado ainda.';
  if (clearOutput && out) out.textContent = 'Clique em “Buscar funis e etapas”.';
}

function formatPipelineCatalog(data) {
  if (!data || !data.ok) return JSON.stringify(data, null, 2);
  const pipelines = data.pipelines || [];
  if (!pipelines.length) return 'Nenhum funil retornado pelo CRM.';
  return pipelines.map((pipeline, index) => {
    const stages = pipeline.stages || [];
    return [
      `${index + 1}. ${pipeline.name} (${pipeline.id})`,
      ...stages.map(stage => `   - ${stage.name || stage.id} (${stage.id})`)
    ].join('\n');
  }).join('\n\n');
}

function renderPipelineSelector(pipelines) {
  const wrap = document.getElementById('v4-pipeline-selector-wrap');
  const pipelineInput = document.getElementById('integrationPipeline');
  if (!wrap || !pipelineInput) return;

  wrap.innerHTML = '';
  wrap.className = 'pipeline-result';
  if (!pipelines || !pipelines.length) {
    wrap.className = 'pipeline-result empty';
    wrap.textContent = 'Nenhum funil retornado pelo CRM.';
    return;
  }

  const select = document.createElement('select');
  select.id = 'v4-pipeline-selector';
  select.innerHTML = pipelines.map((pipeline, index) => `<option value="${index}">${escapeHtml(pipeline.name)} · ${escapeHtml(pipeline.id)}</option>`).join('');
  select.addEventListener('change', () => {
    const selected = pipelines[Number(select.value)];
    if (!selected) return;
    pipelineInput.value = selected.id;
    pipelineInput.dataset.pipelineName = selected.name;
    renderStageChips(selected.stages || []);
  });

  const label = document.createElement('label');
  label.textContent = 'Selecionar funil encontrado';
  const chips = document.createElement('div');
  chips.id = 'v4-stage-chips';
  chips.className = 'stage-chips';
  wrap.appendChild(label);
  wrap.appendChild(select);
  wrap.appendChild(chips);
  select.dispatchEvent(new Event('change'));
}

function renderStageChips(stages) {
  const chips = document.getElementById('v4-stage-chips');
  if (!chips) return;
  chips.innerHTML = stages.length
    ? stages.map(stage => `<span>${escapeHtml(stage.name || stage.id)}</span>`).join('')
    : '<small>Sem etapas retornadas.</small>';
}

async function loadCrmPipelines() {
  const out = document.getElementById('v4-crm-catalog-results');
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
    renderPipelineSelector(data.pipelines || []);
    if (out) out.textContent = formatPipelineCatalog(data);
  } catch (error) {
    if (out) out.textContent = JSON.stringify({ ok: false, message: error.message }, null, 2);
  }
}

function testAutomationDraft() {
  const crm = document.getElementById('integrationCrm')?.value || 'CRM';
  const pipeline = selectedPipelineName() || 'funil não selecionado';
  const out = document.getElementById('v4-crm-catalog-results');
  const result = {
    ok: Boolean(selectedPipelineName()),
    crm,
    pipeline,
    destination: document.getElementById('integrationDestination')?.value || 'TESTE_BASE_CRM',
    message: selectedPipelineName()
      ? 'Pré-validação ok. A automação pode ser ativada.'
      : 'Busque e selecione um funil antes de ativar.'
  };
  if (out) out.textContent = JSON.stringify(result, null, 2);
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
window.selectIntegrationCrm = selectIntegrationCrm;
window.toggleCredentialPanel = toggleCredentialPanel;
window.clearPipelineSelection = clearPipelineSelection;
window.loadCrmPipelines = loadCrmPipelines;
window.testAutomationDraft = testAutomationDraft;

render();
