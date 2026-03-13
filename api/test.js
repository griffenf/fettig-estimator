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

  // Try creating a note on the job
  const t1 = await pave({
    '$': { grantKey },
    createNote: {
      '$': { targetId: jobId, targetType: 'job', content: 'Test note from API' },
      createdNote: { id: {}, content: {} }
    }
  })
  results.createNote = t1?.raw || JSON.stringify(t1)

  // Try createMessage
  const t2 = await pave({
    '$': { grantKey },
    createMessage: {
      '$': { jobId, content: 'Test message from API' },
      createdMessage: { id: {} }
    }
  })
  results.createMessage = t2?.raw || JSON.stringify(t2)

  // Try createComment  
  const t3 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', content: 'Test comment from API' },
      createdComment: { id: {}, content: {} }
    }
  })
  results.createComment = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
