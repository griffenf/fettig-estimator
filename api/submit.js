module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured.' })

  const { jobId, jobInfo, windows, pdfBase64 } = req.body || {}
  if (!jobId) return res.status(400).json({ error: 'No job selected.' })
  if (!pdfBase64) return res.status(400).json({ error: 'No PDF data received.' })

  const orgId = '22MsEHuFtmri'

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
    const fileName = `Fettig-Estimate-${(jobInfo?.customerName || 'Draft').replace(/\s+/g, '-')}.pdf`

    // Step 1: Store PDF on our own /api/pdf endpoint temporarily
    const pdfId = Date.now().toString(36)
    const host = req.headers.host
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const publicUrl = `${protocol}://${host}/api/pdf?id=${pdfId}`

    // Store the PDF
    await fetch(`${protocol}://${host}/api/pdf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pdfId, pdfBase64 })
    })

    // Step 2: Tell JobTread to download from our URL
    const uploadReq = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { organizationId: orgId, url: publicUrl },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })
    const uploadRequestId = uploadReq?.createUploadRequest?.createdUploadRequest?.id
    if (!uploadRequestId) throw new Error('No upload request ID: ' + JSON.stringify(uploadReq))

    // Step 3: Attach file to job immediately
    const fileRes = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: fileName, targetId: jobId, targetType: 'job', uploadRequestId },
        createdFile: { id: {}, name: {} }
      }
    })
    if (!fileRes?.createFile?.createdFile?.id) throw new Error('createFile failed: ' + JSON.stringify(fileRes))

    // Step 4: Post comment
    const safeWindows = Array.isArray(windows) ? windows : []
    const totalUnits = safeWindows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)
    let message = `📋 Window Estimate — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`
    message += `Customer: ${jobInfo?.customerName || 'N/A'}\n`
    if (jobInfo?.estimator) message += `Estimator: ${jobInfo.estimator}\n`
    message += `${safeWindows.length} line item(s), ${totalUnits} unit(s)\n`
    message += `PDF attached: ${fileName}`

    await pave({
      '$': { grantKey },
      createComment: {
        '$': { targetId: jobId, targetType: 'job', message },
        createdComment: { id: {} }
      }
    })

    return res.status(200).json({ success: true })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
