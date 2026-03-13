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

  // Test 1: createUploadRequest with pdf field
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf' },
      pdf: {}
    }
  })
  results.t1_pdf_field = t1?.raw || JSON.stringify(t1)

  // Test 2: Try without any input
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      pdf: {}
    }
  })
  results.t2_no_input = t2?.raw || JSON.stringify(t2)

  // Test 3: Try requestUpload instead
  const t3 = await pave({
    '$': { grantKey },
    requestUpload: {
      '$': { contentType: 'application/pdf' },
      id: {},
      url: {}
    }
  })
  results.t3_requestUpload = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
