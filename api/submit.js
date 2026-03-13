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
    // Action 1: Get a signed upload URL
    if (action === 'getUploadUrl') {
      const size = req.body.size || 5242880
      const result = await pave({
        '$': { grantKey },
        createUploadRequest: {
          '$': { size, type: 'application/pdf' },
          createdUploadRequest: { id: {}, url: {}, method: {} }
        }
      })
      const ur = result?.createUploadRequest?.createdUploadRequest
      if (!ur?.id) throw new Error('No upload URL returned: ' + JSON.stringify(result))
      return res.status(200).json({ uploadRequestId: ur.id, uploadUrl: ur.url, method: ur.method, size })
    }

    // Action 2: Finalize — attach file to job and post comment
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

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
