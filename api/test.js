export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  try {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          '$': { grantKey },
          currentGrant: {
            id: {},
            user: {
              id: {},
              name: {},
              memberships: {
                nodes: {
                  organization: { id: {}, name: {} }
                }
              }
            }
          }
        }
      })
    })

    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { return res.json({ error: 'Non-JSON response', raw: text }) }

    return res.json({ status: 'OK', response: data })
  } catch (err) {
    return res.json({ error: err.message })
  }
}
