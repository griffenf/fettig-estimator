module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  const jobId = req.body && req.body.jobId
  const jobInfo = (req.body && req.body.jobInfo) || {}
  const windows = (req.body && Array.isArray(req.body.windows)) ? req.body.windows : []
  const pdfBase64 = req.body && req.body.pdfBase64

  if (!jobId) return res.status(400).json({ error: 'No job selected.' })
  if (!pdfBase64) return res.status(400).json({ error: 'No PDF data received.' })

  async function pave(query) {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const text = await r.text()
    try { return JSON.parse(text) } catch { throw new Error(`Pave returned: ${text.slice(0, 300)}`) }
  }

  try {
    // Convert base64 PDF to binary buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const pdfSize = pdfBuffer.length
    const fileName = `Fettig-Estimate-${(jobInfo.customerName || 'Draft').replace(/\s+/g, '-')}.pdf`

    // Step 1: Get a signed upload URL from JobTread
    const uploadRes = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { size: pdfSize, type: 'application/pdf' },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })

    const uploadRequest = uploadRes?.createUploadRequest?.createdUploadRequest
    if (!uploadRequest?.id || !uploadRequest?.url) {
      throw new Error('Failed to get upload URL from JobTread')
    }

    // Step 2: PUT the PDF to Google Cloud Storage
    // Only Content-Type header — extra headers break the GCS signature
    const uploadRes2 = await fetch(uploadRequest.url, {
      method: uploadRequest.method || 'PUT',
      headers: {
        'Content-Type': 'application/pdf'
      },
      body: pdfBuffer
    })

    if (!uploadRes2.ok) {
      const errText = await uploadRes2.text()
      throw new Error(`GCS upload failed: ${uploadRes2.status} ${errText.slice(0, 200)}`)
    }

    // Step 3: Register the file on the JobTread job
    const fileRes = await pave({
      '$': { grantKey },
      createFile: {
        '$': { 
          name: fileName,
          targetId: jobId,
          targetType: 'job',
          uploadRequestId: uploadRequest.id
        },
        createdFile: { id: {}, name: {} }
      }
    })

    if (fileRes?.errors) {
      throw new Error(fileRes.errors[0]?.message || 'createFile error')
    }

    const fileId = fileRes?.createFile?.createdFile?.id

    // Step 4: Post a comment linking to the file
    const totalUnits = windows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)
    let message = `📋 Window Estimate submitted by ${jobInfo.estimator || 'estimator'}\n`
    message += `Customer: ${jobInfo.customerName}\n`
    message += `${windows.length} line item(s), ${totalUnits} unit(s)\n`
    message += `See attached PDF: ${fileName}`

    await pave({
      '$': { grantKey },
      createComment: {
        '$': { targetId: jobId, targetType: 'job', message },
        createdComment: { id: {} }
      }
    })

    return res.status(200).json({ success: true, fileId })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
