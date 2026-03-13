export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22MsvgnqcwLK'

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

  // Probe all possible createFile input fields
  const inputFields = ['url', 'fileUrl', 'source', 'content', 'base64', 'data', 'externalUrl', 'link', 'uri', 'mimeType', 'contentType', 'size', 'organizationId']
  for (const field of inputFields) {
    const r = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', [field]: 'test-value' },
        createdFile: { id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[field] = txt.includes('no value is ever expected') ? '❌ not valid' 
                   : txt.includes('upload request') ? '⚠️ needs uploadRequestId'
                   : '✅ ' + txt.slice(0, 150)
  }

  return res.status(200).json({ results })
}
