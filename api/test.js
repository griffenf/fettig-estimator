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

  // Write test PDF to temp file
  const tmpFile = join(tmpdir(), 'test.pdf')
  writeFileSync(tmpFile, testBuffer)

  // Get upload URL (dropbox bucket)
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

  // Use curl to upload — completely bypasses Vercel's fetch/https patching
  try {
    const { stdout, stderr } = await execFileAsync('curl', [
      '-X', 'PUT',
      '-H', `content-type: application/pdf`,
      '-H', `x-goog-content-length-range: ${pdfSize},${pdfSize}`,
      '--data-binary', `@${tmpFile}`,
      '-w', '\n%{http_code}',
      '-s',
      ur.url
    ])
    const lines = stdout.trim().split('\n')
    const statusCode = lines[lines.length - 1]
    results.gcsStatus = parseInt(statusCode)
    results.gcsBody = lines.slice(0, -1).join('\n').slice(0, 150)
  } catch (e) {
    results.curlError = e.message
  }

  unlinkSync(tmpFile)

  if (results.gcsStatus !== 200) return res.status(200).json({ results })

  // Try createFile
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
