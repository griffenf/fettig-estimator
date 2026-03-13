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

  // createdUploadRequest - try with no inputs
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      createdUploadRequest: { id: {}, url: {}, uploadUrl: {}, key: {}, fields: {}, method: {} }
    }
  })
  results.t1_createdUploadRequest_subfields = t1?.raw || JSON.stringify(t1)

  // createdUploadRequest with just id
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      createdUploadRequest: { id: {} }
    }
  })
  results.t2_createdUploadRequest_id = t2?.raw || JSON.stringify(t2)

  // uploadRequest - probe its $ inputs
  const t3 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      uploadRequest: { '$': { contentType: 'application/pdf', name: 'test.pdf' }, id: {}, url: {}, method: {} }
    }
  })
  results.t3_uploadRequest_inputs = t3?.raw || JSON.stringify(t3)

  // uploadRequest with just id
  const t4 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      uploadRequest: { '$': { contentType: 'application/pdf' }, id: {} }
    }
  })
  results.t4_uploadRequest_id = t4?.raw || JSON.stringify(t4)

  return res.status(200).json({ results })
}
