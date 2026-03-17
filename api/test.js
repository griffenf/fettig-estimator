module.exports = async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22PNzynyvGdD'

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

  // Check folders on this job
  const t1 = await pave({
    '$': { grantKey },
    job: { '$': { id: jobId }, folders: {} }
  })
  results.folders = t1?.raw || JSON.stringify(t1)

  // Check files with folder info
  const t2 = await pave({
    '$': { grantKey },
    job: { '$': { id: jobId }, files: { nodes: { id: {}, name: {}, folder: {} } } }
  })
  results.filesWithFolder = t2?.raw || JSON.stringify(t2)

  return res.status(200).json({ results })
}
