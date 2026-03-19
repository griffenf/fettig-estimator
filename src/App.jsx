import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'

// ─── Window Data ──────────────────────────────────────────────────────────────

const EXT_COLORS = ['Stone White', 'Pebble Gray', 'Sierra', 'Bronze', 'Cashmere', 'Bahama Brown', 'Ebony']

const getIntColors = (ext) => {
  if (ext === 'Ebony') return ['Stone White', 'EverWood Pine', 'Ebony']
  if (ext === 'Bronze') return ['Stone White', 'EverWood Pine', 'Sierra', 'Bronze']
  return ['Stone White', 'EverWood Pine', 'Sierra']
}

const GLASS_SURFACES = {
  Double: ['Clear', 'Low E1', 'Low E2', 'Low E3', 'Low E2/ERS', 'Low E3/ERS'],
  Triple: ['Low E2/E1', 'Low E3/E1', 'Low E2/E1/ERS', 'Low E3/E1/ERS'],
}
const DECORATIVE_GLASSES = {
  Double: ['None', 'Obscure', 'Glue Chip', 'Rain', 'Reed', 'Narrow Reed', 'Frost'],
  Triple: ['None', 'Obscure'],
}
const STD_PATTERNS   = ['Rectangular', 'Prairie', 'Checkrail', 'Cottage', 'Oriel']
const ROUND_PATTERNS = ['Sunburst', 'Rectangular']
const RECT_PATTERNS  = ['Rectangular']
const HARDWARE_COLORS = ['Satin Taupe', 'Sierra', 'White', 'Matte Black', 'Oil Rubbed Bronze', 'Satin Nickel', 'Brushed Chrome', 'Antique Brass', 'Brass']
const SCREEN_COLORS  = ['Stone White', 'EverWood Pine', 'Satin Taupe', 'Sierra', 'Bronze', 'Ebony']
const SCREEN_MESHES  = ['Bright View Mesh', 'Charcoal Hi-Transparency Fiberglass Mesh']

