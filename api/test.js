module.exports = async function handler(req, res) {
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

  // Try folder as a top-level query
  for (const q of ['folder', 'fileFolder', 'folders', 'fileFolders']) {
    const r = await pave({
      '$': { grantKey },
      [q]: { '$': { id: 'test' }, id: {}, name: {} }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[q] = txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 150)
  }

  // Try job.folders as a plain value (no subfields)
  const t2 = await pave({
    '$': { grantKey },
    job: { '$': { id: jobId }, folders: {} }
  })
  results.folders_plain = t2?.raw || JSON.stringify(t2)

  // Try job.files with folder as plain value
  const t3 = await pave({
    '$': { grantKey },
    job: { '$': { id: jobId }, files: { nodes: { id: {}, folder: {} } } }
  })
  results.files_folder_plain = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
