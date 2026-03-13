import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const execFileAsync = promisify(execFile)

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

  async function uploadAndGetId() {
    const pdfBuffer = Buffer.from(VALID_PDF)
    const pdfSize = pdfBuffer.length
    const tmpFile = join(tmpdir(), `test-${Date.now()}.pdf`)
    writeFileSync(tmpFile, pdfBuffer)
    const uploadReq = await pave({
      '$': { grantKey },
      createUploadRequest: {
        '$': { size: pdfSize, type: 'application/pdf' },
        createdUploadRequest: { id: {}, url: {}, method: {} }
      }
    })
    const ur = uploadReq?.createUploadRequest?.createdUploadRequest
    await execFileAsync('curl', [
      '-X', ur.method || 'PUT', '-s',
      '-H', 'content-type: application/pdf',
      '-H', `x-goog-content-length-range: ${pdfSize},${pdfSize}`,
      '--data-binary', `@${tmpFile}`, ur.url
    ])
    unlinkSync(tmpFile)
    return ur.id
  }

  const results = {}

  // Try different targetType values
  for (const targetType of ['job', 'Job', 'JOB', 'account', 'organization', 'project']) {
    const id = await uploadAndGetId()
    const r = await pave({
      '$': { grantKey },
      createFile: {
        '$': { name: 'test.pdf', targetId: jobId, targetType, uploadRequestId: id },
        createdFile: { id: {} }
      }
    })
    const txt = r?.raw || JSON.stringify(r)
    results['targetType_' + targetType] = txt.includes('valid upload request') ? '⚠️ same error'
      : txt.includes('no value is ever expected') ? '❌ invalid'
      : '✅ ' + txt.slice(0, 120)
  }

  // Try without targetId/targetType at all
  const id2 = await uploadAndGetId()
  const r2 = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', uploadRequestId: id2 },
      createdFile: { id: {} }
    }
  })
  results.noTarget = (r2?.raw || JSON.stringify(r2)).slice(0, 120)

  return res.status(200).json({ results })
}
