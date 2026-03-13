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

  const jobId = '22MsvgnqcwLK'
  const results = {}

  // Probe createComment output fields
  const t1 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', content: 'Test comment from API' },
      createdComment: { id: {}, message: {}, text: {}, body: {}, createdAt: {} }
    }
  })
  results.t1_output_fields = t1?.raw || JSON.stringify(t1)

  // Try with just id
  const t2 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', content: 'Test comment from API' },
      createdComment: { id: {} }
    }
  })
  results.t2_id_only = t2?.raw || JSON.stringify(t2)

  // Try different input field names
  const t3 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', message: 'Test comment from API' },
      createdComment: { id: {} }
    }
  })
  results.t3_message_input = t3?.raw || JSON.stringify(t3)

  const t4 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', text: 'Test comment from API' },
      createdComment: { id: {} }
    }
  })
  results.t4_text_input = t4?.raw || JSON.stringify(t4)

  return res.status(200).json({ results })
}
