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

    // Default action: get upload URL AND do the upload server-side
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data received.' })

    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const pdfSize = pdfBuffer.length

    // Get signed URL
    const result = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { size: pdfSize, type: 'application/pdf' },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })
    const ur = result?.createUploadRequest?.createdUploadRequest
    if (!ur?.id) throw new Error('No upload URL: ' + JSON.stringify(result))

    // Parse what headers are required from the signed URL
    const signedUrl = ur.url
    const signedHeaders = decodeURIComponent(signedUrl.match(/X-Goog-SignedHeaders=([^&]+)/)?.[1] || '')

    // Build headers object with only what's signed
    const headers = {}
    if (signedHeaders.includes('content-type')) headers['Content-Type'] = 'application/pdf'
    if (signedHeaders.includes('x-goog-content-length-range')) {
      headers['x-goog-content-length-range'] = `0,${pdfSize}`
    }

    const uploadResult = await fetch(signedUrl, {
      method: ur.method || 'PUT',
      headers,
      body: pdfBuffer
    })

    if (!uploadResult.ok) {
      const errText = await uploadResult.text()
      // Return debug info so we can see exactly what happened
      return res.status(200).json({ 
        debug: true,
        status: uploadResult.status,
        signedHeaders,
        headersSent: headers,
        error: errText.slice(0, 500)
      })
    }

    return res.status(200).json({ uploadRequestId: ur.id, uploadOk: true })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
