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

  // Get upload URL via organizationId+url path (jobtread/files/ bucket)
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://pdfobject.com/pdf/sample.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  results.uploadRequestId = ur?.id
  results.urlPath = ur?.url?.includes('files/') ? 'files bucket ✅' : ur?.url?.includes('dropbox/') ? 'dropbox bucket' : ur?.url?.slice(0, 50)

  if (!ur?.id) return res.status(200).json({ results, error: 'No upload request' })

  // Upload to this URL
  const gcsResult = await httpsRequest(
    ur.url, ur.method || 'PUT',
    {
      'content-type': 'application/pdf',
      'x-goog-content-length-range': `${pdfSize},${pdfSize}`,
      'content-length': String(pdfSize)
    },
    testBuffer
  )
  results.gcsStatus = gcsResult.status
  results.gcsError = gcsResult.status !== 200 ? gcsResult.body.slice(0, 150) : null

  if (gcsResult.status !== 200) return res.status(200).json({ results })

  // Try createFile with this ID
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
