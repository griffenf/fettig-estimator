// api/schedule.js
// Returns Brian's estimate tasks from JobTread, filtered to window/patio door related estimates only.
// Paginates through all results, filters by task name/description, sorts by startDate asc.

const ORG_ID         = '22MsEHuFtmri'
const BRIAN_MEMBER   = '22MsEHuVFXCv'  // Brian Fettig's membership ID
const ESTIMATE_TYPE  = '22NQYsZ7efY7'  // "Estimates" task type ID
const PAGE_SIZE      = 100

// Keywords that qualify a task as window/patio door related (case-insensitive)
const WINDOW_KEYWORDS = ['window', 'windows', 'patio door', 'patio doors']

function isWindowOrDoorTask(name = '', description = '') {
  const haystack = `${name} ${description}`.toLowerCase()
  return WINDOW_KEYWORDS.some(kw => haystack.includes(kw))
}

function formatPhone(raw) {
  if (!raw) return null
  // Strip to digits only (handles +1XXXXXXXXXX format)
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    const d = digits.slice(1)
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }
  return raw
}

async function fetchPage(grantKey, pageToken) {
  const query = {
    organization: {
      $: { id: ORG_ID },
      tasks: {
        $: {
          size: PAGE_SIZE,
          sortBy: [{ field: 'startDate', order: 'asc' }],
          where: {
            and: [
              [['taskType', 'id'], ESTIMATE_TYPE],
            ]
          },
          ...(pageToken ? { page: pageToken } : {}),
        },
        nextPage: {},
        nodes: {
          id: {},
          name: {},
          description: {},
          startDate: {},
          startTime: {},
          taskAssignments: {
            nodes: {
              membership: {
                id: {},
              }
            }
          },
          job: {
            id: {},
            name: {},
            location: {
              formattedAddress: {},
              street: {},
              city: {},
              state: {},
              postalCode: {},
              account: {
                id: {},
                name: {},
                contacts: {
                  $: { size: 3 },
                  nodes: {
                    id: {},
                    name: {},
                    customFieldValues: {
                      $: { size: 10 },
                      nodes: {
                        customField: { name: {} },
                        value: {},
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const res = await fetch('https://api.jobtread.com/pave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { $: { grantKey }, ...query } }),
  })

  if (!res.ok) throw new Error(`JobTread API error: ${res.status}`)
  const data = await res.json()
  const conn = data?.organization?.tasks
  return {
    nodes: conn?.nodes || [],
    nextPage: conn?.nextPage || null,
  }
}

function shapeTask(task) {
  const job = task.job
  const loc = job?.location
  const account = loc?.account
  const contacts = account?.contacts?.nodes || []

  // Find primary phone from first contact's customFieldValues
  let phone = null
  for (const contact of contacts) {
    const phoneField = contact.customFieldValues?.nodes?.find(
      cfv => cfv.customField?.name?.toLowerCase().includes('phone')
    )
    if (phoneField?.value) {
      phone = formatPhone(phoneField.value)
      break
    }
  }

  // Format address
  const address = loc?.formattedAddress
    || [loc?.street, loc?.city, loc?.state].filter(Boolean).join(', ')
    || null

  // Format date: "Mon Apr 14" style
  let dateLabel = null
  if (task.startDate) {
    const [y, m, d] = task.startDate.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    dateLabel = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Format time: "1:30 PM" style
  let timeLabel = null
  if (task.startTime) {
    const [hh, mm] = task.startTime.split(':').map(Number)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const h12 = hh % 12 || 12
    timeLabel = `${h12}:${String(mm).padStart(2,'0')} ${ampm}`
  }

  return {
    taskId: task.id,
    taskName: task.name,
    taskDescription: task.description || null,
    startDate: task.startDate,
    dateLabel,
    timeLabel,
    jobId: job?.id || null,
    jobName: job?.name || null,
    customerName: account?.name || null,
    address,
    phone,
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  try {
    // Paginate through all estimate tasks
    let allTasks = []
    let pageToken = null

    do {
      const { nodes, nextPage } = await fetchPage(grantKey, pageToken)

      // Filter to Brian's tasks only (taskAssignments membership match)
      const brianTasks = nodes.filter(t =>
        t.taskAssignments?.nodes?.some(a => a.membership?.id === BRIAN_MEMBER)
      )

      // Filter to window/patio door related by name or description
      const relevant = brianTasks.filter(t =>
        isWindowOrDoorTask(t.name, t.description)
      )

      allTasks = allTasks.concat(relevant)
      pageToken = nextPage
    } while (pageToken)

    // Sort by startDate ascending (nulls last)
    allTasks.sort((a, b) => {
      if (!a.startDate) return 1
      if (!b.startDate) return -1
      return a.startDate.localeCompare(b.startDate)
    })

    const shaped = allTasks.map(shapeTask)
    return res.status(200).json({ tasks: shaped })

  } catch (err) {
    console.error('Schedule API error:', err)
    return res.status(500).json({ error: err.message || 'Failed to fetch schedule' })
  }
}
