module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured.' })

  const { action, jobId, pdfBase64, fileName, mimeType, estimateData } = req.body || {}
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

  // Shared upload helper — stores file in pdf.js temp store, then uploads to JobTread
  async function uploadToJob(targetJobId, base64, name, mime, folder) {
    const fileId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const publicUrl = `${protocol}://${host}/api/pdf?id=${fileId}`

    await fetch(`${protocol}://${host}/api/pdf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fileId, pdfBase64: base64, mimeType: mime })
    })

    const uploadReq = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { organizationId: orgId, url: publicUrl },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })

    const uploadRequestId = uploadReq?.createUploadRequest?.createdUploadRequest?.id
    if (!uploadRequestId) throw new Error(`No upload request ID for "${name}": ${JSON.stringify(uploadReq)}`)

    const fileRes = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name, targetId: targetJobId, targetType: 'job', uploadRequestId, folder },
        createdFile: { id: {}, name: {} }
      }
    })

    if (!fileRes?.createFile?.createdFile?.id)
      throw new Error(`createFile failed for "${name}": ${JSON.stringify(fileRes)}`)

    return fileRes.createFile.createdFile.id
  }

  try {

    // ── Action: upload a single file (PDF or photo) ───────────────────────────
    if (action === 'uploadFile') {
      if (!jobId || !pdfBase64 || !fileName) return res.status(400).json({ error: 'Missing required fields' })
      await uploadToJob(jobId, pdfBase64, fileName, mimeType || 'application/pdf', 'Estimate/Measurement Photos')
      return res.status(200).json({ success: true })
    }

    // ── Action: save estimate data as JSON to the job ─────────────────────────
    if (action === 'saveEstimateData') {
      if (!jobId || !estimateData) return res.status(400).json({ error: 'Missing jobId or estimateData' })

      const json = JSON.stringify(estimateData)
      const base64 = Buffer.from(json).toString('base64')

      await uploadToJob(jobId, base64, 'Estimate Data.json', 'application/json', 'Fettig Estimator')
      return res.status(200).json({ success: true })
    }

    // ── Action: load estimate data JSON from the job ──────────────────────────
    if (action === 'loadEstimateData') {
      if (!jobId) return res.status(400).json({ error: 'Missing jobId' })

      // Find the most recent Estimate Data.json file on this job
      const filesRes = await pave({
        '$': { grantKey },
        job: {
          '$': { id: jobId },
          files: {
            '$': {
              where: [['name', 'like', 'Estimate Data%']],
              sortBy: [{ field: 'createdAt', order: 'desc' }],
              size: 5
            },
            nodes: { id: {}, name: {}, createdAt: {}, url: {} }
          }
        }
      })

      const files = filesRes?.job?.files?.nodes || []
      const jsonFile = files.find(f => f.name === 'Estimate Data.json')

      if (!jsonFile) return res.status(200).json({ estimateData: null })

      // Download the JSON from the CDN URL
      const dlRes = await fetch(jsonFile.url)
      if (!dlRes.ok) throw new Error(`Failed to download estimate data: ${dlRes.status}`)

      const text = await dlRes.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { throw new Error('Estimate data file is not valid JSON') }

      return res.status(200).json({ estimateData: parsed, fileId: jsonFile.id, createdAt: jsonFile.createdAt })
    }

    return res.status(400).json({ error: 'Unknown action' })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
