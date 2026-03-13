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

  // Probe uploadRequest - try various inputs to see what it needs
  const t1 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { contentType: 'application/pdf' },
      id: {},
      url: {},
      fields: {}
    }
  })
  results.t1_contentType = t1?.raw || JSON.stringify(t1)

  const t2 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { type: 'application/pdf' },
      id: {},
      url: {}
    }
  })
  results.t2_type = t2?.raw || JSON.stringify(t2)

  const t3 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { mimeType: 'application/pdf' },
      id: {},
      url: {}
    }
  })
  results.t3_mimeType = t3?.raw || JSON.stringify(t3)

  const t4 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { filename: 'test.pdf' },
      id: {},
      url: {}
    }
  })
  results.t4_filename = t4?.raw || JSON.stringify(t4)

  const t5 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { name: 'test.pdf', contentType: 'application/pdf' },
      id: {},
      url: {},
      fields: {}
    }
  })
  results.t5_name_and_contentType = t5?.raw || JSON.stringify(t5)

  return res.status(200).json({ results })
}
