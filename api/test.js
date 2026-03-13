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

  // Try createUploadRequest with pdf output field
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      pdf: {}
    }
  })
  results.t1_pdf_field = t1?.raw || JSON.stringify(t1)

  // Try pdf subfields
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      pdf: { url: {}, id: {}, uploadUrl: {}, key: {}, fields: {} }
    }
  })
  results.t2_pdf_subfields = t2?.raw || JSON.stringify(t2)

  // Try without name input
  const t3 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf' },
      pdf: { url: {}, id: {}, uploadUrl: {}, key: {} }
    }
  })
  results.t3_no_name = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
