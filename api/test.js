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

  // Query folders on the job
  const t1 = await pave({
    '$': { grantKey },
    job: {
      '$': { id: jobId },
      folders: { nodes: { id: {}, name: {} } }
    }
  })
  results.jobFolders = t1?.raw || JSON.stringify(t1)

  // Query fileFolder
  const t2 = await pave({
    '$': { grantKey },
    job: {
      '$': { id: jobId },
      fileFolders: { nodes: { id: {}, name: {} } }
    }
  })
  results.fileFolders = t2?.raw || JSON.stringify(t2)

  // Query files with folder info
  const t3 = await pave({
    '$': { grantKey },
    job: {
      '$': { id: jobId },
      files: { nodes: { id: {}, name: {}, folder: { id: {}, name: {} } } }
    }
  })
  results.filesWithFolders = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
