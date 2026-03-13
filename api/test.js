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

  // Probe folder-related input fields on createFile
  const folderFields = ['folder', 'folderId', 'folderName', 'directory', 'path', 'section', 'category', 'tag']
  for (const field of folderFields) {
    const r = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: '22MsvgnqcwLK', targetType: 'job', uploadRequestId: 'test', [field]: 'Estimate/Measurement Photos' },
        createdFile: { id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[field] = txt.includes('no value is ever expected') ? '❌' 
      : txt.includes('valid upload request') ? '⚠️ valid field, needs real uploadRequestId'
      : '✅ ' + txt.slice(0, 120)
  }

  // Also check what output fields createdFile supports (like folder info)
  const outputFields = ['id', 'name', 'folder', 'folderId', 'folderName', 'url', 'path', 'section']
  for (const field of outputFields) {
    const r = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: '22MsvgnqcwLK', targetType: 'job', uploadRequestId: 'test' },
        createdFile: { [field]: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results['output_' + field] = txt.includes('does not exist') ? '❌' : '✅ ' + txt.slice(0, 80)
  }

  return res.status(200).json({ results })
}
