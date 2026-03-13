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

  // Try POSTing a multipart file directly to /upload endpoint
  try {
    const blob = new Blob(['%PDF-1.0 test'], { type: 'application/pdf' })
    const form = new FormData()
    form.append('file', blob, 'test.pdf')
    form.append('grantKey', grantKey)

    const r = await fetch('https://api.jobtread.com/upload', { method: 'POST', body: form })
    results.upload_endpoint_status = r.status
    results.upload_endpoint_body = await r.text()
  } catch(e) {
    results.upload_endpoint_error = e.message
  }

  // Try /files endpoint
  try {
    const blob = new Blob(['%PDF-1.0 test'], { type: 'application/pdf' })
    const form = new FormData()
    form.append('file', blob, 'test.pdf')
    form.append('grantKey', grantKey)

    const r = await fetch('https://api.jobtread.com/files', { method: 'POST', body: form })
    results.files_endpoint_status = r.status
    results.files_endpoint_body = await r.text()
  } catch(e) {
    results.files_endpoint_error = e.message
  }

  // Try requestFileUpload pave query
  const t3 = await pave({
    '$': { grantKey },
    requestFileUpload: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      id: {},
      url: {},
      fields: {}
    }
  })
  results.requestFileUpload = t3?.raw || JSON.stringify(t3)

  // Try uploadFile pave query
  const t4 = await pave({
    '$': { grantKey },
    uploadFile: {
      '$': { contentType: 'application/pdf', name: 'test.pdf' },
      id: {},
      url: {}
    }
  })
  results.uploadFile = t4?.raw || JSON.stringify(t4)

  return res.status(200).json({ results })
}
