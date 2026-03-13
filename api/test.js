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

  // Get org ID first
  const orgRes = await pave({
    '$': { grantKey },
    currentGrant: {
      user: { memberships: { nodes: { organization: { id: {} } } } }
    }
  })
  const orgId = orgRes?.currentGrant?.user?.memberships?.nodes?.[0]?.organization?.id

  // Get a real job ID to test with
  const jobRes = await pave({
    '$': { grantKey },
    organization: {
      '$': { id: orgId },
      jobs: {
        '$': { size: 1 },
        nodes: { id: {}, name: {} }
      }
    }
  })
  const job = jobRes?.organization?.jobs?.nodes?.[0]
  if (!job) return res.json({ error: 'No jobs found in your account' })

  // Try createFile with a tiny test PDF using different field name "url" instead of "content"
  const tinyPdf = 'JVBERi0xLjAKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxNgolJUVPRgo='

  const results = {}

  // Test with "url" field
  const t1 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', url: 'https://www.w3.org/WAI/UR/work/pdf/PDF-in-10-minutes.pdf', targetId: job.id, targetType: 'job' },
      createdFile: { id: {}, name: {} }
    }
  })
  results.test_url_field = t1?.raw || t1

  return res.status(200).json({ jobUsed: job, results })
}
