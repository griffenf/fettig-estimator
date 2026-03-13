export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  const { pdfBase64, fileName, jobId } = req.body
  if (!pdfBase64 || !fileName) return res.status(400).json({ error: 'Missing PDF data or file name.' })

  async function pave(query) {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const text = await r.text()
    try { return JSON.parse(text) } catch { throw new Error(`Pave returned: ${text.slice(0, 300)}`) }
  }

  try {
    // Step 1: Get org ID
    const orgRes = await pave({
      '$': { grantKey },
      currentGrant: {
        user: {
          memberships: {
            nodes: {
              organization: { id: {} }
            }
          }
        }
      }
    })

    const organizationId = orgRes?.currentGrant?.user?.memberships?.nodes?.[0]?.organization?.id
    if (!organizationId) return res.status(400).json({ error: 'Could not get organization ID. Check your grant key.' })

    // Step 2: Upload file
    const uploadQuery = {
      '$': { grantKey },
      createFile: {
        '$': {
          organizationId,
          name: fileName,
          content: pdfBase64,
          contentType: 'application/pdf',
          ...(jobId ? { jobId } : {})
        },
        createdFile: {
          id: {},
          name: {}
        }
      }
    }

    const uploadRes = await pave(uploadQuery)

    if (uploadRes?.errors) {
      return res.status(400).json({ error: uploadRes.errors[0]?.message || 'Upload error' })
    }

    return res.status(200).json({ success: true, file: uploadRes?.createFile?.createdFile })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
