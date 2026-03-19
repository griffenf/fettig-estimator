const store = {}

module.exports = async function handler(req, res) {
  if (req.method === 'PUT') {
    const { id, pdfBase64, mimeType } = req.body || {}
    if (!id || !pdfBase64) return res.status(400).json({ error: 'Missing id or pdfBase64' })
    store[id] = { pdfBase64, mimeType: mimeType || 'application/pdf', expires: Date.now() + 60000 }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const { id } = req.query
    const entry = store[id]
    if (!entry || Date.now() > entry.expires) return res.status(404).send('Not found')
    const buf = Buffer.from(entry.pdfBase64, 'base64')
    res.setHeader('Content-Type', entry.mimeType)
    res.setHeader('Content-Length', buf.length)
    return res.status(200).send(buf)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
