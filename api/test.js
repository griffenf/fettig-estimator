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

  // Try with jobId in the createUploadRequest inputs
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf', jobId },
      pdf: { url: {}, id: {} }
    }
  })
  results.t1_with_jobId = t1?.raw || JSON.stringify(t1)

  // Try with targetId + targetType
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf', targetId: jobId, targetType: 'job' },
      pdf: { url: {}, id: {} }
    }
  })
  results.t2_targetId = t2?.raw || JSON.stringify(t2)

  // Try createUploadRequest with jobId and document subfield
  const t3 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf', jobId, section: 'document' },
      pdf: { url: {}, id: {} }
    }
  })
  results.t3_jobId_section = t3?.raw || JSON.stringify(t3)

  // Try createFile directly to see what fields it needs
  const t4 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job' },
      createdFile: { id: {}, name: {}, url: {} }
    }
  })
  results.t4_createFile = t4?.raw || JSON.stringify(t4)

  return res.status(200).json({ results })
}
