export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22MsvgnqcwLK'

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

  // Does createComment support a subject?
  const t1 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', message: 'test', subject: 'Estimate' },
      createdComment: { id: {} }
    }
  })
  results.t1_comment_subject = t1?.raw || JSON.stringify(t1)

  // Does createComment support fileId or attachments?
  const t2 = await pave({
    '$': { grantKey },
    createComment: {
      '$': { targetId: jobId, targetType: 'job', message: 'test', fileId: 'abc' },
      createdComment: { id: {} }
    }
  })
  results.t2_comment_fileId = t2?.raw || JSON.stringify(t2)

  // Try createActivity
  const t3 = await pave({
    '$': { grantKey },
    createActivity: {
      '$': { targetId: jobId, targetType: 'job', subject: 'Estimate', message: 'Estimate PDF' },
      createdActivity: { id: {} }
    }
  })
  results.t3_createActivity = t3?.raw || JSON.stringify(t3)

  // Try createJobMessage
  const t4 = await pave({
    '$': { grantKey },
    createJobMessage: {
      '$': { jobId, subject: 'Estimate', message: 'Estimate PDF' },
      createdJobMessage: { id: {} }
    }
  })
  results.t4_createJobMessage = t4?.raw || JSON.stringify(t4)

  // Try createEmail
  const t5 = await pave({
    '$': { grantKey },
    createEmail: {
      '$': { targetId: jobId, targetType: 'job', subject: 'Estimate', body: 'Estimate PDF' },
      createdEmail: { id: {} }
    }
  })
  results.t5_createEmail = t5?.raw || JSON.stringify(t5)

  return res.status(200).json({ results })
}
