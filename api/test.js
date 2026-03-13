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

  // Step 1: Get a valid upload request ID - try with contentType only, see what fields come back
  const t1 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { contentType: 'application/pdf' },
      id: {},
      url: {}
    }
  })
  results.t1_with_url = t1?.raw || JSON.stringify(t1)

  // Step 2: Try without url field
  const t2 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { contentType: 'application/pdf' },
      id: {}
    }
  })
  results.t2_id_only = t2?.raw || JSON.stringify(t2)

  // Step 3: What does uploadRequest with an actual id look like? 
  // Maybe "id" is an input not an output - it creates an upload slot with a given id
  const t3 = await pave({
    '$': { grantKey },
    uploadRequest: {
      '$': { id: 'test-upload-1', contentType: 'application/pdf' },
      url: {},
      method: {}
    }
  })
  results.t3_id_as_input = t3?.raw || JSON.stringify(t3)

  return res.status(200).json({ results })
}
