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

  // Create a tiny test PDF-like buffer
  const testBuffer = Buffer.from('%PDF-1.4 test content')
  const pdfSize = testBuffer.length

  // Step 1: Get upload request
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { size: pdfSize, type: 'application/pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  results.uploadRequestId = ur?.id
  results.gotUrl = !!ur?.url

  if (!ur?.id) return res.status(200).json({ results, error: 'No upload request' })

  // Step 2: Upload
  const uploadResult = await httpsRequest(
    ur.url, ur.method || 'PUT',
    { 'content-type': 'application/pdf', 'x-goog-content-length-range': `${pdfSize},${pdfSize}` },
    testBuffer
  )
  results.gcsStatus = uploadResult.status

  // Step 3: Wait 2 seconds then query the uploadRequest state
  await new Promise(r => setTimeout(r, 2000))

  const stateCheck = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { id: ur.id },
      id: {}, url: {}, method: {}
    }
  })
  results.uploadRequestState = stateCheck?.raw || JSON.stringify(stateCheck)

  // Step 4: Try createFile immediately after checking state
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
