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

  // Try different casings and formats
  const vals = ['Document', 'DOCUMENT', 'Specifications', 'SPECIFICATIONS', 'Budget', 'BUDGET', 'Selections', 'DailyLogs', 'DAILY_LOGS', 'daily_logs', 'Tasks', 'TASKS']
  for (const val of vals) {
    const r = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { contentType: 'application/pdf', name: 'test.pdf' },
        pdf: { '$': val, url: {}, id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[val] = txt.includes('does not resolve') || txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 200)
  }

  return res.status(200).json({ results })
}
