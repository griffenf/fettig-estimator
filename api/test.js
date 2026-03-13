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

  // createUploadRequest - probe every possible output field
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      id: {},
      url: {},
      uploadUrl: {},
      uploadId: {},
      key: {},
      bucket: {},
      createdUploadRequest: { id: {}, url: {} }
    }
  })
  results.t1_all_fields = t1?.raw || JSON.stringify(t1)

  // Try with no inputs at all to see what it says
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      id: {},
      url: {}
    }
  })
  results.t2_no_inputs = t2?.raw || JSON.stringify(t2)

  // Try createUploadRequest with just id output
  const t3 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf' },
      id: {}
    }
  })
  results.t3_contentType_id = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
