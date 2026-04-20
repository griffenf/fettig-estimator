module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured.' })

  const { action, jobId, pdfBase64, fileName, mimeType, estimateData } = req.body || {}
  const orgId = '22MsEHuFtmri'
  const host = req.headers.host
  const protocol = host.includes('localhost') ? 'http' : 'https'

  async function pave(query) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000) // 25s timeout
    try {
      const r = await fetch('https://api.jobtread.com/pave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      const text = await r.text()
      try { return JSON.parse(text) } catch { throw new Error(`Pave: ${text.slice(0, 200)}`) }
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('JobTread API timed out — please try again')
      throw e
    } finally {
      clearTimeout(timeout)
    }
  }

  // Shared upload helper — stores file in pdf.js temp store, then uploads to JobTread
  async function uploadToJob(targetJobId, base64, name, mime, folder) {
    const fileId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const publicUrl = `${protocol}://${host}/api/pdf?id=${fileId}`

    const putController = new AbortController()
    const putTimeout = setTimeout(() => putController.abort(), 30000)
    try {
      await fetch(`${protocol}://${host}/api/pdf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, pdfBase64: base64, mimeType: mime }),
        signal: putController.signal,
      })
    } finally {
      clearTimeout(putTimeout)
    }

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
      const folder = req.body.folder || 'Estimate/Measurement Photos'
      await uploadToJob(jobId, pdfBase64, fileName, mimeType || 'application/pdf', folder)
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

      // Fetch all files for the job and find Estimate Data.json in JS
      // (JobTread doesn't support name filtering on files)
      let allFiles = []
      let filePage = null
      do {
        const filesRes = await pave({
          '$': { grantKey },
          job: {
            '$': { id: jobId },
            files: {
              '$': {
                sortBy: [{ field: 'createdAt', order: 'desc' }],
                size: 50,
                ...(filePage ? { page: filePage } : {})
              },
              nextPage: {},
              nodes: { id: {}, name: {}, createdAt: {}, url: {} }
            }
          }
        })
        const conn = filesRes?.job?.files
        allFiles = allFiles.concat(conn?.nodes || [])
        filePage = conn?.nextPage || null
        // Stop early if we already found the file
        if (allFiles.some(f => f.name === 'Estimate Data.json')) break
      } while (filePage)

      const jsonFile = allFiles.find(f => f.name === 'Estimate Data.json')

      if (!jsonFile) return res.status(200).json({ estimateData: null })

      // Download the JSON from the CDN URL (with timeout)
      const cdnController = new AbortController()
      const cdnTimeout = setTimeout(() => cdnController.abort(), 15000)
      let dlRes
      try {
        dlRes = await fetch(jsonFile.url, { signal: cdnController.signal })
      } finally {
        clearTimeout(cdnTimeout)
      }
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
