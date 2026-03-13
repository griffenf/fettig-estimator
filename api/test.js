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

  // Find valid inputs for createUploadRequest.$
  const inputFields = ['name', 'fileName', 'fileType', 'mimeType', 'type', 'targetId', 'jobId', 'organizationId']
  for (const field of inputFields) {
    const r = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { [field]: 'test' },
        createdUploadRequest: { id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results['input_' + field] = txt.includes('no value is ever expected') ? '❌'
                               : txt.includes('non-null') ? '⚠️ needs more fields: ' + txt.slice(0, 100)
                               : '✅ ' + txt.slice(0, 150)
  }

  // Find valid subfields of createdUploadRequest
  for (const field of ['id', 'url', 'method', 'key', 'fields', 'bucket', 'token', 'uploadUrl']) {
    const r = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { name: 'test.pdf' },
        createdUploadRequest: { [field]: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results['output_' + field] = txt.includes('does not exist') ? '❌'
                                : txt.includes('Did you mean') ? '❌ meant: ' + (txt.match(/Did you mean "(.+?)"/)?.[1] || '?')
                                : '✅ ' + txt.slice(0, 150)
  }

  return res.status(200).json({ results })
}
