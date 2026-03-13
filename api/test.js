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

  // Try createFile with just the required fields to see what it accepts
  // Send an intentionally incomplete query to get a helpful error back
  const result = await pave({
    '$': { grantKey },
    createFile: {
      '$': {
        name: 'test.pdf',
        targetId: 'invalid-id',
        targetType: 'job'
      },
      createdFile: {
        id: {},
        name: {}
      }
    }
  })

  return res.status(200).json({ result })
}
