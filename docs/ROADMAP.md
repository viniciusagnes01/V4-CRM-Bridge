# Roadmap V4 CRM Bridge

## Fase 1 - Front completo

Objetivo: deixar o sistema web com experiencia completa para accounts e gestores.

Modulos:

- Visao geral
- Accounts
- Clientes e projetos
- Integracoes CRM
- Mapeamento BASE_CRM
- Sincronizacao
- Auditoria
- Logs
- Configuracoes

## Fase 2 - Banco operacional

Objetivo: tirar os dados do armazenamento local do navegador e levar para uma base central.

Opcoes:

- Google Sheets MASTER
- Banco gerenciado
- Backend com API propria

Estrutura sugerida:

- ACCOUNTS
- CLIENTES
- CONEXOES_CRM
- MAPEAMENTO_CAMPOS
- SYNC_LOGS
- AUDITORIA

## Fase 3 - Google Sheets

Objetivo: escrever na aba BASE_CRM do GrowthPack de cada cliente.

Campos destino:

- Data
- Lead ID
- Nome
- Valor
- LEAD
- MQL
- SQL
- OPORTUNIDADE
- COMPRA
- LEAD PERDIDO
- META ADS
- GOOGLE ADS
- RESPONSAVEL
- MOTIVO DE PERDA

## Fase 4 - Primeiro CRM

Prioridade recomendada:

1. Kommo
2. RD Station
3. HubSpot
4. Moskit
5. IXC
6. OPA

## Fase 5 - Auditoria V4

Regras de auditoria:

- Lead sem responsavel
- Lead sem proximo passo
- Lead parado por mais de X dias
- Perda sem motivo
- Oportunidade sem valor
- Divergencia entre CRM e GrowthPack

## Regra de seguranca

Credenciais reais nao devem ficar no front, no repositorio ou no navegador. O front deve guardar somente identificadores de credencial. O valor real deve ficar em backend ou cofre seguro.