// mt: 1=RO only 2=Frame/RO  m: w h s(shortSide) wo(widthOrHeight)
// pt: panel type  hw/sc/sm: hardware/screenColor/screenMesh
// facing sash bay sunburst: extra feature flags
const WIN = {
  'Casement':               { wide:[1,2,3,4], mt:2, m:['w','h'],     pt:'cas', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:1,sm:1 },
  'Picture':                { wide:[1,2,3,4], mt:2, m:['w','h'],     pt:'pic', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:0,sc:0,sm:0 },
  'Awning':                 { wide:[1,2,3,4], mt:2, m:['w','h'],     pt:'awn', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:1,sm:1 },
  'Double Hung':            { wide:[1,2,3,4], mt:2, m:['w','h'],     pt:'dh',  g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:0,sm:1 },
  'Single Hung':            { wide:[1,2,3,4], mt:2, m:['w','h'],     pt:'sh',  g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:0,sm:1 },
  'Slider':                 { wide:[1],       mt:2, m:['w','h'],     pt:'sld', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:0,sm:1 },
  'Slider Triple Sash':     { wide:[1],       mt:2, m:['w','h'],     pt:'slt', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:0,sm:1, sash:1 },
  'Bow':                    { wide:[4,5,6],   mt:1, m:['w','h'],     pt:'bow', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:1,sm:1 },
  'Casement Bay':           { wide:[3],       mt:1, m:['w','h'],     pt:'cby', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:1,sm:1, bay:1 },
  'Double Hung Bay':        { wide:[3],       mt:1, m:['w','h'],     pt:'dhb', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:1,sc:0,sm:1, bay:1 },
  'Rectangle':              { wide:[1,2,3,4], mt:2, m:['w','h'],     pt:'pic', g:['GBG','SDL'], gp:STD_PATTERNS,   hw:0,sc:0,sm:0 },
  'Right Triangle':         { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG'],       gp:RECT_PATTERNS,  hw:0,sc:0,sm:0, facing:1 },
  'Isosceles Triangle':     { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG'],       gp:RECT_PATTERNS,  hw:0,sc:0,sm:0 },
  'Trapezoid':              { wide:[1],       mt:2, m:['w','h','s'], pt:'none',g:['GBG'],       gp:RECT_PATTERNS,  hw:0,sc:0,sm:0, facing:1 },
  'Pentagon':               { wide:[1],       mt:2, m:['w','h','s'], pt:'none',g:['GBG'],       gp:RECT_PATTERNS,  hw:0,sc:0,sm:0 },
  'Hexagon':                { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG'],       gp:RECT_PATTERNS,  hw:0,sc:0,sm:0 },
  'Octagon':                { wide:[1],       mt:2, m:['w'],         pt:'none',g:['GBG'],       gp:RECT_PATTERNS,  hw:0,sc:0,sm:0 },
  'Half Circle':            { wide:[1],       mt:2, m:['w'],         pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0 },
  'Extended Half Round':    { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0, sunburst:1 },
  'Eyebrow':                { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0 },
  'Extended Eyebrow':       { wide:[1],       mt:2, m:['w','h','s'], pt:'none',g:['GBG','SDL'], gp:RECT_PATTERNS,  hw:0,sc:0,sm:0 },
  'Quarter Round':          { wide:[1],       mt:2, m:['w'],         pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0, facing:1 },
  'Extended Quarter Round': { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0, facing:1 },
  'Quarter Eyebrow':        { wide:[1],       mt:2, m:['w','h'],     pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0, facing:1 },
  'Extended Quarter Eyebrow':{ wide:[1],      mt:2, m:['w','h','s'], pt:'none',g:['GBG','SDL'], gp:RECT_PATTERNS,  hw:0,sc:0,sm:0, facing:1 },
  'Full Circle':            { wide:[1],       mt:2, m:['wo'],        pt:'none',g:['GBG','SDL'], gp:ROUND_PATTERNS, hw:0,sc:0,sm:0 },
}

const WINDOW_STYLE_GROUPS = [
  { label: 'Standard', styles: ['Casement','Picture','Awning','Double Hung','Single Hung','Slider','Slider Triple Sash','Bow','Casement Bay','Double Hung Bay'] },
  { label: 'Special Shape', styles: ['Rectangle','Right Triangle','Isosceles Triangle','Trapezoid','Pentagon','Hexagon','Octagon'] },
  { label: 'Round Top', styles: ['Half Circle','Extended Half Round','Eyebrow','Extended Eyebrow','Quarter Round','Extended Quarter Round','Quarter Eyebrow','Extended Quarter Eyebrow','Full Circle'] },
]

function getPanelConfig(pt, wide) {
  if (!pt || pt === 'none' || pt === 'pic') return null
  if (pt === 'cas' || pt === 'cby') {
    if (wide === 1) return { type: 'single', options: ['Left', 'Right'] }
    const stds = { 2: 'Left | Right', 3: 'Left | Stationary | Right', 4: 'Left | Stationary | Stationary | Right' }
    return { type: 'multi', standard: stds[wide] || '', panelOptions: ['Left', 'Right', 'Fixed'], panels: wide }
  }
  if (pt === 'bow') {
    if (wide < 4) return null
    const mid = Array(wide - 2).fill('Stationary').join(' | ')
    return { type: 'multi', standard: `Left | ${mid} | Right`, panelOptions: ['Left', 'Right', 'Fixed'], panels: wide }
  }
  if (pt === 'awn') {
    if (wide === 1) return { type: 'single', options: ['Awning', 'Awning Picture'] }
    return { type: 'multi', standard: Array(wide).fill('Awning').join(' | '), panelOptions: ['Awning', 'Awning Picture'], panels: wide }
  }
  if (pt === 'dh') {
    if (wide === 1) return null
    return { type: 'multi', standard: Array(wide).fill('DH').join(' | '), panelOptions: ['Double Hung', 'Double Hung Picture'], panels: wide }
  }
  if (pt === 'sh') {
    if (wide === 1) return null
    return { type: 'multi', standard: Array(wide).fill('SH').join(' | '), panelOptions: ['Single Hung', 'Single Hung Picture'], panels: wide }
  }
  if (pt === 'sld') return { type: 'single', options: ['XO', 'OX'] }
  if (pt === 'slt') return { type: 'fixed', value: 'XOX' }
  if (pt === 'dhb') return { type: 'multi', standardOptions: ['DH | DH | DH', 'DH | Picture | DH'], panelOptions: ['Double Hung', 'Fixed'], panels: 3 }
  return null
}

function summarizeWindow(w) {
  const parts = []
  if (w.numberWide > 1) parts.push(`${w.numberWide} Wide`)
  if (w.facing) parts.push(w.facing)
  if (w.configuration) parts.push(w.configuration)
  if (w.measurementType) parts.push(w.measurementType)
  if (w.width && !w.widthOrHeight) parts.push(`W: ${w.width}"`)
  if (w.height) parts.push(`H: ${w.height}"`)
  if (w.widthOrHeight) parts.push(`${w.widthOrHeight}"`)
  if (w.shortSideHeight) parts.push(`SSH: ${w.shortSideHeight}"`)
  if (w.exteriorColor) parts.push(`Ext: ${w.exteriorColor}`)
  if (w.interiorColor) parts.push(`Int: ${w.interiorColor}`)
  if (w.pane) parts.push(w.pane + ' Pane')
  if (w.glassSurface) parts.push(w.glassSurface)
  if (w.tempered === 'Yes') parts.push('Tempered')
  if (w.decorativeGlass && w.decorativeGlass !== 'None') parts.push(w.decorativeGlass)
  if (w.grilleType) parts.push(w.grilleType)
  if (w.grillePattern) parts.push(w.grillePattern)
  if (w.simulatedRail) parts.push(`Sim Rail: ${w.simulatedRail}`)
  if (w.hardwareColor) parts.push(`HW: ${w.hardwareColor}`)
  if (w.screenColor) parts.push(`Screen: ${w.screenColor}`)
  if (w.screenMesh) parts.push(w.screenMesh)
  return parts.join(' · ')
}

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

  const fields = [['Customer', jobInfo.customerName], ['Job Name', jobInfo.jobName], ['Job Address', jobInfo.address], ['Estimator', jobInfo.estimator]].filter(([, v]) => v)
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

  windows.forEach((win, i) => {
    if (y > 700) { doc.addPage(); y = 60 }
    const bg = i % 2 === 0 ? [245, 243, 239] : [235, 232, 226]
    const summary = summarizeWindow(win)
    const lines = doc.splitTextToSize(summary, W - margin * 2 - 60)
    const rowH = Math.max(28, lines.length * 13 + 16)
    doc.setFillColor(...bg); doc.rect(margin, y - 10, W - margin * 2, rowH, 'F')
    doc.setFillColor(200, 151, 58); doc.rect(margin, y - 10, 28, rowH, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(26, 35, 50)
    doc.text(String(i + 1), margin + 14, y + (rowH / 2) - 16, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(26, 35, 50)
    doc.text(`${win.style}${win.qty > 1 ? ` × ${win.qty}` : ''}`, margin + 36, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 90, 110)
    lines.forEach((line, li) => doc.text(line, margin + 36, y + 13 + li * 12))
    if (win.notes) {
      const noteLines = doc.splitTextToSize(`Note: ${win.notes}`, W - margin * 2 - 60)
      doc.setFontSize(8); doc.setTextColor(138, 154, 176)
      noteLines.forEach((line, li) => doc.text(line, margin + 36, y + 13 + lines.length * 12 + li * 11))
    }
    y += rowH + 4
  })

  y += 8
  doc.setFillColor(26, 35, 50); doc.rect(margin, y - 10, W - margin * 2, 22, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(200, 151, 58)
  const totalQty = windows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)
  doc.text(`TOTAL: ${windows.length} line item(s)  |  ${totalQty} unit(s)`, margin + 8, y + 5)

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

// ─── Customer Search ──────────────────────────────────────────────────────────

function CustomerJobSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

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
      } catch (err) { setError(err.message) } finally { setLoading(false) }
    }, 350)
  }, [query])

  const handleSelectJob = (customer, job) => {
    onSelect({ customerName: customer.name, jobId: job.id, jobName: job.name, address: [job.address?.street, job.address?.city, job.address?.state].filter(Boolean).join(', ') })
    setQuery(''); setResults([])
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input placeholder="Start typing a customer name..." value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" />
        {loading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)', fontSize: 12 }}>Searching...</div>}
      </div>
      {error && <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, fontSize: 13, color: '#e74c3c' }}>⚠️ {error}</div>}
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--navy-mid)', border: '1.5px solid var(--gold)', borderRadius: 8, marginTop: 4, maxHeight: 340, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {results.map(customer => (
            <div key={customer.id}>
              <div onClick={() => setExpanded(expanded === customer.id ? null : customer.id)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(200,151,58,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{customer.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{customer.jobs?.nodes?.length || 0} job{customer.jobs?.nodes?.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ color: 'var(--gold)', fontSize: 12 }}>{expanded === customer.id ? '▲' : '▼'}</div>
              </div>
              {expanded === customer.id && customer.jobs?.nodes?.map(job => (
                <div key={job.id} onClick={() => handleSelectJob(customer, job)} style={{ padding: '10px 14px 10px 28px', cursor: 'pointer', borderBottom: '1px solid rgba(200,151,58,0.08)', background: 'rgba(200,151,58,0.05)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,151,58,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,151,58,0.05)'}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{job.name || `Job #${job.id}`}</div>
                  {job.address?.street && <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>📍 {[job.address.street, job.address.city, job.address.state].filter(Boolean).join(', ')}</div>}
                  {job.status && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{job.status}</div>}
                </div>
              ))}
              {expanded === customer.id && !customer.jobs?.nodes?.length && <div style={{ padding: '10px 28px', fontSize: 13, color: 'var(--gray)', fontStyle: 'italic' }}>No jobs found.</div>}
            </div>
          ))}
        </div>
      )}
      {query.length >= 2 && !loading && results.length === 0 && !error && <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--navy-mid)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--gray)' }}>No customers found matching "{query}"</div>}
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, children, col }) {
  return (
    <div style={{ marginBottom: 12, gridColumn: col }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function SectionHeader({ children }) {
  return <div style={{ gridColumn: '1/-1', fontFamily: 'var(--font-head)', fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(200,151,58,0.3)', paddingBottom: 6, marginTop: 8, marginBottom: 4 }}>{children}</div>
}

// ─── Window Card ──────────────────────────────────────────────────────────────

function WindowCard({ win, index, onEdit, onRemove }) {
  const summary = summarizeWindow(win)
  return (
    <div style={{ background: 'var(--navy-light)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12 }}>#{index + 1}</span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>{win.style}</span>
            {win.qty > 1 && <span style={{ color: 'var(--gray)', fontSize: 13 }}>× {win.qty}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6 }}>{summary}</div>
          {win.notes && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--gray)', fontStyle: 'italic' }}>"{win.notes}"</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn-outline" onClick={() => onEdit(index)} style={{ padding: '6px 12px', fontSize: 13 }}>Edit</button>
          <button className="btn-danger" onClick={() => onRemove(index)}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ─── Window Form ──────────────────────────────────────────────────────────────

const EMPTY = {
  style: '', numberWide: 1, facing: '', sashSplit: '',
  measurementType: '', configType: 'standard', standardConfig: '', panelConfigs: [],
  width: '', height: '', shortSideHeight: '', widthOrHeight: '',
  exteriorColor: '', interiorColor: '', pane: 'Double',
  glassSurface: '', tempered: 'No', decorativeGlass: 'None',
  grilleType: '', grillePattern: '', simulatedRail: '',
  hardwareColor: '', screenColor: '', screenMesh: '',
  qty: '1', notes: ''
}

function WindowForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? { ...EMPTY, ...initial } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const cfg = WIN[form.style]
  const panelCfg = cfg ? getPanelConfig(cfg.pt, form.numberWide) : null
  const intColors = getIntColors(form.exteriorColor)
  const glassSurfaces = GLASS_SURFACES[form.pane] || []
  const decorGlasses = DECORATIVE_GLASSES[form.pane] || []
  const grillePatterns = cfg?.gp || []

  // Reset fields when style changes
  useEffect(() => {
    if (!form.style || !WIN[form.style]) return
    const c = WIN[form.style]
    setForm(f => ({
      ...f,
      numberWide: c.wide[0],
      measurementType: c.mt === 1 ? 'Rough Opening' : 'Frame Size',
      configType: 'standard', standardConfig: '',
      panelConfigs: Array(c.wide[0]).fill(''),
      facing: '', sashSplit: '',
      grilleType: c.g[0] || '', grillePattern: '', simulatedRail: '',
    }))
  }, [form.style])

  // Reset panel configs when numberWide changes
  useEffect(() => {
    setForm(f => ({ ...f, panelConfigs: Array(f.numberWide).fill(''), standardConfig: '' }))
  }, [form.numberWide])

  // Reset glass/decorative when pane changes
  useEffect(() => {
    setForm(f => ({ ...f, glassSurface: '', decorativeGlass: 'None' }))
  }, [form.pane])

  // Reset pattern/rail when grilleType changes
  useEffect(() => {
    setForm(f => ({ ...f, grillePattern: '', simulatedRail: '' }))
  }, [form.grilleType])

  // Reset interiorColor if not valid for new exterior
  useEffect(() => {
    if (form.interiorColor && !getIntColors(form.exteriorColor).includes(form.interiorColor)) {
      set('interiorColor', '')
    }
  }, [form.exteriorColor])

  const handleSave = () => {
    const w = { ...form }
    // Build configuration string
    if (panelCfg) {
      if (panelCfg.type === 'fixed') w.configuration = panelCfg.value
      else if (panelCfg.type === 'single') w.configuration = form.standardConfig
      else if (panelCfg.type === 'multi') {
        if (form.configType === 'standard') w.configuration = form.standardConfig || panelCfg.standard || (panelCfg.standardOptions?.[0])
        else w.configuration = form.panelConfigs.join(' | ')
      }
    }
    onSave(w)
  }

  const valid = form.style && form.qty

  return (
    <div style={{ background: 'var(--navy-mid)', border: '2px solid var(--gold)', borderRadius: 10, padding: '20px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>Window Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

        {/* Style */}
        <Field label="Window Style *" col="1/-1">
          <select value={form.style} onChange={e => set('style', e.target.value)}>
            <option value="">Select style...</option>
            {WINDOW_STYLE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.styles.map(s => <option key={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        {cfg && <>
          {/* Number Wide */}
          {cfg.wide.length > 1 && (
            <Field label="Number Wide">
              <select value={form.numberWide} onChange={e => set('numberWide', parseInt(e.target.value))}>
                {cfg.wide.map(n => <option key={n} value={n}>{n} Wide</option>)}
              </select>
            </Field>
          )}

          {/* Facing */}
          {cfg.facing && (
            <Field label="Facing">
              <select value={form.facing} onChange={e => set('facing', e.target.value)}>
                <option value="">Select...</option>
                <option>Left</option>
                <option>Right</option>
              </select>
            </Field>
          )}

          {/* Sash Split */}
          {cfg.sash && (
            <Field label="Sash Split" col="1/-1">
              <select value={form.sashSplit} onChange={e => set('sashSplit', e.target.value)}>
                <option value="">Select...</option>
                <option>1/4 - 1/2 - 1/4</option>
                <option>1/3 - 1/3 - 1/3</option>
              </select>
            </Field>
          )}

          {/* Configuration */}
          {panelCfg && (
            <>
              <SectionHeader>Configuration</SectionHeader>
              {panelCfg.type === 'fixed' && (
                <Field label="Configuration" col="1/-1">
                  <input value={panelCfg.value} disabled style={{ opacity: 0.6 }} />
                </Field>
              )}
              {panelCfg.type === 'single' && (
                <Field label="Configuration" col="1/-1">
                  <select value={form.standardConfig} onChange={e => set('standardConfig', e.target.value)}>
                    <option value="">Select...</option>
                    {panelCfg.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              )}
              {panelCfg.type === 'multi' && (
                <>
                  <Field label="Configuration Type" col="1/-1">
                    <select value={form.configType} onChange={e => set('configType', e.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="custom">Custom</option>
                    </select>
                  </Field>
                  {form.configType === 'standard' && (
                    <Field label="Standard Configuration" col="1/-1">
                      {panelCfg.standardOptions ? (
                        <select value={form.standardConfig} onChange={e => set('standardConfig', e.target.value)}>
                          <option value="">Select...</option>
                          {panelCfg.standardOptions.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input value={panelCfg.standard} disabled style={{ opacity: 0.6 }} />
                      )}
                    </Field>
                  )}
                  {form.configType === 'custom' && (
                    <Field label="Custom Panel Configuration" col="1/-1">
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${panelCfg.panels}, 1fr)`, gap: 8 }}>
                        {Array.from({ length: panelCfg.panels }).map((_, i) => (
                          <select key={i} value={form.panelConfigs[i] || ''} onChange={e => {
                            const pc = [...form.panelConfigs]; pc[i] = e.target.value; set('panelConfigs', pc)
                          }}>
                            <option value="">Panel {i + 1}</option>
                            {panelCfg.panelOptions.map(o => <option key={o}>{o}</option>)}
                          </select>
                        ))}
                      </div>
                    </Field>
                  )}
                </>
              )}
            </>
          )}

          {/* Measurements */}
          <SectionHeader>Measurements</SectionHeader>
          {cfg.mt === 2 && (
            <Field label="Measurement Type" col="1/-1">
              <select value={form.measurementType} onChange={e => set('measurementType', e.target.value)}>
                <option>Frame Size</option>
                <option>Rough Opening</option>
              </select>
            </Field>
          )}
          {cfg.m.includes('w') && <Field label='Width (inches)'><input type="number" step="0.125" placeholder='e.g. 36' value={form.width} onChange={e => set('width', e.target.value)} /></Field>}
          {cfg.m.includes('h') && <Field label='Height (inches)'><input type="number" step="0.125" placeholder='e.g. 48' value={form.height} onChange={e => set('height', e.target.value)} /></Field>}
          {cfg.m.includes('s') && <Field label='Short Side Height (inches)' col="1/-1"><input type="number" step="0.125" placeholder='e.g. 24' value={form.shortSideHeight} onChange={e => set('shortSideHeight', e.target.value)} /></Field>}
          {cfg.m.includes('wo') && <Field label='Width or Height (inches)' col="1/-1"><input type="number" step="0.125" placeholder='e.g. 36' value={form.widthOrHeight} onChange={e => set('widthOrHeight', e.target.value)} /></Field>}

          {/* Bay Fields */}
          {cfg.bay && <>
            <Field label="Angle of Deflection">
              <select value={form.angleOfDeflection || ''} onChange={e => set('angleOfDeflection', e.target.value)}>
                <option value="">Select...</option>
                <option>30°</option>
                <option>45°</option>
              </select>
            </Field>
            <Field label="Flanker to Center Ratio">
              <select value={form.flankerRatio || ''} onChange={e => set('flankerRatio', e.target.value)}>
                <option value="">Select...</option>
                <option>1:2:1</option>
                <option>1:1:1</option>
              </select>
            </Field>
          </>}

          {/* Glass & Color */}
          <SectionHeader>Color & Glass</SectionHeader>
          <Field label="Exterior Color">
            <select value={form.exteriorColor} onChange={e => set('exteriorColor', e.target.value)}>
              <option value="">Select...</option>
              {EXT_COLORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Interior Color">
            <select value={form.interiorColor} onChange={e => set('interiorColor', e.target.value)}>
              <option value="">Select...</option>
              {intColors.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Pane">
            <select value={form.pane} onChange={e => set('pane', e.target.value)}>
              <option>Double</option>
              <option>Triple</option>
            </select>
          </Field>
          <Field label="Glass Surface">
            <select value={form.glassSurface} onChange={e => set('glassSurface', e.target.value)}>
              <option value="">Select...</option>
              {glassSurfaces.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Tempered">
            <select value={form.tempered} onChange={e => set('tempered', e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </Field>
          <Field label="Decorative Glass">
            <select value={form.decorativeGlass} onChange={e => set('decorativeGlass', e.target.value)}>
              {decorGlasses.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>

          {/* Grille */}
          <SectionHeader>Grille</SectionHeader>
          {cfg.g.length > 1 ? (
            <Field label="Grille Type">
              <select value={form.grilleType} onChange={e => set('grilleType', e.target.value)}>
                <option value="">None</option>
                {cfg.g.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Grille Type">
              <input value={cfg.g[0]} disabled style={{ opacity: 0.6 }} />
            </Field>
          )}
          {form.grilleType && (
            <Field label="Grille Pattern">
              <select value={form.grillePattern} onChange={e => set('grillePattern', e.target.value)}>
                <option value="">Select...</option>
                {grillePatterns.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          )}
          {form.grilleType === 'SDL' && (
            <Field label="Simulated Rail">
              <select value={form.simulatedRail} onChange={e => set('simulatedRail', e.target.value)}>
                <option value="">Select...</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </Field>
          )}
          {cfg.sunburst && form.grillePattern === 'Sunburst' && (
            <Field label="Below Sunburst" col="1/-1">
              <input value="Rectangular (required with Sunburst)" disabled style={{ opacity: 0.6 }} />
            </Field>
          )}

          {/* Hardware & Screen */}
          {(cfg.hw || cfg.sc || cfg.sm) && <SectionHeader>Hardware & Screen</SectionHeader>}
          {cfg.hw && (
            <Field label="Hardware Color" col="1/-1">
              <select value={form.hardwareColor} onChange={e => set('hardwareColor', e.target.value)}>
                <option value="">Select...</option>
                {HARDWARE_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          )}
          {cfg.sc && (
            <Field label="Interior Screen Color">
              <select value={form.screenColor} onChange={e => set('screenColor', e.target.value)}>
                <option value="">Select...</option>
                {SCREEN_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          )}
          {cfg.sm && (
            <Field label="Screen Mesh Type" col={cfg.sc ? '' : '1/-1'}>
              <select value={form.screenMesh} onChange={e => set('screenMesh', e.target.value)}>
                <option value="">Select...</option>
                {SCREEN_MESHES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
          )}
        </>}

        {/* Qty & Notes */}
        <SectionHeader>Other</SectionHeader>
        <Field label="Quantity">
          <input type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
        </Field>
        <div />
        <Field label="Notes / Special Instructions" col="1/-1">
          <textarea rows={2} placeholder="Any special notes..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn-gold" onClick={() => valid && handleSave()} style={{ flex: 1, opacity: valid ? 1 : 0.5 }}>Save Window</button>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState('job')
  const [jobInfo, setJobInfo] = useState({ customerName: '', jobId: '', jobName: '', address: '', estimator: '', notes: '' })
  const [windows, setWindows] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const setJob = (k, v) => setJobInfo(f => ({ ...f, [k]: v }))

  const handleJobSelect = (selected) => setJobInfo(f => ({ ...f, customerName: selected.customerName, jobId: selected.jobId, jobName: selected.jobName, address: selected.address }))

  const saveWindow = (win) => {
    if (editIndex !== null) { setWindows(ws => ws.map((w, i) => i === editIndex ? win : w)); setEditIndex(null) }
    else setWindows(ws => [...ws, win])
    setShowForm(false)
  }

  const handleDownloadPDF = () => {
    const doc = generatePDF(jobInfo, windows)
    doc.save(`Fettig-Estimate-${jobInfo.customerName.replace(/\s+/g, '-') || 'Draft'}-${Date.now()}.pdf`)
  }

  const handleSubmitToJobTread = async () => {
    setSubmitting(true)
    try {
      const doc = generatePDF(jobInfo, windows)
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: jobInfo.jobId, jobInfo, windows, pdfBase64 }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      setSubmitted(true)
    } catch (err) { alert('JobTread error: ' + err.message) } finally { setSubmitting(false) }
  }

  const jobValid = jobInfo.customerName.trim().length > 0

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px 0' }}>
      <div style={{ background: 'var(--navy-light)', borderBottom: '3px solid var(--gold)', padding: '18px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, letterSpacing: '0.06em' }}>FETTIG MILLWORK & WINDOWS</div>
        <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 600 }}>WINDOW ESTIMATOR</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[['job', '1', 'Job Info'], ['windows', '2', 'Windows'], ['review', '3', 'Review & Submit']].map(([s, n, label]) => (
            <button key={s} className={step === s ? 'btn-gold' : 'btn-outline'} onClick={() => { if (s === 'windows' && !jobValid) return; setStep(s) }} style={{ flex: 1, fontSize: 12, padding: '7px 8px', opacity: (s === 'windows' && !jobValid) ? 0.4 : 1 }}>{n}. {label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {step === 'job' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Job Information</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Search for a customer to pull their jobs from JobTread.</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Search Customer</label>
              <CustomerJobSearch onSelect={handleJobSelect} />
            </div>
            {jobInfo.customerName && (
              <div style={{ background: 'rgba(200,151,58,0.1)', border: '1.5px solid var(--gold)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>SELECTED JOB</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{jobInfo.customerName}</div>
                {jobInfo.jobName && <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 3 }}>📋 {jobInfo.jobName}</div>}
                {jobInfo.address && <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 2 }}>📍 {jobInfo.address}</div>}
                <button className="btn-outline" style={{ marginTop: 10, padding: '5px 12px', fontSize: 12 }} onClick={() => setJobInfo({ customerName: '', jobId: '', jobName: '', address: '', estimator: jobInfo.estimator, notes: jobInfo.notes })}>✕ Clear & search again</button>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Estimator Name</label>
              <input placeholder="Your name" value={jobInfo.estimator} onChange={e => setJob('estimator', e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>General Job Notes</label>
              <textarea rows={3} placeholder="Any general notes about this job..." value={jobInfo.notes} onChange={e => setJob('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14, marginTop: 4, opacity: jobValid ? 1 : 0.5 }} onClick={() => jobValid && setStep('windows')}>Next: Add Windows →</button>
          </div>
        )}

        {step === 'windows' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Windows</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Add each window for <span style={{ color: 'var(--gold)' }}>{jobInfo.customerName}</span>.</div>
            </div>
            {windows.map((win, i) => (
              editIndex === i
                ? <WindowForm key={i} initial={win} onSave={saveWindow} onCancel={() => setEditIndex(null)} />
                : <WindowCard key={i} win={win} index={i} onEdit={(idx) => { setEditIndex(idx); setShowForm(false) }} onRemove={(idx) => setWindows(ws => ws.filter((_, j) => j !== idx))} />
            ))}
            {showForm && editIndex === null
              ? <WindowForm onSave={saveWindow} onCancel={() => setShowForm(false)} />
              : editIndex === null && <button className="btn-outline" style={{ width: '100%', padding: 14, fontSize: 15, borderStyle: 'dashed', marginBottom: 16 }} onClick={() => setShowForm(true)}>+ Add Window</button>
            }
            {windows.length > 0 && (
              <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14, marginTop: 8 }} onClick={() => setStep('review')}>Review Estimate ({windows.length} window{windows.length !== 1 ? 's' : ''}) →</button>
            )}
          </div>
        )}

        {step === 'review' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Review & Submit</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Review everything, then send straight to JobTread.</div>
            </div>
            <div style={{ background: 'var(--navy-light)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: 10 }}>ESTIMATE SUMMARY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div><span style={{ color: 'var(--gray)' }}>Customer:</span> <strong>{jobInfo.customerName}</strong></div>
                {jobInfo.jobName && <div><span style={{ color: 'var(--gray)' }}>Job:</span> {jobInfo.jobName}</div>}
                {jobInfo.address && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--gray)' }}>Address:</span> {jobInfo.address}</div>}
                {jobInfo.estimator && <div><span style={{ color: 'var(--gray)' }}>Estimator:</span> {jobInfo.estimator}</div>}
                <div><span style={{ color: 'var(--gray)' }}>Line Items:</span> <strong>{windows.length}</strong></div>
                <div><span style={{ color: 'var(--gray)' }}>Total Units:</span> <strong>{windows.reduce((s, w) => s + parseInt(w.qty || 1), 0)}</strong></div>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              {windows.map((win, i) => <WindowCard key={i} win={win} index={i} onEdit={(idx) => { setStep('windows'); setTimeout(() => setEditIndex(idx), 50) }} onRemove={(idx) => setWindows(ws => ws.filter((_, j) => j !== idx))} />)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn-outline" style={{ width: '100%', fontSize: 16, padding: 14 }} onClick={handleDownloadPDF}>📄 Download PDF</button>
              {!submitted ? (
                <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14 }} onClick={handleSubmitToJobTread} disabled={submitting}>
                  {submitting ? '⏳ Posting to JobTread...' : `🔗 Post Estimate to ${jobInfo.jobName || 'JobTread Job'}`}
                </button>
              ) : (
                <div style={{ background: 'rgba(39,174,96,0.15)', border: '1.5px solid var(--green)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>Sent to JobTread!</div>
                  <div style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Estimate Notes.pdf uploaded to <strong>{jobInfo.jobName}</strong>.</div>
                </div>
              )}
              <button className="btn-outline" style={{ width: '100%', fontSize: 14, padding: 12 }} onClick={() => { setStep('job'); setJobInfo({ customerName: '', jobId: '', jobName: '', address: '', estimator: '', notes: '' }); setWindows([]); setSubmitted(false) }}>Start New Estimate</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
