export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  // Manually read and parse the raw body
  const rawBody = await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

  let body
  try { body = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }

  const jobId = body?.jobId
  const jobInfo = body?.jobInfo || {}
  const windows = Array.isArray(body?.windows) ? body.windows : []

  if (!jobId) return res.status(400).json({ error: 'No job selected. Please select a job from the search on Step 1.' })

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
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const totalUnits = windows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)

    let message = `📋 WINDOW ESTIMATE — ${date}\n`
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    message += `Customer: ${jobInfo.customerName || 'N/A'}\n`
    if (jobInfo.estimator) message += `Estimator: ${jobInfo.estimator}\n`
    message += `Total: ${windows.length} line item(s), ${totalUnits} unit(s)\n`
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

    windows.forEach((w, i) => {
      message += `#${i + 1} — ${w.style || 'Window'} × ${w.qty}\n`
      if (w.width && w.height) message += `  Size: ${w.width}" × ${w.height}"\n`
      if (w.exteriorColor) message += `  Ext Color: ${w.exteriorColor}\n`
      if (w.interiorColor) message += `  Int Color: ${w.interiorColor}\n`
      if (w.glass) message += `  Glass: ${w.glass}\n`
      if (w.grid && w.grid !== 'No Grid') message += `  Grid: ${w.grid}\n`
      if (w.notes) message += `  Notes: ${w.notes}\n`
      message += '\n'
    })

    if (jobInfo.notes) {
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      message += `Job Notes: ${jobInfo.notes}\n`
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    message += `Submitted via Fettig Estimator App`

    const result = await pave({
      '$': { grantKey },
      createComment: {
        '$': { targetId: jobId, targetType: 'job', message },
        createdComment: { id: {} }
      }
    })

    if (result?.errors) {
      return res.status(400).json({ error: result.errors[0]?.message || 'Comment error' })
    }

    return res.status(200).json({ success: true, commentId: result?.createComment?.createdComment?.id })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
