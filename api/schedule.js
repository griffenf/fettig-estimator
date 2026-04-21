// api/schedule.js
// Returns Brian's window/patio door estimate tasks from JobTread.
// Two-pass approach to stay under request size limits:
//   Pass 1 — fetch all Estimate tasks (lightweight: id, name, description, startDate, startTime, taskAssignments)
//             filter to Brian's tasks with window/door keywords
//   Pass 2 — fetch full job/location/contact details only for the matched tasks (by job ID)

const ORG_ID          = '22MsEHuFtmri'
const BRIAN_MEMBER    = '22MsEHuVFXCv'  // Brian Fettig's membership ID
const ESTIMATE_TYPE   = '22NQYsZ7efY7'  // "Estimates" task type ID
const TODO_TYPE       = '22NQYsZ7efYB'  // "To-Do Tasks" task type ID
const PAGE_SIZE       = 50              // smaller pages to avoid 413

const WINDOW_KEYWORDS = ['window', 'windows', 'patio door', 'patio doors']
const FINAL_KEYWORD   = 'final measurement'

function isWindowOrDoorTask(name = '', description = '') {
  const haystack = `${name} ${description}`.toLowerCase()
  return WINDOW_KEYWORDS.some(kw => haystack.includes(kw))
}

function isFinalMeasurementTask(name = '') {
  return name.toLowerCase().includes(FINAL_KEYWORD)
}

function formatPhone(raw) {
  if (!raw) return null
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

function formatDate(startDate) {
  if (!startDate) return null
  const [y, m, d] = startDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(startTime) {
  if (!startTime) return null
  const [hh, mm] = startTime.split(':').map(Number)
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 || 12
  return `${h12}:${String(mm).padStart(2,'0')} ${ampm}`
}

async function pave(grantKey, query) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { $: { grantKey }, ...query } }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`JobTread API error: ${res.status}`)
    return res.json()
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Schedule API timed out — please refresh')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

// Pass 1: fetch lightweight task list for a given task type, paginated
async function fetchTasksOfType(grantKey, taskTypeId, filterFn) {
  let allTasks = []
  let pageToken = null

  do {
    const data = await pave(grantKey, {
      organization: {
        $: { id: ORG_ID },
        tasks: {
          $: {
            size: PAGE_SIZE,
            sortBy: [{ field: 'startDate', order: 'asc' }],
            where: { and: [
              [['taskType', 'id'], taskTypeId],
              ['completed', 0],
            ]},
            ...(pageToken ? { page: pageToken } : {}),
          },
          nextPage: {},
          nodes: {
            id: {},
            name: {},
            description: {},
            startDate: {},
            startTime: {},
            job: { id: {} },
            taskAssignments: {
              nodes: {
                membership: { id: {} }
              }
            }
          }
        }
      }
    })

    const conn = data?.organization?.tasks
    const nodes = conn?.nodes || []
    pageToken = conn?.nextPage || null

    const matched = nodes.filter(t =>
      t.taskAssignments?.nodes?.some(a => a.membership?.id === BRIAN_MEMBER) &&
      filterFn(t)
    )

    allTasks = allTasks.concat(matched)
  } while (pageToken)

  return allTasks
}

async function fetchAllEstimateTasks(grantKey) {
  // Fetch Estimate tasks (window/patio door) and To-Do Tasks (final measurement) in parallel
  const [estimateTasks, todoTasks] = await Promise.all([
    fetchTasksOfType(grantKey, ESTIMATE_TYPE, t => isWindowOrDoorTask(t.name, t.description)),
    fetchTasksOfType(grantKey, TODO_TYPE, t => isFinalMeasurementTask(t.name)),
  ])
  return [...estimateTasks, ...todoTasks]
}

// Pass 2: fetch job details for a single job ID
async function fetchJobDetails(grantKey, jobId) {
  if (!jobId) return null
  try {
    const data = await pave(grantKey, {
      job: {
        $: { id: jobId },
        id: {},
        name: {},
        location: {
          formattedAddress: {},
          street: {},
          city: {},
          state: {},
          account: {
            id: {},
            name: {},
            contacts: {
              $: { size: 2 },
              nodes: {
                name: {},
                customFieldValues: {
                  $: { size: 8 },
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
    })
    return data?.job || null
  } catch {
    return null
  }
}

function extractPhone(job) {
  const contacts = job?.location?.account?.contacts?.nodes || []
  for (const contact of contacts) {
    const phoneField = contact.customFieldValues?.nodes?.find(
      cfv => cfv.customField?.name?.toLowerCase().includes('phone')
    )
    if (phoneField?.value) return formatPhone(phoneField.value)
  }
  return null
}

module.exports.config = { api: { bodyParser: { sizeLimit: '50mb' } } }

const handler = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(500).json({ error: 'JOBTREAD_API_KEY not configured in Vercel.' })

  try {
    // Pass 1: get all matching tasks (lightweight)
    const tasks = await fetchAllEstimateTasks(grantKey)

    // Pass 2: fetch job details in parallel (only for tasks that have a job)
    const jobIds = [...new Set(tasks.map(t => t.job?.id).filter(Boolean))]
    const jobMap = {}

    // Fetch in small batches to avoid overwhelming the API
    const BATCH = 5
    for (let i = 0; i < jobIds.length; i += BATCH) {
      const batch = jobIds.slice(i, i + BATCH)
      const results = await Promise.all(batch.map(id => fetchJobDetails(grantKey, id)))
      batch.forEach((id, idx) => { if (results[idx]) jobMap[id] = results[idx] })
    }

    // Shape the final response
    const shaped = tasks.map(task => {
      const job = task.job?.id ? jobMap[task.job.id] : null
      const loc = job?.location
      const account = loc?.account

      const address = loc?.formattedAddress
        || [loc?.street, loc?.city, loc?.state].filter(Boolean).join(', ')
        || null

      return {
        taskId: task.id,
        taskName: task.name,
        taskDescription: task.description || null,
        startDate: task.startDate,
        dateLabel: formatDate(task.startDate),
        timeLabel: formatTime(task.startTime),
        jobId: job?.id || null,
        jobName: job?.name || null,
        customerName: account?.name || null,
        address,
        phone: extractPhone(job),
      }
    })

    return res.status(200).json({ tasks: shaped })

  } catch (err) {
    console.error('Schedule API error:', err)
    return res.status(500).json({ error: err.message || 'Failed to fetch schedule' })
  }
}

handler.config = { api: { bodyParser: { sizeLimit: '50mb' } } }
module.exports = handler
