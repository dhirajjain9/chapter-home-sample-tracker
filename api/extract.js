export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { contentParts } = req.body;
    if (!contentParts) return res.status(400).json({ error: 'Missing contentParts' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 16000,
        messages: [{ role: 'user', content: contentParts }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });

    // Guard against a truncated response (e.g. very long PI with many line items)
    // so the client gets a clear message instead of a cryptic JSON.parse error.
    if (data.stop_reason === 'max_tokens') {
      return res.status(502).json({ error: 'The PI was too long to extract in one pass. Please try again or split the invoice.' });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
