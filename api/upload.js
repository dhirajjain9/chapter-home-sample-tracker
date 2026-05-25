export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, fileName, mimeType, base64Data } = req.body;
    if (!fileName || !base64Data) return res.status(400).json({ error: 'Missing fileName or base64Data' });

    const PI_SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbzp4eigTJqlPuxlSammlHY8GqalK2BTDhj4v83HSKUfvEmpRfFfNHu3yoPxJVUbYb5fFA/exec';
    const IMG_SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbwH0YmTWjyQdgiCEFnEtQvEPNPqSS9uRTV0WZxoHg_O7R4iuueit-23CXXBzmEjavkf/exec';
    const scriptUrl = (type === 'pi_upload') ? PI_SCRIPT_URL : IMG_SCRIPT_URL;

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: type || 'upload', fileName, mimeType, base64Data })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { success: false, raw: text }; }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
