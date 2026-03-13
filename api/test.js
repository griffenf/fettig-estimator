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

  // Try pdf with type=document and probe subfields
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      pdf: { '$': { type: 'document' }, url: {}, id: {}, key: {}, fields: {}, uploadUrl: {}, method: {} }
    }
  })
  results.t1_document_type = t1?.raw || JSON.stringify(t1)

  // Try with type=specifications
  const t2 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      pdf: { '$': { type: 'specifications' }, url: {}, id: {}, key: {}, fields: {} }
    }
  })
  results.t2_specifications_type = t2?.raw || JSON.stringify(t2)

  // Try pdf with document type, just id
  const t3 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      pdf: { '$': { type: 'document' }, id: {} }
    }
  })
  results.t3_document_id_only = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
