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

  // What fields does job.folders have?
  const t1 = await pave({
    '$': { grantKey },
    job: { '$': { id: jobId }, folders: { id: {}, name: {} } }
  })
  results.folders_id_name = t1?.raw || JSON.stringify(t1)

  // What scalar fields does folder have on files?
  for (const f of ['id', 'name', 'folderId', 'folderName']) {
    const r = await pave({
      '$': { grantKey },
      job: { '$': { id: jobId }, files: { nodes: { [f]: {} } } }
    })
    const txt = r?.raw || JSON.stringify(r)
    results['file_field_' + f] = txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 150)
  }

  return res.status(200).json({ results })
}
