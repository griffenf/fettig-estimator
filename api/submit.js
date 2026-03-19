module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured.' })

  const { action, jobId, pdfBase64, fileName, mimeType } = req.body || {}
  const orgId = '22MsEHuFtmri'
  const host = req.headers.host
  const protocol = host.includes('localhost') ? 'http' : 'https'

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
    // Action: upload a single file (PDF or photo)
    if (action === 'uploadFile') {
      if (!jobId || !pdfBase64 || !fileName) return res.status(400).json({ error: 'Missing required fields' })

      const fileId = Date.now().toString(36) + Math.random().toString(36).slice(2)
      const publicUrl = `${protocol}://${host}/api/pdf?id=${fileId}`

      await fetch(`${protocol}://${host}/api/pdf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, pdfBase64, mimeType: mimeType || 'application/pdf' })
      })

      const uploadReq = await pave({
        '$': { grantKey },
        createUploadRequest: {
          '$': { organizationId: orgId, url: publicUrl },
          createdUploadRequest: { id: {}, url: {}, method: {} }
        }
      })
      const uploadRequestId = uploadReq?.createUploadRequest?.createdUploadRequest?.id
      if (!uploadRequestId) throw new Error(`No upload request ID for "${fileName}": ${JSON.stringify(uploadReq)}`)

      const fileRes = await pave({
        '$': { grantKey },
        createFile: {
          '$': { name: fileName, targetId: jobId, targetType: 'job', uploadRequestId, folder: 'Estimate/Measurement Photos' },
          createdFile: { id: {}, name: {} }
        }
      })
      if (!fileRes?.createFile?.createdFile?.id) throw new Error(`createFile failed for "${fileName}": ${JSON.stringify(fileRes)}`)

      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
