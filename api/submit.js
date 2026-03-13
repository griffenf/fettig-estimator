const https = require('https')
const { URL } = require('url')

function httpsRequest(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers
    }
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured.' })

  const { action, jobId, jobInfo, windows, pdfBase64, uploadRequestId } = req.body || {}

  async function pave(query) {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const text = await r.text()
    try { return JSON.parse(text) } catch { throw new Error(`Pave: ${text.slice(0, 200)}`) }
  }

  try {
    if (action === 'finalize') {
      if (!jobId || !uploadRequestId) throw new Error('Missing jobId or uploadRequestId')
      const fileName = `Fettig-Estimate-${(jobInfo?.customerName || 'Draft').replace(/\s+/g, '-')}.pdf`

      const fileRes = await pave({
        '$': { grantKey },
        createFile: {
          '$': { name: fileName, targetId: jobId, targetType: 'job', uploadRequestId },
          createdFile: { id: {}, name: {} }
        }
      })
      if (fileRes?.errors) throw new Error(fileRes.errors[0]?.message || 'createFile error')

      const safeWindows = Array.isArray(windows) ? windows : []
      const totalUnits = safeWindows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)
      let message = `📋 Window Estimate — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`
      message += `Customer: ${jobInfo?.customerName || 'N/A'}\n`
      if (jobInfo?.estimator) message += `Estimator: ${jobInfo.estimator}\n`
      message += `${safeWindows.length} line item(s), ${totalUnits} unit(s)\n`
      message += `See attached file: ${fileName}`

      await pave({
        '$': { grantKey },
        createComment: {
          '$': { targetId: jobId, targetType: 'job', message },
          createdComment: { id: {} }
        }
      })

      return res.status(200).json({ success: true })
    }

    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data received.' })

    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const pdfSize = pdfBuffer.length

    const result = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { size: pdfSize, type: 'application/pdf' },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })
    const ur = result?.createUploadRequest?.createdUploadRequest
    if (!ur?.id) throw new Error('No upload URL: ' + JSON.stringify(result))

    // Try all 4 header variations to find which one works
    const variations = [
      { 'content-type': 'application/pdf', 'x-goog-content-length-range': `0,${pdfSize}` },
      { 'content-type': 'application/pdf', 'x-goog-content-length-range': `${pdfSize},${pdfSize}` },
      { 'Content-Type': 'application/pdf', 'x-goog-content-length-range': `0,${pdfSize}` },
      { 'content-type': 'application/pdf' },
    ]

    let lastError = ''
    for (let i = 0; i < variations.length; i++) {
      // Get a fresh signed URL for each attempt
      const r2 = await pave({
        '$': { grantKey },
        createUploadRequest: {
          '$': { size: pdfSize, type: 'application/pdf' },
          createdUploadRequest: { id: {}, url: {}, method: {} }
        }
      })
      const ur2 = r2?.createUploadRequest?.createdUploadRequest
      if (!ur2?.id) continue

      const uploadResult = await httpsRequest(ur2.url, ur2.method || 'PUT', variations[i], pdfBuffer)
      if (uploadResult.status === 200) {
        return res.status(200).json({ uploadRequestId: ur2.id, uploadOk: true, variation: i })
      }
      lastError = `variation ${i}: ${uploadResult.status} ${uploadResult.body.slice(0, 100)}`
    }

    throw new Error('All upload variations failed. Last: ' + lastError)

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
