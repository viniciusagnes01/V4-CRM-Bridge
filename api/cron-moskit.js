import syncHandler from './sync.js';

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers['authorization'] || '';

  if (expected && provided !== `Bearer ${expected}`) {
    return res.status(401).json({ ok: false, message: 'Unauthorized cron request.' });
  }

  const originalMethod = req.method;
  const originalBody = req.body;

  req.method = 'POST';
  req.body = {
    client: {
      name: 'Moskit V4 - Tráfego',
      growthpackUrl: 'https://docs.google.com/spreadsheets/d/1KLxctUK2ZGaM7jm1y2zj-StwLTgV6qP0PL1a-ZEnMmo/edit',
      crmTab: process.env.MOSKIT_TARGET_TAB || 'TESTE_BASE_CRM'
    },
    integration: {
      crm: 'moskit'
    },
    limit: Number(process.env.MOSKIT_SYNC_LIMIT || 2000),
    writeToSheet: true,
    writeMode: 'upsert',
    includeDiagnostics: false
  };

  try {
    return await syncHandler(req, res);
  } finally {
    req.method = originalMethod;
    req.body = originalBody;
  }
}
