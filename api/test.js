module.exports = async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const orgId = '22MsEHuFtmri'

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

  // Check org-level folders
  const t1 = await pave({
    '$': { grantKey },
    organization: {
      '$': { id: orgId },
      folders: {}
    }
  })
  results.orgFolders = t1?.raw || JSON.stringify(t1)

  // Try folders with nodes
  const t2 = await pave({
    '$': { grantKey },
    organization: {
      '$': { id: orgId },
      folders: { nodes: { id: {}, name: {} } }
    }
  })
  results.orgFoldersNodes = t2?.raw || JSON.stringify(t2)

  // Look for createFolder mutation
  for (const m of ['createFolder', 'createFileFolder', 'createJobFolder']) {
    const r = await pave({ '$': { grantKey }, [m]: { '$': { name: 'test' }, id: {} } })
    const txt = r?.raw || JSON.stringify(r)
    results[m] = txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 120)
  }

  return res.status(200).json({ results })
}
