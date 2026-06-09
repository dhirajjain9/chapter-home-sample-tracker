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

    // Convert Anthropic content format → OpenAI Responses API format
    // Responses API supports PDFs inline via input_file, images via input_image
    const inputContent = [];

    for (const part of contentParts) {
      if (part.type === 'text') {
        inputContent.push({ type: 'input_text', text: part.text });

      } else if (part.type === 'image') {
        // Anthropic: { type:'image', source:{ media_type, data } }
        const { media_type, data } = part.source;
        inputContent.push({
          type: 'input_image',
          image_url: `data:${media_type};base64,${data}`
        });

      } else if (part.type === 'document') {
        // Anthropic: { type:'document', source:{ media_type:'application/pdf', data } }
        // Responses API supports base64 PDF inline via input_file
        const { data: b64 } = part.source;
        inputContent.push({
          type: 'input_file',
          filename: 'invoice.pdf',
          file_data: `data:application/pdf;base64,${b64}`
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: [{ role: 'user', content: inputContent }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'OpenAI API error' });

    // Guard against truncated response
    if (data.status === 'incomplete') {
      return res.status(502).json({ error: 'The PI was too long to extract in one pass. Please try again or split the invoice.' });
    }

    // Normalise to the shape the frontend expects: { content: [{ text }] }
    const text = data.output?.[0]?.content?.[0]?.text || '';
    return res.status(200).json({ content: [{ text }] });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
