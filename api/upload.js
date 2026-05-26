export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, fileName, mimeType, base64Data } = req.body;
    if (!fileName || !base64Data) return res.status(400).json({ error: 'Missing fileName or base64Data' });

    // Check size — base64 of a 5MB file = ~6.7MB
    if (base64Data.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large. Please use a file under 15MB.' });
    }

    const PI_SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbzp4eigTJqlPuxlSammlHY8GqalK2BTDhj4v83HSKUfvEmpRfFfNHu3yoPxJVUbYb5fFA/exec';
    const IMG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwH0YmTWjyQdgiCEFnEtQvEPNPqSS9uRTV0WZxoHg_O7R4iuueit-23CXXBzmEjavkf/exec';
    const scriptUrl = (type === 'pi_upload') ? PI_SCRIPT_URL : IMG_SCRIPT_URL;

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: type || 'upload', fileName, mimeType, base64Data })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      // Apps Script returned non-JSON — likely an HTML error page
      if (text.includes('Request-URI Too Large') || text.includes('Request En')) {
        data = { success: false, error: 'File too large for Google Apps Script. Try converting to PDF first.' };
      } else {
        data = { success: false, error: 'Unexpected response: ' + text.slice(0, 100) };
      }
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
