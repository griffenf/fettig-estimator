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

  // Try different input param names for the type
  const paramNames = ['type', 'pdfType', 'category', 'section', 'for', 'target', 'kind']
  for (const param of paramNames) {
    const r = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { contentType: 'application/pdf', name: 'test.pdf' },
        pdf: { '$': { [param]: 'document' }, url: {}, id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[param] = txt.includes('does not resolve') ? '❌ still wrong' 
                   : txt.includes('does not exist') ? '❌ bad field'
                   : '✅ ' + txt.slice(0, 150)
  }

  // Also try with no $ at all on pdf
  const r2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      pdf: { url: {}, id: {} }
    }
  })
  results.no_input = r2?.raw || JSON.stringify(r2)

  return res.status(200).json({ results })
}
