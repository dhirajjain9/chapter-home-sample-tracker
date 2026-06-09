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

    const openaiContent = [];

    for (const part of contentParts) {
      if (part.type === 'text') {
        openaiContent.push({ type: 'text', text: part.text });

      } else if (part.type === 'image') {
        // Anthropic: { type:'image', source:{ media_type, data } }
        // OpenAI:   { type:'image_url', image_url:{ url:'data:...' } }
        const { media_type, data } = part.source;
        openaiContent.push({
          type: 'image_url',
          image_url: { url: `data:${media_type};base64,${data}` }
        });

      } else if (part.type === 'document') {
        // Anthropic: { type:'document', source:{ media_type:'application/pdf', data } }
        // OpenAI: upload file first, then reference by file_id
        const { data: b64 } = part.source;
        const binary = Buffer.from(b64, 'base64');
        const formData = new FormData();
        const blob = new Blob([binary], { type: 'application/pdf' });
        formData.append('file', blob, 'document.pdf');
        formData.append('purpose', 'assistants');

        const uploadRes = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error('PDF upload failed: ' + (uploadData.error?.message || uploadRes.status));

        openaiContent.push({
          type: 'text',
          text: `[PDF file uploaded with id: ${uploadData.id} — please extract the proforma invoice details from it]`
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [{ role: 'user', content: openaiContent }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'OpenAI API error' });

    // Guard against truncated response
    if (data.choices?.[0]?.finish_reason === 'length') {
      return res.status(502).json({ error: 'The PI was too long to extract in one pass. Please try again or split the invoice.' });
    }

    // Normalise to the shape the frontend expects: { content: [{ text }] }
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ content: [{ text }] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
