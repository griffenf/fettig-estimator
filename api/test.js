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

  // Probe for mutations that might confirm/complete an upload
  const mutations = ['confirmUpload', 'completeUpload', 'commitUpload', 'finalizeUpload', 'processUpload', 'updateUploadRequest', 'completeUploadRequest']
  for (const m of mutations) {
    const r = await pave({ '$': { grantKey }, [m]: { '$': { id: 'test' }, id: {} } })
    const txt = r?.raw || JSON.stringify(r)
    results[m] = txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 120)
  }

  return res.status(200).json({ results })
}
