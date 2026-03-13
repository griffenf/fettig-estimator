import { put, del } from '@vercel/blob'

export default async function handler(req, res) {
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

  let blobUrl = null
  try {
    const fileName = `Fettig-Estimate-${(jobInfo?.customerName || 'Draft').replace(/\s+/g, '-')}.pdf`
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Step 1: Upload PDF to Vercel Blob to get a public URL
    const blob = await put(fileName, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf'
    })
    blobUrl = blob.url

    // Step 2: Tell JobTread to download from that URL
    const uploadReq = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { organizationId: orgId, url: blobUrl },
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
    if (fileRes?.errors) throw new Error(fileRes.errors[0]?.message || 'createFile error')
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

    // Step 5: Delete from Vercel Blob (no longer needed)
    await del(blobUrl)

    return res.status(200).json({ success: true })

  } catch (err) {
    // Clean up blob if something went wrong
    if (blobUrl) { try { await del(blobUrl) } catch {} }
    return res.status(500).json({ error: err.message })
  }
}
