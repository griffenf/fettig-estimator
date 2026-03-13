import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'

// ─── Data ────────────────────────────────────────────────────────────────────

const WINDOW_STYLES = [
  'Single Hung', 'Double Hung', 'Casement', 'Sliding',
  'Fixed / Picture', 'Awning', 'Bay', 'Bow', 'Garden', 'Custom'
]
const EXTERIOR_COLORS = ['White', 'Bronze', 'Clay', 'Tan', 'Almond', 'Black', 'Custom']
const INTERIOR_COLORS = ['White', 'Natural Wood', 'Pine', 'Dark Bronze', 'Black', 'Custom']
const GLASS_OPTIONS = ['Clear', 'Low-E', 'Tempered', 'Obscure', 'Low-E Tempered', 'Triple Pane', 'Custom']
const GRID_PATTERNS = ['No Grid', 'Colonial', 'Prairie', 'Diamond', 'Custom']
const EMPTY_WINDOW = { style: '', width: '', height: '', qty: '1', exteriorColor: '', interiorColor: '', glass: '', grid: '', notes: '' }

// ─── PDF Generator ───────────────────────────────────────────────────────────

function generatePDF(jobInfo, windows) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 48
  let y = 0

  doc.setFillColor(26, 35, 50); doc.rect(0, 0, W, 80, 'F')
  doc.setFillColor(200, 151, 58); doc.rect(0, 80, W, 3, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(245, 243, 239)
  doc.text('FETTIG MILLWORK & WINDOWS, INC.', margin, 34)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 151, 58)
  doc.text('WINDOW ESTIMATE', margin, 56)
  doc.setFontSize(10); doc.setTextColor(138, 154, 176)
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), W - margin, 56, { align: 'right' })
  y = 110

  const fields = [
    ['Customer', jobInfo.customerName],
    ['Job Name', jobInfo.jobName],
    ['Job Address', jobInfo.address],
    ['Estimator', jobInfo.estimator],
  ].filter(([, v]) => v)

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 151, 58)
  doc.text('JOB INFORMATION', margin, y); y += 16

  const col2 = W / 2; let leftY = y, rightY = y
  fields.forEach(([label, value], i) => {
    const cx = i % 2 === 0 ? margin : col2
    let cy = i % 2 === 0 ? leftY : rightY
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(138, 154, 176)
    doc.text(label.toUpperCase(), cx, cy); cy += 13
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(26, 35, 50)
    doc.text(value || '—', cx, cy); cy += 18
    if (i % 2 === 0) leftY = cy; else rightY = cy
  })
  y = Math.max(leftY, rightY) + 12

  doc.setDrawColor(200, 151, 58); doc.setLineWidth(0.5); doc.line(margin, y, W - margin, y); y += 16
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 151, 58)
  doc.text('WINDOWS', margin, y); y += 14

  const cols = {
    num:   { x: margin,       label: '#' },
    style: { x: margin + 24,  label: 'STYLE' },
    size:  { x: margin + 114, label: 'SIZE (W×H)' },
    qty:   { x: margin + 184, label: 'QTY' },
    ext:   { x: margin + 212, label: 'EXT COLOR' },
    int:   { x: margin + 284, label: 'INT COLOR' },
    glass: { x: margin + 356, label: 'GLASS' },
    grid:  { x: margin + 436, label: 'GRID' },
  }

  doc.setFillColor(26, 35, 50); doc.rect(margin, y - 10, W - margin * 2, 16, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(200, 151, 58)
  Object.values(cols).forEach(col => doc.text(col.label, col.x + 3, y + 1)); y += 14

  windows.forEach((win, i) => {
    if (y > 680) { doc.addPage(); y = 60 }
    const bg = i % 2 === 0 ? [245, 243, 239] : [235, 232, 226]
    doc.setFillColor(...bg)
    const rowH = win.notes ? 26 : 16
    doc.rect(margin, y - 10, W - margin * 2, rowH, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(26, 35, 50)
    const size = win.width && win.height ? `${win.width}" × ${win.height}"` : '—'
    doc.text(String(i + 1), cols.num.x + 3, y)
    doc.text(win.style || '—', cols.style.x + 3, y)
    doc.text(size, cols.size.x + 3, y)
    doc.text(String(win.qty || 1), cols.qty.x + 3, y)
    doc.text(win.exteriorColor || '—', cols.ext.x + 3, y)
    doc.text(win.interiorColor || '—', cols.int.x + 3, y)
    doc.text(win.glass || '—', cols.glass.x + 3, y)
    doc.text(win.grid || '—', cols.grid.x + 3, y)
    if (win.notes) {
      doc.setFontSize(8); doc.setTextColor(80, 90, 110)
      doc.text(`Note: ${win.notes}`, cols.style.x + 3, y + 13, { maxWidth: W - margin * 2 - 30 })
    }
    y += rowH + 2
  })

  y += 8
  doc.setFillColor(26, 35, 50); doc.rect(margin, y - 10, W - margin * 2, 22, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(200, 151, 58)
  const totalQty = windows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)
  doc.text(`TOTAL WINDOWS: ${windows.length} line items  |  ${totalQty} units`, margin + 8, y + 5)

  if (jobInfo.notes) {
    y += 28
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 151, 58)
    doc.text('ADDITIONAL NOTES', margin, y); y += 14
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(26, 35, 50)
    doc.splitTextToSize(jobInfo.notes, W - margin * 2).forEach(line => { doc.text(line, margin, y); y += 14 })
  }

  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(26, 35, 50); doc.rect(0, pageH - 36, W, 36, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(138, 154, 176)
  doc.text('Fettig Millwork & Windows, Inc.  —  Window Estimate', margin, pageH - 14)
  doc.setTextColor(200, 151, 58); doc.text('CONFIDENTIAL', W - margin, pageH - 14, { align: 'right' })

  return doc
}

// ─── Customer Search Component ────────────────────────────────────────────────

function CustomerJobSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setResults(data.customers || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [query])

  const handleSelectJob = (customer, job) => {
    onSelect({
      customerName: customer.name,
      jobId: job.id,
      jobName: job.name,
      address: [job.address?.street, job.address?.city, job.address?.state].filter(Boolean).join(', ')
    })
    setQuery('')
    setResults([])
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          placeholder="Start typing a customer name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
        {loading && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)', fontSize: 12 }}>
            Searching...
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, fontSize: 13, color: '#e74c3c' }}>
          ⚠️ {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--navy-mid)', border: '1.5px solid var(--gold)',
          borderRadius: 8, marginTop: 4, maxHeight: 340, overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          {results.map(customer => (
            <div key={customer.id}>
              {/* Customer header */}
              <div
                onClick={() => setExpanded(expanded === customer.id ? null : customer.id)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(200,151,58,0.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{customer.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                    {customer.jobs?.nodes?.length || 0} job{customer.jobs?.nodes?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ color: 'var(--gold)', fontSize: 12 }}>
                  {expanded === customer.id ? '▲' : '▼'}
                </div>
              </div>

              {/* Jobs list */}
              {expanded === customer.id && customer.jobs?.nodes?.map(job => (
                <div
                  key={job.id}
                  onClick={() => handleSelectJob(customer, job)}
                  style={{
                    padding: '10px 14px 10px 28px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(200,151,58,0.08)',
                    background: 'rgba(200,151,58,0.05)',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,151,58,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,151,58,0.05)'}
                >
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{job.name || `Job #${job.id}`}</div>
                  {job.address?.street && (
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                      📍 {[job.address.street, job.address.city, job.address.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {job.status && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {job.status}
                    </div>
                  )}
                </div>
              ))}

              {expanded === customer.id && (!customer.jobs?.nodes?.length) && (
                <div style={{ padding: '10px 28px', fontSize: 13, color: 'var(--gray)', fontStyle: 'italic' }}>
                  No jobs found for this customer.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && !error && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--navy-mid)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--gray)' }}>
          No customers found matching "{query}"
        </div>
      )}
    </div>
  )
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label>{label}</label>
      {children}
    </div>
  )
}

function WindowCard({ win, index, onEdit, onRemove }) {
  return (
    <div style={{ background: 'var(--navy-light)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}>#{index + 1}</span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17 }}>{win.style || 'Unnamed Window'}</span>
            <span style={{ color: 'var(--gray)', fontSize: 13 }}>× {win.qty}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: 'var(--gray)' }}>
            {win.width && win.height && <span>📐 {win.width}" × {win.height}"</span>}
            {win.exteriorColor && <span>🎨 Ext: {win.exteriorColor}</span>}
            {win.interiorColor && <span>🪵 Int: {win.interiorColor}</span>}
            {win.glass && <span>🪟 {win.glass}</span>}
            {win.grid && win.grid !== 'No Grid' && <span>⊞ {win.grid}</span>}
          </div>
          {win.notes && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray)', fontStyle: 'italic' }}>"{win.notes}"</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn-outline" onClick={() => onEdit(index)} style={{ padding: '6px 12px', fontSize: 13 }}>Edit</button>
          <button className="btn-danger" onClick={() => onRemove(index)}>✕</button>
        </div>
      </div>
    </div>
  )
}

function WindowForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_WINDOW)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.style && form.width && form.height

  return (
    <div style={{ background: 'var(--navy-mid)', border: '2px solid var(--gold)', borderRadius: 10, padding: '20px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>Window Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Window Style *">
            <select value={form.style} onChange={e => set('style', e.target.value)}>
              <option value="">Select style...</option>
              {WINDOW_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Width (inches) *"><input type="number" placeholder="e.g. 36" value={form.width} onChange={e => set('width', e.target.value)} /></Field>
        <Field label="Height (inches) *"><input type="number" placeholder="e.g. 48" value={form.height} onChange={e => set('height', e.target.value)} /></Field>
        <Field label="Quantity"><input type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} /></Field>
        <div />
        <Field label="Exterior Color">
          <select value={form.exteriorColor} onChange={e => set('exteriorColor', e.target.value)}>
            <option value="">Select...</option>
            {EXTERIOR_COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Interior Color">
          <select value={form.interiorColor} onChange={e => set('interiorColor', e.target.value)}>
            <option value="">Select...</option>
            {INTERIOR_COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Glass Option">
          <select value={form.glass} onChange={e => set('glass', e.target.value)}>
            <option value="">Select...</option>
            {GLASS_OPTIONS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Grid Pattern">
          <select value={form.grid} onChange={e => set('grid', e.target.value)}>
            <option value="">Select...</option>
            {GRID_PATTERNS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Notes / Special Instructions">
            <textarea rows={2} placeholder="Any special notes for this window..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn-gold" onClick={() => valid && onSave(form)} style={{ flex: 1, opacity: valid ? 1 : 0.5 }}>Save Window</button>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState('job')
  const [jobInfo, setJobInfo] = useState({
    customerName: '', jobId: '', jobName: '', address: '', estimator: '', notes: ''
  })
  const [windows, setWindows] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const setJob = (k, v) => setJobInfo(f => ({ ...f, [k]: v }))

  const handleJobSelect = (selected) => {
    setJobInfo(f => ({
      ...f,
      customerName: selected.customerName,
      jobId: selected.jobId,
      jobName: selected.jobName,
      address: selected.address,
    }))
  }

  const saveWindow = (win) => {
    if (editIndex !== null) {
      setWindows(ws => ws.map((w, i) => i === editIndex ? win : w))
      setEditIndex(null)
    } else {
      setWindows(ws => [...ws, win])
    }
    setShowForm(false)
  }

  const handleDownloadPDF = () => {
    const doc = generatePDF(jobInfo, windows)
    doc.save(`Fettig-Estimate-${jobInfo.customerName.replace(/\s+/g, '-') || 'Draft'}-${Date.now()}.pdf`)
  }

  const handleSubmitToJobTread = async () => {
    setSubmitting(true)
    try {
      // Generate PDF as binary blob
      const doc = generatePDF(jobInfo, windows)
      const pdfBlob = doc.output('blob')
      const pdfSize = pdfBlob.size

      // Step 1: Get signed upload URL from server
      const urlRes = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getUploadUrl', size: pdfSize })
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error || 'Failed to get upload URL')

      // Step 2: Upload PDF directly to GCS from browser
      const gcsRes = await fetch(urlData.uploadUrl, {
        method: urlData.method || 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'x-goog-content-length-range': '0,' + urlData.size
        },
        body: pdfBlob
      })
      if (!gcsRes.ok) {
        const errText = await gcsRes.text()
        throw new Error('GCS upload failed: ' + gcsRes.status + ' ' + errText.slice(0, 200))
      }

      // Step 3: Finalize — attach file to job and post comment
      const finalRes = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', jobId: jobInfo.jobId, jobInfo, windows, uploadRequestId: urlData.uploadRequestId })
      })
      const finalData = await finalRes.json()
      if (!finalRes.ok) throw new Error(finalData.error || 'Failed to finalize')

      setSubmitted(true)
    } catch (err) {
      alert('JobTread error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const jobValid = jobInfo.customerName.trim().length > 0

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px 0' }}>

      {/* Header */}
      <div style={{ background: 'var(--navy-light)', borderBottom: '3px solid var(--gold)', padding: '18px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, letterSpacing: '0.06em' }}>FETTIG MILLWORK & WINDOWS</div>
        <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 600 }}>WINDOW ESTIMATOR</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[['job', '1', 'Job Info'], ['windows', '2', 'Windows'], ['review', '3', 'Review & Submit']].map(([s, n, label]) => (
            <button key={s} className={step === s ? 'btn-gold' : 'btn-outline'}
              onClick={() => { if (s === 'windows' && !jobValid) return; setStep(s) }}
              style={{ flex: 1, fontSize: 12, padding: '7px 8px', opacity: (s === 'windows' && !jobValid) ? 0.4 : 1 }}>
              {n}. {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Step 1: Job Info */}
        {step === 'job' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Job Information</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Search for a customer to pull their jobs from JobTread.</div>
            </div>

            <Field label="Search Customer">
              <CustomerJobSearch onSelect={handleJobSelect} />
            </Field>

            {/* Show selected job */}
            {jobInfo.customerName && (
              <div style={{ background: 'rgba(200,151,58,0.1)', border: '1.5px solid var(--gold)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>SELECTED JOB</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{jobInfo.customerName}</div>
                {jobInfo.jobName && <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 3 }}>📋 {jobInfo.jobName}</div>}
                {jobInfo.address && <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 2 }}>📍 {jobInfo.address}</div>}
                <button className="btn-outline" style={{ marginTop: 10, padding: '5px 12px', fontSize: 12 }}
                  onClick={() => setJobInfo({ customerName: '', jobId: '', jobName: '', address: '', estimator: jobInfo.estimator, notes: jobInfo.notes })}>
                  ✕ Clear & search again
                </button>
              </div>
            )}

            <Field label="Estimator Name">
              <input placeholder="Your name" value={jobInfo.estimator} onChange={e => setJob('estimator', e.target.value)} />
            </Field>
            <Field label="General Job Notes">
              <textarea rows={3} placeholder="Any general notes about this job..." value={jobInfo.notes} onChange={e => setJob('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </Field>

            <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14, marginTop: 4, opacity: jobValid ? 1 : 0.5 }}
              onClick={() => jobValid && setStep('windows')}>
              Next: Add Windows →
            </button>
          </div>
        )}

        {/* Step 2: Windows */}
        {step === 'windows' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Windows</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Add each window for <span style={{ color: 'var(--gold)' }}>{jobInfo.customerName}</span>.</div>
            </div>

            {windows.map((win, i) => (
              editIndex === i
                ? <WindowForm key={i} initial={win} onSave={saveWindow} onCancel={() => setEditIndex(null)} />
                : <WindowCard key={i} win={win} index={i}
                    onEdit={(idx) => { setEditIndex(idx); setShowForm(false) }}
                    onRemove={(idx) => setWindows(ws => ws.filter((_, j) => j !== idx))} />
            ))}

            {showForm && editIndex === null
              ? <WindowForm onSave={saveWindow} onCancel={() => setShowForm(false)} />
              : editIndex === null && (
                <button className="btn-outline" style={{ width: '100%', padding: 14, fontSize: 15, borderStyle: 'dashed', marginBottom: 16 }}
                  onClick={() => setShowForm(true)}>+ Add Window</button>
              )
            }

            {windows.length > 0 && (
              <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14, marginTop: 8 }}
                onClick={() => setStep('review')}>
                Review Estimate ({windows.length} window{windows.length !== 1 ? 's' : ''}) →
              </button>
            )}
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 'review' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Review & Submit</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Review everything, then send straight to JobTread.</div>
            </div>

            <div style={{ background: 'var(--navy-light)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: 10 }}>ESTIMATE SUMMARY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div><span style={{ color: 'var(--gray)' }}>Customer:</span> <span style={{ fontWeight: 600 }}>{jobInfo.customerName}</span></div>
                {jobInfo.jobName && <div><span style={{ color: 'var(--gray)' }}>Job:</span> {jobInfo.jobName}</div>}
                {jobInfo.address && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--gray)' }}>Address:</span> {jobInfo.address}</div>}
                {jobInfo.estimator && <div><span style={{ color: 'var(--gray)' }}>Estimator:</span> {jobInfo.estimator}</div>}
                <div><span style={{ color: 'var(--gray)' }}>Line Items:</span> <strong>{windows.length}</strong></div>
                <div><span style={{ color: 'var(--gray)' }}>Total Units:</span> <strong>{windows.reduce((s, w) => s + parseInt(w.qty || 1), 0)}</strong></div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              {windows.map((win, i) => (
                <WindowCard key={i} win={win} index={i}
                  onEdit={(idx) => { setStep('windows'); setTimeout(() => setEditIndex(idx), 50) }}
                  onRemove={(idx) => setWindows(ws => ws.filter((_, j) => j !== idx))} />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn-outline" style={{ width: '100%', fontSize: 16, padding: 14 }} onClick={handleDownloadPDF}>
                📄 Download PDF
              </button>

              {!submitted ? (
                <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14 }}
                  onClick={handleSubmitToJobTread} disabled={submitting}>
                  {submitting ? '⏳ Posting to JobTread...' : `🔗 Post Estimate to ${jobInfo.jobName || 'JobTread Job'}`}
                </button>
              ) : (
                <div style={{ background: 'rgba(39,174,96,0.15)', border: '1.5px solid var(--green)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>Sent to JobTread!</div>
                  <div style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>The estimate has been posted as a comment on <strong>{jobInfo.jobName}</strong> in JobTread.</div>
                </div>
              )}

              <button className="btn-outline" style={{ width: '100%', fontSize: 14, padding: 12 }}
                onClick={() => { setStep('job'); setJobInfo({ customerName: '', jobId: '', jobName: '', address: '', estimator: '', notes: '' }); setWindows([]); setSubmitted(false) }}>
                Start New Estimate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
