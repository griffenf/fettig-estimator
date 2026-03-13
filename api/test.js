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

  // Try each field individually to find what's valid
  const fields = ['url', 'id', 'fields', 'uploadUrl', 'method', 'name', 'bucket', 'token', 'path', 'uri', 'link']
  for (const field of fields) {
    const r = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { contentType: 'application/pdf', name: 'test.pdf' },
        pdf: { '$': { type: 'document' }, [field]: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[field] = txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 120)
  }

  return res.status(200).json({ results })
}
