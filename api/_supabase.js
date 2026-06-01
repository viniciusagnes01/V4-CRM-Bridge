function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function supabaseConfig() {
  return {
    url: required('SUPABASE_URL').replace(/\/$/, ''),
    key: required('SUPABASE_SERVICE_ROLE_KEY')
  };
}

export async function supabaseFetch(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.hint || text || `Supabase error ${response.status}`;
    throw new Error(message);
  }
  return data;
}
