export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22MsvgnqcwLK'

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

  // Mode 1: size + type to get an upload URL
  const t1 = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { size: 100000, type: 'application/pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  results.t1_size_type = t1?.raw || JSON.stringify(t1)

  // Mode 2: organizationId + url (link existing file)
  // First get our org ID
  const orgRes = await pave({
    '$': { grantKey },
    currentGrant: { user: { memberships: { nodes: { organization: { id: {} } } } } }
  })
  const orgId = orgRes?.currentGrant?.user?.memberships?.nodes?.[0]?.organization?.id
  results.orgId = orgId

  if (orgId) {
    const t2 = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { organizationId: orgId, url: 'https://example.com/test.pdf' },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })
    results.t2_orgId_url = t2?.raw || JSON.stringify(t2)
  }

  return res.status(200).json({ results })
}
