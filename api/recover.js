export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwH0YmTWjyQdgiCEFnEtQvEPNPqSS9uRTV0WZxoHg_O7R4iuueit-23CXXBzmEjavkf/exec';

  try {
    if (req.method === 'GET') {
      // List all files in the images Drive folder
      const url = SCRIPT_URL + '?action=listDriveFiles';
      const r = await fetch(url, { method: 'GET', redirect: 'follow' });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { success: false, raw: text.slice(0, 200) }; }
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body;

      // Delete unlinked files: { type: 'deleteFiles', fileIds: [...] }
      if (body.type === 'deleteFiles') {
        const { fileIds } = body;
        if (!Array.isArray(fileIds) || fileIds.length === 0)
          return res.status(400).json({ error: 'Missing fileIds array' });
        const r = await fetch(SCRIPT_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ type: 'deleteFiles', fileIds })
        });
        const text = await r.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { data = { success: false, raw: text.slice(0, 200) }; }
        return res.status(200).json(data);
      }

      // Link a Drive file to a sheet row: { orderId, fileId, slot }
      const { orderId, fileId, slot } = body;
      if (!orderId || !fileId) return res.status(400).json({ error: 'Missing orderId or fileId' });
      const r = await fetch(SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'linkImage', orderId, fileId, slot: slot || 'display' })
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { success: false, raw: text.slice(0, 200) }; }
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
