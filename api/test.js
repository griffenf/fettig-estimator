export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  async function pave(query) {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const text = await r.text()
    try { return JSON.parse(text) } catch { return { raw: text } }
  }

  const results = {}

  // Step 1: Request an upload URL from JobTread
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf' },
      id: {},
      url: {},
      fields: {}
    }
  })
  results.createUploadRequest = uploadReq?.raw || JSON.stringify(uploadReq)

  return res.status(200).json({ results })
}
