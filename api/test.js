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

  // Probe root-level field names related to uploads
  const guesses = ['createUpload', 'upload', 'fileUpload', 'createFileUpload', 
                   'signedUpload', 'presignedUpload', 'getUploadUrl', 'uploadRequest',
                   'createAttachment', 'attachment']

  for (const name of guesses) {
    const q = { '$': { grantKey } }
    q[name] = { id: {} }
    const t = await pave(q)
    const msg = t?.raw || JSON.stringify(t)
    // Only show ones that don't say "does not exist"
    if (!msg.includes('does not exist')) {
      results[name] = msg
    }
  }

  // Also try createFile with "uploadRequestId" field explicitly
  const t2 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { 
        name: 'test.pdf', 
        targetId: '22MsvgnqcwLK', 
        targetType: 'job',
        uploadRequestId: 'test'
      },
      createdFile: { id: {}, name: {} }
    }
  })
  results.createFile_uploadRequestId = t2?.raw || JSON.stringify(t2)

  // Try with "existingFileId"
  const t3 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { 
        name: 'test.pdf', 
        targetId: '22MsvgnqcwLK', 
        targetType: 'job',
        existingFileId: 'test'
      },
      createdFile: { id: {}, name: {} }
    }
  })
  results.createFile_existingFileId = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
