export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'v4-crm-bridge',
    runtime: 'vercel',
    timestamp: new Date().toISOString()
  });
}
