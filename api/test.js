import https from 'https'
import { URL } from 'url'

function httpsRequest(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const options = { hostname: u.hostname, path: u.pathname + u.search, method, headers }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

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

  // Get upload URL via organizationId+url path (files bucket)
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://pdfobject.com/pdf/sample.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  if (!ur?.id) return res.status(200).json({ error: 'No upload request', raw: JSON.stringify(uploadReq) })

  // Parse signed headers from URL to know exactly what to send
  const signedHeaders = decodeURIComponent(ur.url.match(/X-Goog-SignedHeaders=([^&]+)/)?.[1] || '')
  results.signedHeaders = signedHeaders
  results.uploadRequestId = ur.id

  // Only send exactly what's signed
  const headers = {}
  if (signedHeaders.includes('content-type')) headers['content-type'] = 'application/pdf'
  if (signedHeaders.includes('x-goog-content-length-range')) headers['x-goog-content-length-range'] = `${pdfSize},${pdfSize}`
  if (signedHeaders.includes('content-length')) headers['content-length'] = String(pdfSize)
  results.headersSent = headers

  const gcsResult = await httpsRequest(ur.url, ur.method || 'PUT', headers, testBuffer)
  results.gcsStatus = gcsResult.status
  results.gcsError = gcsResult.status !== 200 ? gcsResult.body.slice(0, 150) : null

  if (gcsResult.status !== 200) return res.status(200).json({ results })

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
