module.exports = async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22PNzynyvGdD'
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

  // Get upload request
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://pdfobject.com/pdf/sample.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const uploadRequestId = uploadReq?.createUploadRequest?.createdUploadRequest?.id
  results.uploadRequestId = uploadRequestId

  // Try each folder-related field with the string value
  for (const field of ['folder', 'folderId', 'folderName', 'directory', 'path', 'section', 'category']) {
    const r = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId, [field]: 'Estimate/Measurement Photos' },
        createdFile: { id: {}, name: {}, folder: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results[field] = txt.includes('no value is ever expected') ? '❌ invalid field'
      : txt.includes('JobTreadID') ? '❌ needs ID not string'
      : '✅ ' + txt.slice(0, 150)
  }

  return res.status(200).json({ results })
}
