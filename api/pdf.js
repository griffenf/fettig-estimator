const store = {}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const key of Object.keys(store)) {
    if (store[key].expires < now) delete store[key]
  }
}, 5 * 60 * 1000)

const handler = async function handler(req, res) {
  if (req.method === 'PUT') {
    const { id, pdfBase64, mimeType } = req.body || {}
    if (!id || !pdfBase64) return res.status(400).json({ error: 'Missing id or pdfBase64' })
    // 10 minute expiry — enough for slow connections and large files
    store[id] = { pdfBase64, mimeType: mimeType || 'application/pdf', expires: Date.now() + 10 * 60 * 1000 }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const { id } = req.query
    if (!id) return res.status(400).send('Missing id')
    const entry = store[id]
    if (!entry || Date.now() > entry.expires) return res.status(404).send('Not found or expired')
    const buf = Buffer.from(entry.pdfBase64, 'base64')
    res.setHeader('Content-Type', entry.mimeType)
    res.setHeader('Content-Length', buf.length)
    return res.status(200).send(buf)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

handler.config = { api: { bodyParser: { sizeLimit: '50mb' } } }
module.exports = handler
