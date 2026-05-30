# Arquitetura V4 CRM Bridge

## Visao geral

O V4 CRM Bridge e um sistema web para padronizar a coleta de dados de CRMs diferentes e alimentar o GrowthPack dos clientes.

Fluxo principal:

```text
Account
↓
Cliente / projeto
↓
Conexao CRM
↓
Normalizador V4
↓
GrowthPack
↓
BASE_CRM
↓
Auditoria e check-in
```

## Camadas

### 1. Front-end

Responsavel por:

- Cadastro de accounts
- Cadastro de clientes
- Cadastro de integracoes
- Mapeamento de campos
- Execucao de sync
- Auditoria visual
- Logs operacionais

Na primeira versao, o front pode operar em modo demonstracao.

### 2. Backend

Responsavel por:

- Guardar credenciais com seguranca
- Chamar APIs dos CRMs
- Chamar Google Sheets API
- Registrar logs persistentes
- Executar jobs de sincronizacao

### 3. Google Sheets

Responsavel por:

- Receber dados normalizados na aba BASE_CRM
- Alimentar dashboards do GrowthPack
- Servir como cockpit inicial de validacao

## Modelo de dados

### Account

- id
- nome
- email
- perfil
- status

### Cliente

- id
- nome
- account_email
- growthpack_url
- crm_tab
- status

### Conexao CRM

- cliente_id
- crm
- base_url
- credential_alias
- pipeline_id
- status

### Mapeamento

- cliente_id
- campo_v4
- campo_crm

### Log

- data_hora
- cliente_id
- status
- detalhes

## Decisao operacional

O sistema deve automatizar coleta, organizacao, logs e auditoria. Atualizacoes criticas de CRM, promessas ao cliente, mudanca de orcamento e envios sensiveis exigem validacao humana.
