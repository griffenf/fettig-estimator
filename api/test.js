import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const execFileAsync = promisify(execFile)

export default async function handler(req, res) {
  const grantKey = process.env.JOBTREAD_API_KEY
  if (!grantKey) return res.status(200).json({ status: 'NO_API_KEY' })

  const jobId = '22MsvgnqcwLK'
  const orgId = '22MsEHuFtmri'

  async function pave(query) {
    const r = await fetch('https://api.jobtread.com/pave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const text = await r.text()
    try { return JSON.parse(text) } catch { return { raw: text } }
  }

  const testBuffer = Buffer.from('%PDF-1.4 test content')
  const pdfSize = testBuffer.length
  const results = {}

  const tmpFile = join(tmpdir(), 'test.pdf')
  writeFileSync(tmpFile, testBuffer)

  // Get files/ bucket URL via orgId+url
  const uploadReq = await pave({
    '$': { grantKey },
    createUploadRequest: {
      '$': { organizationId: orgId, url: 'https://pdfobject.com/pdf/sample.pdf' },
      createdUploadRequest: { id: {}, url: {}, method: {} }
    }
  })
  const ur = uploadReq?.createUploadRequest?.createdUploadRequest
  if (!ur?.id) return res.status(200).json({ error: 'No upload request' })

  results.uploadRequestId = ur.id
  results.bucket = ur.url?.includes('files/') ? 'files' : 'dropbox'

  // Parse signed headers so we send exactly what's required
  const signedHeaders = decodeURIComponent(ur.url.match(/X-Goog-SignedHeaders=([^&]+)/)?.[1] || '')
  results.signedHeaders = signedHeaders

  // Build curl args with only the signed headers
  const curlArgs = ['-X', ur.method || 'PUT', '-s', '-w', '\n%{http_code}']
  if (signedHeaders.includes('content-type')) curlArgs.push('-H', 'content-type: application/pdf')
  if (signedHeaders.includes('x-goog-content-length-range')) curlArgs.push('-H', `x-goog-content-length-range: ${pdfSize},${pdfSize}`)
  curlArgs.push('--data-binary', `@${tmpFile}`, ur.url)

  const { stdout } = await execFileAsync('curl', curlArgs)
  const lines = stdout.trim().split('\n')
  results.gcsStatus = parseInt(lines[lines.length - 1])
  results.gcsBody = lines.slice(0, -1).join('').slice(0, 150)

  unlinkSync(tmpFile)

  if (results.gcsStatus !== 200) return res.status(200).json({ results })

  await new Promise(r => setTimeout(r, 1000))
  const fileRes = await pave({
    '$': { grantKey },
    createFile: {
      '$': { name: 'test.pdf', targetId: jobId, targetType: 'job', uploadRequestId: ur.id },
      createdFile: { id: {}, name: {} }
    }
  })
  results.createFile = fileRes?.raw || JSON.stringify(fileRes)

  return res.status(200).json({ results })
}
