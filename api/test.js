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

  const testBuffer = Buffer.from('%PDF-1.4 test content')
  const pdfSize = testBuffer.length
  const results = {}

  // Try both range formats and report GCS status + createFile result for each
  for (const [label, range] of [['0_to_size', `0,${pdfSize}`], ['size_to_size', `${pdfSize},${pdfSize}`]]) {
    const uploadReq = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { size: pdfSize, type: 'application/pdf' },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })
    const ur = uploadReq?.createUploadRequest?.createdUploadRequest
    if (!ur?.id) { results[label] = 'no upload request'; continue }

    const gcsResult = await httpsRequest(
      ur.url, ur.method || 'PUT',
      { 'content-type': 'application/pdf', 'x-goog-content-length-range': range },
      testBuffer
    )
    
    await new Promise(r => setTimeout(r, 1000))

    const fileRes = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId: ur.id },
        createdFile: { id: {}, name: {} }
      }
    })
    const fileText = fileRes?.raw || JSON.stringify(fileRes)

    results[label] = {
      gcsStatus: gcsResult.status,
      gcsError: gcsResult.status !== 200 ? gcsResult.body.slice(0, 100) : null,
      createFile: fileText.slice(0, 150)
    }
  }

  return res.status(200).json({ results })
}
