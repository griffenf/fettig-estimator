module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  const jobId = req.body && req.body.jobId
  const jobInfo = (req.body && req.body.jobInfo) || {}
  const windows = (req.body && Array.isArray(req.body.windows)) ? req.body.windows : []

  // Always return debug info so we can see what arrived
  return res.status(200).json({
    VERSION: 'DEBUG-V1',
    received: {
      jobId,
      jobInfoKeys: Object.keys(jobInfo),
      windowsCount: windows.length,
      rawBody: JSON.stringify(req.body).slice(0, 500)
    }
  })
}
