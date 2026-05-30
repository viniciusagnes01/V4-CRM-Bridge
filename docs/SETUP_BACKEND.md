# Setup Backend V4 CRM Bridge

## Endpoints criados

- GET /api/health
- POST /api/sync
- POST /api/sheets

## Variaveis obrigatorias no Vercel

Configure em Project Settings > Environment Variables:

- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_PRIVATE_KEY

Para Kommo, configure uma das opcoes:

- KOMMO_ACCESS_KEY
- ou uma variavel com o mesmo nome do alias usado na integracao do cliente

## Permissao na planilha

Compartilhe o GrowthPack do cliente com o e-mail da service account do Google.

## Teste de health

Acesse:

https://v4-crm-bridge.vercel.app/api/health

Resultado esperado:

{
  "ok": true,
  "service": "v4-crm-bridge"
}

## Teste de sync preview

Envie POST para /api/sync com JSON:

{
  "client": {
    "name": "Cliente Demo",
    "growthpackUrl": "URL_DA_PLANILHA",
    "crmTab": "BASE_CRM"
  },
  "integration": {
    "crm": "mock",
    "stages": {
      "lead": "lead",
      "opportunity": "oportunidade",
      "won": "compra"
    }
  },
  "writeToSheet": false
}

## Teste escrevendo no Sheets

Use o mesmo payload, mas com:

"writeToSheet": true

O backend vai enviar linhas para BASE_CRM.

## Importante

Nao coloque credenciais reais no front-end, no GitHub ou em arquivos versionados.
