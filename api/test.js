export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  async function pave(query) {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const text = await r.text()
    try { return JSON.parse(text) } catch { return { raw: text } }
  }

  const results = {}

  // Probe top-level output fields of createUploadRequest (not pdf subfields)
  const fields = ['id', 'uploadId', 'requestId', 'createdUploadRequest', 'uploadRequest', 
                  'url', 'uploadUrl', 'token', 'key', 'name', 'status', 'createdAt']
  for (const field of fields) {
    const r = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { contentType: 'application/pdf', name: 'test.pdf' },
        [field]: {}
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[field] = txt.includes('does not exist') ? '❌' 
                   : txt.includes('Did you mean') ? '❌ (meant: ' + (txt.match(/Did you mean "(.+?)"/)?.[1] || '?') + ')'
                   : '✅ ' + txt.slice(0, 150)
  }

  return res.status(200).json({ results })
}
