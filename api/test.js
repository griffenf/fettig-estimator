export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22MsvgnqcwLK'
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

  // Probe createFile for "existing file" input fields
  const existingFileFields = ['fileId', 'existingFileId', 'sourceFileId', 'url', 'fileUrl', 
    'sourceUrl', 'externalUrl', 'copyFromId', 'fromFileId', 'originalFileId']
  for (const field of existingFileFields) {
    const r = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', [field]: 'test' },
        createdFile: { id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results['createFile_' + field] = txt.includes('no value is ever expected') ? '❌' 
      : txt.includes('valid upload request') ? '⚠️ same error'
      : '✅ ' + txt.slice(0, 120)
  }

  // Try createUploadRequest with organizationId + a real public PDF URL
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://www.w3.org/WAI/WCAG21/wcag21.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  results.orgId_publicUrl = t2?.raw || JSON.stringify(t2)

  // Try createUploadRequest with organizationId + url, then createFile
  const t3 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://pdfobject.com/pdf/sample.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  results.orgId_samplePdf = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
