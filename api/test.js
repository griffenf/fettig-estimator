import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const execFileAsync = promisify(execFile)

// Minimal valid PDF
const VALID_PDF = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`

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

  const pdfBuffer = Buffer.from(VALID_PDF)
  const pdfSize = pdfBuffer.length
  const results = { pdfSize }

  const tmpFile = join(tmpdir(), 'test.pdf')
  writeFileSync(tmpFile, pdfBuffer)

  // Get upload URL
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { size: pdfSize, type: 'application/pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  if (!ur?.id) return res.status(200).json({ error: 'No upload request' })
  results.uploadRequestId = ur.id

  // Upload via curl
  const { stdout } = await execFileAsync('curl', [
    '-X', ur.method || 'PUT', '-s', '-w', '\n%{http_code}',
    '-H', 'content-type: application/pdf',
    '-H', `x-goog-content-length-range: ${pdfSize},${pdfSize}`,
    '--data-binary', `@${tmpFile}`,
    ur.url
  ])
  const lines = stdout.trim().split('\n')
  results.gcsStatus = parseInt(lines[lines.length - 1])
  unlinkSync(tmpFile)

  if (results.gcsStatus !== 200) return res.status(200).json({ results, error: 'GCS upload failed' })

  // Poll createFile every 2 seconds for up to 20 seconds
  results.attempts = []
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const fileRes = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId: ur.id },
        createdFile: { id: {}, name: {} }
      }
    })
    const txt = fileRes?.raw || JSON.stringify(fileRes)
    results.attempts.push({ attempt: i + 1, seconds: (i + 1) * 2, result: txt.slice(0, 80) })
    if (!txt.includes('valid upload request')) {
      results.SUCCESS = txt
      break
    }
  }

  return res.status(200).json({ results })
}
