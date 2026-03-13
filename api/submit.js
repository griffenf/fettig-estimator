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
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Step 1: Upload PDF to file.io (free temp hosting, no account needed)
    const formData = new FormData()
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName)

    const fileIoRes = await fetch('https://file.io/?expires=1h', {
      method: 'POST',
      body: formData
    })
    const fileIoData = await fileIoRes.json()
    if (!fileIoData.success || !fileIoData.link) {
      throw new Error('file.io upload failed: ' + JSON.stringify(fileIoData))
    }
    const publicUrl = fileIoData.link

    // Step 2: Tell JobTread to download from that URL
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
