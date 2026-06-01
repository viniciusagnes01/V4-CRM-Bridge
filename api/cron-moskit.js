import syncHandler from './sync.js';

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  const authorization = req.headers['authorization'] || '';
  const querySecret = req.query && req.query.secret ? String(req.query.secret) : '';

  if (!expected) {
    return res.status(500).json({
      ok: false,
      message: 'CRON_SECRET is not configured. Add it as an environment variable before using external cron.'
    });
  }

  const authorizedByHeader = authorization === `Bearer ${expected}`;
  const authorizedByQuery = querySecret === expected;

  if (!authorizedByHeader && !authorizedByQuery) {
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
