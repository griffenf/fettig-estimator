module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured.' })

  const { jobId, jobInfo, pdfBase64, photos } = req.body || {}
  if (!jobId) return res.status(400).json({ error: 'No job selected.' })
  if (!pdfBase64) return res.status(400).json({ error: 'No PDF data received.' })

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

  async function uploadFile(base64Data, fileName, mimeType) {
    const fileId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const publicUrl = `${protocol}://${host}/api/pdf?id=${fileId}`

    await fetch(`${protocol}://${host}/api/pdf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fileId, pdfBase64: base64Data, mimeType: mimeType || 'application/pdf' })
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
    return fileRes.createFile.createdFile.id
  }

  try {
    // Upload the PDF first
    await uploadFile(pdfBase64, 'Estimate Notes.pdf')

    // Upload each photo
    if (photos && photos.length > 0) {
      const roomCounts = {}
      for (const photo of photos) {
        const roomName = photo.roomName || 'Unknown Room'
        roomCounts[roomName] = (roomCounts[roomName] || 0) + 1
        const count = roomCounts[roomName]
        const ext = photo.dataUrl.includes('image/png') ? 'png' : 'jpg'
        const fileName = `${roomName}${count > 1 ? ` ${count}` : ''}.${ext}`
        const base64 = photo.dataUrl.split(',')[1]
        if (!base64) throw new Error(`Photo for "${roomName}" has no valid image data`)
        const mimeType = photo.dataUrl.includes('image/png') ? 'image/png' : 'image/jpeg'
        await uploadFile(base64, fileName, mimeType)
      }
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
