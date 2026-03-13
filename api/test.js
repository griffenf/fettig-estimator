import { fetch as undiciFetch } from 'undici'

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

  const testBuffer = Buffer.from('%PDF-1.4 test content')
  const pdfSize = testBuffer.length
  const results = {}

  // Get upload URL (files bucket via orgId+url)
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://pdfobject.com/pdf/sample.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  if (!ur?.id) return res.status(200).json({ error: 'No upload request' })
  results.uploadRequestId = ur.id

  // Use undici fetch which bypasses Vercel's header injection
  const gcsRes = await undiciFetch(ur.url, {
    method: ur.method || 'PUT',
    headers: {
      'content-type': 'application/pdf',
      'x-goog-content-length-range': `${pdfSize},${pdfSize}`
    },
    body: testBuffer
  })
  results.gcsStatus = gcsRes.status
  results.gcsBody = gcsRes.status !== 200 ? (await gcsRes.text()).slice(0, 150) : 'OK'

  if (gcsRes.status !== 200) return res.status(200).json({ results })

  await new Promise(r => setTimeout(r, 1000))
  const fileRes = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId: ur.id },
      createdFile: { id: {}, name: {} }
    }
  })
  results.createFile = fileRes?.raw || JSON.stringify(fileRes)

  return res.status(200).json({ results })
}
