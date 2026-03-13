export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  const { q } = req.query
  if (!q || q.trim().length < 2) return res.json({ customers: [] })

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
              organization: { id: {}, name: {} }
            }
          }
        }
      }
    })

    const orgId = orgRes?.currentGrant?.user?.memberships?.nodes?.[0]?.organization?.id
    if (!orgId) return res.status(400).json({ error: 'Could not get organization ID. Check your grant key.' })

    // Step 2: Search customers by name and get their jobs
    const searchRes = await pave({
      '$': { grantKey },
      organization: {
        '$': { id: orgId },
        id: {},
        accounts: {
          '$': {
            where: {
              and: [
                ['name', 'like', `%${q.trim()}%`],
                ['type', '=', 'customer']
              ]
            },
            size: 10
          },
          nodes: {
            id: {},
            name: {},
            jobs: {
              '$': { size: 20 },
              nodes: {
                id: {},
                name: {},
                status: {},
                location: {
                  id: {},
                  address: {}
                }
              }
            }
          }
        }
      }
    })

    if (searchRes?.errors) {
      return res.status(400).json({ error: searchRes.errors[0]?.message || 'Query error' })
    }

    const rawAccounts = searchRes?.organization?.accounts?.nodes || []
    const customers = rawAccounts.map(a => ({
      id: a.id,
      name: a.name,
      jobs: {
        nodes: (a.jobs?.nodes || []).map(j => ({
          id: j.id,
          name: j.name,
          status: j.status,
          address: j.location?.address ? { street: j.location.address } : null
        }))
      }
    }))

    return res.status(200).json({ customers })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
