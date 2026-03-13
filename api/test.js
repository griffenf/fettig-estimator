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

  const jobId = '22MsvgnqcwLK' // real job ID from previous test

  const results = {}

  // Test 1: No file fields at all - should tell us what IS required
  const t1 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job' },
      createdFile: { id: {}, name: {} }
    }
  })
  results.no_content_field = t1?.raw || JSON.stringify(t1)

  // Test 2: Try "data" as field name
  const t2 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', data: 'test' },
      createdFile: { id: {}, name: {} }
    }
  })
  results.data_field = t2?.raw || JSON.stringify(t2)

  // Test 3: Try "file" as field name
  const t3 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', file: 'test' },
      createdFile: { id: {}, name: {} }
    }
  })
  results.file_field = t3?.raw || JSON.stringify(t3)

  // Test 4: Try multipart upload to a different endpoint
  const formData = new FormData()
  formData.append('operations', JSON.stringify({
    query: {
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType: 'job' },
        createdFile: { id: {}, name: {} }
      }
    }
  }))

  try {
    const r4 = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      body: formData
    })
    results.multipart_status = r4.status
    results.multipart_body = await r4.text()
  } catch(e) {
    results.multipart_error = e.message
  }

  return res.status(200).json({ results })
}
