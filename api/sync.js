export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwH0YmTWjyQdgiCEFnEtQvEPNPqSS9uRTV0WZxoHg_O7R4iuueit-23CXXBzmEjavkf/exec?action=getData';
    const response = await fetch(scriptUrl, { method: 'GET', redirect: 'follow' });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = []; }
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
