import https from 'https'
import { URL } from 'url'

function httpsRequest(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const options = { hostname: u.hostname, path: u.pathname + u.search, method, headers }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
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
  const results = { pdfSize }

  // Get upload request
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { size: pdfSize, type: 'application/pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  results.uploadRequestId = ur?.id

  // Upload with Content-Length included
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
  results.gcsResponseHeaders = gcsResult.headers
  results.gcsBody = gcsResult.body.slice(0, 200)

  // Try createFile with no delay
  const fileRes1 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId: ur.id },
      createdFile: { id: {}, name: {} }
    }
  })
  results.createFileImmediate = fileRes1?.raw || JSON.stringify(fileRes1)

  // Try after 3 second delay
  await new Promise(r => setTimeout(r, 3000))
  const fileRes2 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId: ur.id },
      createdFile: { id: {}, name: {} }
    }
  })
  results.createFileAfter3s = fileRes2?.raw || JSON.stringify(fileRes2)

  return res.status(200).json({ results })
}
