export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, row } = req.body;
    const noRowTypes = ['clear', 'dedupe'];
    if (!row && !noRowTypes.includes(type)) return res.status(400).json({ error: 'Missing row' });

    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwH0YmTWjyQdgiCEFnEtQvEPNPqSS9uRTV0WZxoHg_O7R4iuueit-23CXXBzmEjavkf/exec';

    const body = noRowTypes.includes(type) ? { type } : type === 'update' ? { type: 'update', row } : { row };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { success: false, raw: text }; }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
