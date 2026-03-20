import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'

// ─── Window Data ──────────────────────────────────────────────────────────────

const EXT_COLORS = ['Stone White', 'Pebble Gray', 'Sierra', 'Bronze', 'Cashmere', 'Bahama Brown', 'Ebony']

const getIntColors = (ext) => {
  if (ext === 'Ebony') return ['Stone White', 'EverWood Pine', 'Ebony']
  if (ext === 'Bronze') return ['Stone White', 'EverWood Pine', 'Sierra', 'Bronze']
  return ['Stone White', 'EverWood Pine', 'Sierra']
}

const INT_TO_HW = { 'Stone White': 'White', 'EverWood Pine': 'Satin Taupe', 'Sierra': 'Sierra', 'Bronze': 'Oil Rubbed Bronze', 'Ebony': 'Matte Black' }
const INT_TO_SCREEN = { 'Stone White': 'Stone White', 'EverWood Pine': 'Satin Taupe', 'Sierra': 'Sierra', 'Bronze': 'Bronze', 'Ebony': 'Ebony' }

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
const ROUND_TOP_STYLES = ['Half Circle', 'Extended Half Round', 'Eyebrow', 'Extended Eyebrow', 'Quarter Round', 'Extended Quarter Round', 'Quarter Eyebrow', 'Extended Quarter Eyebrow']

const TWO_HIGH_WINDOWS = ['Casement', 'Picture', 'Double Hung', 'Single Hung', 'Awning']

function getTopWindowOptions(baseStyle) {
  const isCasAwnPic = ['Casement', 'Picture', 'Awning'].includes(baseStyle)
  if (isCasAwnPic) return ['Casement', 'Picture', 'Awning', ...ROUND_TOP_STYLES]
  return ['Picture', ...ROUND_TOP_STYLES] // DH / SH
}

function getTopWinMeasurements(style) {
  if (!style) return { m: [], facing: false }
  const facing = ['Quarter Round', 'Extended Quarter Round', 'Quarter Eyebrow', 'Extended Quarter Eyebrow'].includes(style)
  if (['Half Circle', 'Quarter Round'].includes(style)) return { m: ['w'], facing }
  if (['Extended Eyebrow', 'Extended Quarter Eyebrow'].includes(style)) return { m: ['w', 'h', 's'], facing }
  return { m: ['w', 'h'], facing }
}

const TWO_HIGH_STYLES = ['Casement', 'Picture', 'Awning', 'Double Hung', 'Single Hung']
const ROUND_TOP_WINDOW_STYLES = ['Half Circle', 'Extended Half Round', 'Eyebrow', 'Extended Eyebrow', 'Quarter Round', 'Extended Quarter Round', 'Quarter Eyebrow', 'Extended Quarter Eyebrow']
const CAS_PIC_AWN_TOPS = ['Casement', 'Picture', 'Awning', ...ROUND_TOP_WINDOW_STYLES]
const DH_SH_TOPS = ['Picture', ...ROUND_TOP_WINDOW_STYLES]

function getTopOptions(baseStyle) {
  if (['Double Hung', 'Single Hung'].includes(baseStyle)) return DH_SH_TOPS
  return CAS_PIC_AWN_TOPS
}

function canBe2Wide(baseWide) { return baseWide === 2 }
function mustBe1Wide(baseWide) { return baseWide >= 3 }

const JAMB_TYPES = ['Primed', 'Pine', 'Oak', 'Knotty Alder', 'Maple']
const CASING_STYLES = ['Ranch', 'Colonial', 'Other']

const FRACTIONS = ['', '1/16"', '1/8"', '3/16"', '1/4"', '5/16"', '3/8"', '7/16"', '1/2"', '9/16"', '5/8"', '11/16"', '3/4"', '13/16"', '7/8"', '15/16"']

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
    if (wide === 1) return null
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

function fmtMeasurement(val, frac) {
  if (!val) return ''
  return frac ? `${val} ${frac}` : `${val}"`
}

function summarizeWindow(w) {
  const parts = []
  if (w.numberWide > 1) parts.push(`${w.numberWide} Wide`)
  if (w.facing) parts.push(w.facing)
  if (w.sashSplit) parts.push(`Sash: ${w.sashSplit}`)
  if (w.configuration) parts.push(w.configuration)
  if (w.measurementType) parts.push(w.measurementType)
  if (w.width) parts.push(`W: ${fmtMeasurement(w.width, w.widthFrac)}`)
  if (w.height) parts.push(`H: ${fmtMeasurement(w.height, w.heightFrac)}`)
  if (w.widthOrHeight) parts.push(fmtMeasurement(w.widthOrHeight, w.widthOrHeightFrac))
  if (w.shortSideHeight) parts.push(`SSH: ${fmtMeasurement(w.shortSideHeight, w.shortSideHeightFrac)}`)
  if (w.angleOfDeflection) parts.push(`Angle: ${w.angleOfDeflection}`)
  if (w.flankerRatio) parts.push(`Flanker: ${w.flankerRatio}`)
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
  if (w.numberHigh === 2) {
    if (w.topWindowWidth === 2 && w.topLeftStyle) parts.push(`Top: ${w.topLeftStyle} | ${w.topRightStyle}`)
    else if (w.topStyle) parts.push(`Top: ${w.topStyle}`)
    if (w.topHeight) parts.push(`Top H: ${fmtMeasurement(w.topHeight, w.topHeightFrac)}`)
    if (w.topShortSideHeight) parts.push(`Top SSH: ${fmtMeasurement(w.topShortSideHeight, w.topShortSideHeightFrac)}`)
    if (w.overallHeight) parts.push(`Overall H: ${fmtMeasurement(w.overallHeight, w.overallHeightFrac)}`)
  }
  if (w.jambDepth) parts.push(`Jamb: ${fmtMeasurement(w.jambDepth, w.jambDepthFrac)}`)
  if (w.jambType) parts.push(w.jambType)
  if (w.casingWidth) parts.push(`Casing: ${fmtMeasurement(w.casingWidth, w.casingWidthFrac)}`)
  if (w.casingType) parts.push(w.casingType)
  if (w.casingStyle) parts.push(w.casingStyle)
  if (w.lpTrimColor) parts.push(`LP: ${w.lpTrimColor}`)
  if (w.numberHigh === 2 && w.topWindows?.length > 0) {
    const tops = w.topWindows.filter(t => t.style)
    if (tops.length > 0) {
      const topStr = tops.map((t, i) => {
        const parts2 = [t.style]
        if (t.facing) parts2.push(t.facing)
        if (t.width) parts2.push(`W:${fmtMeasurement(t.width, t.widthFrac)}`)
        if (t.height) parts2.push(`H:${fmtMeasurement(t.height, t.heightFrac)}`)
        return parts2.join(' ')
      }).join(' | ')
      parts.push(`Top: ${topStr}`)
    }
  }
  return parts.join(' · ')
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

function generatePDF(jobInfo, rooms) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  let y = 0

  const addFooter = () => {
    doc.setFillColor(26, 35, 50); doc.rect(0, pageH - 36, W, 36, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(138, 154, 176)
    doc.text('Fettig Millwork & Windows, Inc.  —  Window Estimate', margin, pageH - 14)
    doc.setTextColor(200, 151, 58); doc.text('CONFIDENTIAL', W - margin, pageH - 14, { align: 'right' })
  }

  // Header
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

  let winNum = 1
  rooms.forEach(room => {
    if (!room.windows.length) return
    if (y > pageH - 80) { addFooter(); doc.addPage(); y = 40 }

    // Room header
    if (room.name) {
      doc.setFillColor(40, 55, 78); doc.rect(margin, y - 10, W - margin * 2, 20, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(200, 151, 58)
      doc.text(`ROOM: ${room.name.toUpperCase()}`, margin + 8, y + 4); y += 18
    }

    room.windows.forEach((win) => {
      const summary = summarizeWindow(win)
      const lines = doc.splitTextToSize(summary, W - margin * 2 - 60)
      const rowH = Math.max(28, lines.length * 13 + 16)
      if (y + rowH > pageH - 60) { addFooter(); doc.addPage(); y = 40 }

      const bg = winNum % 2 === 0 ? [245, 243, 239] : [235, 232, 226]
      doc.setFillColor(...bg); doc.rect(margin, y - 10, W - margin * 2, rowH, 'F')
      doc.setFillColor(200, 151, 58); doc.rect(margin, y - 10, 28, rowH, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(26, 35, 50)
      doc.text(String(winNum), margin + 14, y + (rowH / 2) - 14, { align: 'center' })
      doc.setFontSize(11); doc.text(`${win.style}${parseInt(win.qty) > 1 ? ` × ${win.qty}` : ''}`, margin + 36, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 90, 110)
      lines.forEach((line, li) => doc.text(line, margin + 36, y + 13 + li * 12))
      if (win.notes) {
        doc.setFontSize(8); doc.setTextColor(138, 154, 176)
        doc.splitTextToSize(`Note: ${win.notes}`, W - margin * 2 - 60).forEach((line, li) => doc.text(line, margin + 36, y + 13 + lines.length * 12 + li * 11))
      }
      y += rowH + 4

      winNum++
    })
    y += 8
  })

  const allWindows = rooms.flatMap(r => r.windows)
  if (allWindows.length > 0) {
    if (y + 30 > pageH - 60) { addFooter(); doc.addPage(); y = 40 }
    doc.setFillColor(26, 35, 50); doc.rect(margin, y - 10, W - margin * 2, 22, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(200, 151, 58)
    const totalQty = allWindows.reduce((sum, w) => sum + parseInt(w.qty || 1), 0)
    doc.text(`TOTAL: ${allWindows.length} line item(s)  |  ${totalQty} unit(s)`, margin + 8, y + 5)
    y += 20
  }

  if (jobInfo.notes) {
    y += 8
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 151, 58)
    doc.text('ADDITIONAL NOTES', margin, y); y += 14
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(26, 35, 50)
    doc.splitTextToSize(jobInfo.notes, W - margin * 2).forEach(line => { doc.text(line, margin, y); y += 14 })
  }

  addFooter()
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

function MeasurementInput({ value, frac, onValue, onFrac, placeholder }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input type="number" step="1" placeholder={placeholder || 'e.g. 36'} value={value} onChange={e => onValue(e.target.value)} style={{ flex: 2 }} />
      <select value={frac || ''} onChange={e => onFrac(e.target.value)} style={{ flex: 1, fontSize: 13 }}>
        {FRACTIONS.map(f => <option key={f} value={f}>{f || '+'}</option>)}
      </select>
    </div>
  )
}

// ─── Window Card ──────────────────────────────────────────────────────────────

function WindowCard({ win, index, onEdit, onRemove }) {
  const summary = summarizeWindow(win)
  return (
    <div style={{ background: 'var(--navy-light)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: 4, padding: '2px 7px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12 }}>#{index + 1}</span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15 }}>{win.style}</span>
            {parseInt(win.qty) > 1 && <span style={{ color: 'var(--gray)', fontSize: 13 }}>× {win.qty}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6 }}>{summary}</div>
          {win.notes && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--gray)', fontStyle: 'italic' }}>"{win.notes}"</div>}
          {win.photos && win.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {win.photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: 56, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn-outline" onClick={() => onEdit(index)} style={{ padding: '6px 12px', fontSize: 13 }}>Edit</button>
          <button className="btn-danger" onClick={() => onRemove(index)}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ─── Top Window Unit ─────────────────────────────────────────────────────────

function TopWindowUnit({ label, value, onChange, options }) {
  const { m, facing } = getTopWinMeasurements(value.style)
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '12px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <div style={{ gridColumn: '1/-1', marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Style</label>
          <select value={value.style} onChange={e => onChange({ style: e.target.value, width: '', widthFrac: '', height: '', heightFrac: '', shortSideHeight: '', shortSideHeightFrac: '', facing: '' })}>
            <option value="">Select...</option>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        {facing && (
          <div style={{ gridColumn: '1/-1', marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Facing</label>
            <select value={value.facing} onChange={e => set('facing', e.target.value)}>
              <option value="">Select...</option>
              <option>Left</option><option>Right</option>
            </select>
          </div>
        )}
        {m.includes('w') && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Width (in) *</label>
            <MeasurementInput value={value.width} frac={value.widthFrac} onValue={v => set('width', v)} onFrac={v => set('widthFrac', v)} />
          </div>
        )}
        {m.includes('h') && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Height (in) *</label>
            <MeasurementInput value={value.height} frac={value.heightFrac} onValue={v => set('height', v)} onFrac={v => set('heightFrac', v)} />
          </div>
        )}
        {m.includes('s') && (
          <div style={{ gridColumn: '1/-1', marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Short Side Height (in) *</label>
            <MeasurementInput value={value.shortSideHeight} frac={value.shortSideHeightFrac} onValue={v => set('shortSideHeight', v)} onFrac={v => set('shortSideHeightFrac', v)} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Window Form ──────────────────────────────────────────────────────────────

const EMPTY = {
  style: '', numberWide: 1, facing: '', sashSplit: '',
  measurementType: 'Frame Size', configType: 'standard', standardConfig: '', panelConfigs: [],
  width: '', widthFrac: '', height: '', heightFrac: '',
  shortSideHeight: '', shortSideHeightFrac: '', widthOrHeight: '', widthOrHeightFrac: '',
  angleOfDeflection: '', flankerRatio: '',
  exteriorColor: '', interiorColor: '', pane: 'Double',
  glassSurface: '', tempered: 'No', decorativeGlass: 'None',
  grilleType: '', grillePattern: '', simulatedRail: '',
  hardwareColor: '', screenColor: '', screenMesh: '',
  photos: [], qty: '1', notes: '',
  numberHigh: 1, topWindowsWide: 1,
  topWindows: [{ style: '', width: '', widthFrac: '', height: '', heightFrac: '', shortSideHeight: '', shortSideHeightFrac: '', facing: '' }],
  numberHigh: 1,
  topWindowWidth: 1,
  topStyle: '', topHeight: '', topHeightFrac: '', topShortSideHeight: '', topShortSideHeightFrac: '',
  topLeftStyle: '', topLeftHeight: '', topLeftHeightFrac: '',
  topRightStyle: '', topRightHeight: '', topRightHeightFrac: '',
  overallHeight: '', overallHeightFrac: '',
  jambDepth: '', jambDepthFrac: '', jambType: '',
  casingWidth: '', casingWidthFrac: '', casingType: '', casingStyle: '', lpTrimColor: ''
}

function WindowForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? { ...EMPTY, ...initial } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const cameraRef = useRef(null)

  const cfg = WIN[form.style]
  const panelCfg = cfg ? getPanelConfig(cfg.pt, form.numberWide) : null
  const intColors = getIntColors(form.exteriorColor)
  const glassSurfaces = GLASS_SURFACES[form.pane] || []
  const decorGlasses = DECORATIVE_GLASSES[form.pane] || []
  const grillePatterns = cfg?.gp || []

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
      grilleType: '', grillePattern: '', simulatedRail: '',
    }))
  }, [form.style])

  useEffect(() => {
    setForm(f => ({ ...f, panelConfigs: Array(f.numberWide).fill(''), standardConfig: '' }))
  }, [form.numberWide])

  useEffect(() => {
    setForm(f => ({ ...f, glassSurface: '', decorativeGlass: 'None' }))
  }, [form.pane])

  useEffect(() => {
    setForm(f => ({ ...f, grillePattern: '', simulatedRail: '' }))
  }, [form.grilleType])

  useEffect(() => {
    if (form.interiorColor && !getIntColors(form.exteriorColor).includes(form.interiorColor)) {
      set('interiorColor', '')
    }
  }, [form.exteriorColor])

  // Auto-sync casing type from jamb type
  useEffect(() => {
    if (form.jambType && !form.casingType) {
      set('casingType', form.jambType)
    }
  }, [form.jambType])

  // Auto-populate hardware and screen color from interior color
  useEffect(() => {
    if (!form.interiorColor) return
    const hw = INT_TO_HW[form.interiorColor]
    const sc = INT_TO_SCREEN[form.interiorColor]
    setForm(f => ({
      ...f,
      hardwareColor: hw || f.hardwareColor,
      screenColor: sc || f.screenColor,
    }))
  }, [form.interiorColor])

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => set('photos', [...(form.photos || []), ev.target.result])
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removePhoto = (i) => set('photos', form.photos.filter((_, j) => j !== i))

  const getMissingFields = () => {
    if (!cfg) return []
    const missing = []
    if (cfg.m.includes('w') && !form.width) missing.push('Width')
    if (cfg.m.includes('h') && !form.height) missing.push('Height')
    if (cfg.m.includes('s') && !form.shortSideHeight) missing.push('Short Side Height')
    if (cfg.m.includes('wo') && !form.widthOrHeight) missing.push('Width or Height')
    if (!form.exteriorColor) missing.push('Exterior Color')
    if (!form.interiorColor) missing.push('Interior Color')
    if (!form.glassSurface) missing.push('Glass Surface')
    if (cfg.sm && !form.screenMesh) missing.push('Screen Mesh Type')
    if (form.numberHigh === 2) {
      form.topWindows.forEach((tw, i) => {
        const label = form.topWindows.length > 1 ? `Top Window ${i + 1}` : 'Top Window'
        if (!tw.style) missing.push(`${label} Style`)
        const { m } = getTopWinMeasurements(tw.style)
        if (m.includes('w') && !tw.width) missing.push(`${label} Width`)
        if (m.includes('h') && !tw.height) missing.push(`${label} Height`)
        if (m.includes('s') && !tw.shortSideHeight) missing.push(`${label} Short Side Height`)
      })
    }
    return missing
  }

  const handleSave = () => {
    const missing = getMissingFields()
    if (missing.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missing.join('\n• ')}`)
      return
    }
    const w = { ...form }
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
          {cfg.wide.length === 1 && TWO_HIGH_STYLES.includes(form.style) && (
            <Field label="Number High">
              <select value={form.numberHigh} onChange={e => set('numberHigh', parseInt(e.target.value))}>
                <option value={1}>1 High</option>
                <option value={2}>2 High</option>
              </select>
            </Field>
          )}
          {cfg.wide.length > 1 && (
            <Field label="Number Wide">
              <select value={form.numberWide} onChange={e => set('numberWide', parseInt(e.target.value))}>
                {cfg.wide.map(n => <option key={n} value={n}>{n} Wide</option>)}
              </select>
            </Field>
          )}
          {TWO_HIGH_STYLES.includes(form.style) && (
            <Field label="Number High">
              <select value={form.numberHigh} onChange={e => set('numberHigh', parseInt(e.target.value))}>
                <option value={1}>1 High</option>
                <option value={2}>2 High</option>
              </select>
            </Field>
          )}


          {cfg.facing && (
            <Field label="Facing">
              <select value={form.facing} onChange={e => set('facing', e.target.value)}>
                <option value="">Select...</option>
                <option>Left</option>
                <option>Right</option>
              </select>
            </Field>
          )}

          {cfg.sash && (
            <Field label="Sash Split" col="1/-1">
              <select value={form.sashSplit} onChange={e => set('sashSplit', e.target.value)}>
                <option value="">Select...</option>
                <option>1/4 - 1/2 - 1/4</option>
                <option>1/3 - 1/3 - 1/3</option>
              </select>
            </Field>
          )}

          {panelCfg && (
            <>
              <SectionHeader>Configuration</SectionHeader>
              {panelCfg.type === 'fixed' && (
                <Field label="Configuration" col="1/-1"><input value={panelCfg.value} disabled style={{ opacity: 0.6 }} /></Field>
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
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(panelCfg.panels, 3)}, 1fr)`, gap: 8 }}>
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

          <SectionHeader>Measurements</SectionHeader>
          {cfg.mt === 2 && (
            <Field label="Measurement Type" col="1/-1">
              <select value={form.measurementType} onChange={e => set('measurementType', e.target.value)}>
                <option>Frame Size</option>
                <option>Rough Opening</option>
                <option>Inside Opening</option>
              </select>
            </Field>
          )}
          {cfg.m.includes('w') && form.numberHigh !== 2 && (
            <Field label="Width (inches) *">
              <MeasurementInput value={form.width} frac={form.widthFrac} onValue={v => set('width', v)} onFrac={v => set('widthFrac', v)} />
            </Field>
          )}
          {cfg.m.includes('wo') && (
            <Field label="Width or Height (inches) *" col="1/-1">
              <MeasurementInput value={form.widthOrHeight} frac={form.widthOrHeightFrac} onValue={v => set('widthOrHeight', v)} onFrac={v => set('widthOrHeightFrac', v)} />
            </Field>
          )}

          {/* 2 High measurements */}
          {cfg.m.includes('h') && TWO_HIGH_STYLES.includes(form.style) && form.numberHigh === 2 ? (() => {
            const topOpts = getTopOptions(form.style)
            const base2Wide = form.numberWide === 2
            const forceRound = form.numberWide >= 3
            return (
              <>
                <SectionHeader>Top Window</SectionHeader>
                {base2Wide && !forceRound && (
                  <Field label="Top Window Width" col="1/-1">
                    <select value={form.topWindowWidth} onChange={e => set('topWindowWidth', parseInt(e.target.value))}>
                      <option value={1}>1 Wide</option>
                      <option value={2}>2 Wide</option>
                    </select>
                  </Field>
                )}
                {base2Wide && form.topWindowWidth === 2 && !forceRound ? (
                  <>
                    <Field label="Left Panel Style">
                      <select value={form.topLeftStyle} onChange={e => set('topLeftStyle', e.target.value)}>
                        <option value="">Select...</option>
                        {topOpts.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Right Panel Style">
                      <select value={form.topRightStyle} onChange={e => set('topRightStyle', e.target.value)}>
                        <option value="">Select...</option>
                        {topOpts.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                  </>
                ) : (
                  <Field label="Top Window Style" col="1/-1">
                    <select value={form.topStyle} onChange={e => set('topStyle', e.target.value)}>
                      <option value="">Select...</option>
                      {(forceRound ? ROUND_TOP_WINDOW_STYLES : topOpts).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                )}
                <SectionHeader>Measurements (Bottom Window)</SectionHeader>
                {cfg.m.includes('w') && (
                  <Field label="Width (inches) *" col="1/-1">
                    <MeasurementInput value={form.width} frac={form.widthFrac} onValue={v => set('width', v)} onFrac={v => set('widthFrac', v)} />
                  </Field>
                )}
                <Field label="Overall Height (in) *">
                  <MeasurementInput value={form.overallHeight} frac={form.overallHeightFrac} onValue={v => set('overallHeight', v)} onFrac={v => set('overallHeightFrac', v)} />
                </Field>
                <Field label="Bottom Window Height (in)">
                  <MeasurementInput value={form.height} frac={form.heightFrac} onValue={v => set('height', v)} onFrac={v => set('heightFrac', v)} />
                </Field>
                <Field label="Top Window Height (in) *">
                  <MeasurementInput value={form.topHeight} frac={form.topHeightFrac} onValue={v => set('topHeight', v)} onFrac={v => set('topHeightFrac', v)} />
                </Field>
                {WIN[form.topStyle]?.m.includes('s') && (
                  <Field label="Top Short Side Height (in)">
                    <MeasurementInput value={form.topShortSideHeight} frac={form.topShortSideHeightFrac} onValue={v => set('topShortSideHeight', v)} onFrac={v => set('topShortSideHeightFrac', v)} />
                  </Field>
                )}
              </>
            )
          })() : cfg.m.includes('h') && (
            <Field label="Height (inches) *">
              <MeasurementInput value={form.height} frac={form.heightFrac} onValue={v => set('height', v)} onFrac={v => set('heightFrac', v)} />
            </Field>
          )}
          {cfg.m.includes('s') && form.numberHigh !== 2 && (
            <Field label="Short Side Height (in) *" col="1/-1">
              <MeasurementInput value={form.shortSideHeight} frac={form.shortSideHeightFrac} onValue={v => set('shortSideHeight', v)} onFrac={v => set('shortSideHeightFrac', v)} />
            </Field>
          )}

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


          <SectionHeader>Color & Glass</SectionHeader>
          <Field label="Exterior Color *">
            <select value={form.exteriorColor} onChange={e => set('exteriorColor', e.target.value)}>
              <option value="">Select...</option>
              {EXT_COLORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Interior Color *">
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
          <Field label="Glass Surface *">
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

          <SectionHeader>Grille</SectionHeader>
          <Field label="Grille Type">
            <select value={form.grilleType} onChange={e => set('grilleType', e.target.value)}>
              <option value="">None</option>
              {cfg.g.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
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
            <Field label="Screen Mesh Type *" col={cfg.sc ? '' : '1/-1'}>
              <select value={form.screenMesh} onChange={e => set('screenMesh', e.target.value)}>
                <option value="">Select...</option>
                {SCREEN_MESHES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
          )}
        </>}

        <SectionHeader>Extension Jamb & Casing</SectionHeader>
          <Field label="Jamb Depth (inches)">
            <MeasurementInput value={form.jambDepth} frac={form.jambDepthFrac} onValue={v => set('jambDepth', v)} onFrac={v => set('jambDepthFrac', v)} />
          </Field>
          <Field label="Jamb Type">
            <select value={form.jambType} onChange={e => { set('jambType', e.target.value); if (!form.casingType) set('casingType', e.target.value) }}>
              <option value="">Select...</option>
              {JAMB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Casing Width (inches)">
            <MeasurementInput value={form.casingWidth} frac={form.casingWidthFrac} onValue={v => set('casingWidth', v)} onFrac={v => set('casingWidthFrac', v)} />
          </Field>
          <Field label="Casing Type">
            <select value={form.casingType} onChange={e => set('casingType', e.target.value)}>
              <option value="">Select...</option>
              {JAMB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Casing Style">
            <select value={form.casingStyle} onChange={e => set('casingStyle', e.target.value)}>
              <option value="">Select...</option>
              {CASING_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="LP Trim Color">
            <input placeholder="e.g. White" value={form.lpTrimColor} onChange={e => set('lpTrimColor', e.target.value)} />
          </Field>

        <SectionHeader>Photos & Notes</SectionHeader>
        <Field label="Photos" col="1/-1">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-outline" onClick={() => cameraRef.current.click()} style={{ padding: '8px 16px', fontSize: 13 }}>📷 Take / Add Photo</button>
            {(form.photos || []).map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={p} alt="" style={{ width: 64, height: 52, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#c0392b', border: 'none', borderRadius: '50%', color: '#fff', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
          </div>
        </Field>

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

const newRoom = () => ({ id: Date.now(), name: '', windows: [] })

export default function App() {
  const [step, setStep] = useState('job')
  const [jobInfo, setJobInfo] = useState({ customerName: '', jobId: '', jobName: '', address: '', estimator: '', notes: '' })
  const [rooms, setRooms] = useState([newRoom()])
  const [showFormInRoom, setShowFormInRoom] = useState(null)
  const [editInfo, setEditInfo] = useState(null) // { roomId, winIndex }
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const allWindows = rooms.flatMap(r => r.windows)
  const setJob = (k, v) => setJobInfo(f => ({ ...f, [k]: v }))
  const handleJobSelect = (s) => setJobInfo(f => ({ ...f, customerName: s.customerName, jobId: s.jobId, jobName: s.jobName, address: s.address }))
  const jobValid = jobInfo.customerName.trim().length > 0

  const updateRoom = (id, key, val) => setRooms(rs => rs.map(r => r.id === id ? { ...r, [key]: val } : r))
  const deleteRoom = (id) => setRooms(rs => rs.filter(r => r.id !== id))

  const saveWindow = (win) => {
    if (editInfo) {
      setRooms(rs => rs.map(r => r.id === editInfo.roomId ? { ...r, windows: r.windows.map((w, i) => i === editInfo.winIndex ? win : w) } : r))
      setEditInfo(null)
    } else {
      setRooms(rs => rs.map(r => r.id === showFormInRoom ? { ...r, windows: [...r.windows, win] } : r))
      setShowFormInRoom(null)
    }
  }

  const removeWindow = (roomId, winIndex) => setRooms(rs => rs.map(r => r.id === roomId ? { ...r, windows: r.windows.filter((_, i) => i !== winIndex) } : r))

  const handleDownloadPDF = () => {
    const doc = generatePDF(jobInfo, rooms)
    doc.save(`Fettig-Estimate-${jobInfo.customerName.replace(/\s+/g, '-') || 'Draft'}-${Date.now()}.pdf`)
  }

  const handleSubmitToJobTread = async () => {
    setSubmitting(true)
    try {
      async function uploadFile(base64Data, fileName, mimeType) {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'uploadFile', jobId: jobInfo.jobId, pdfBase64: base64Data, fileName, mimeType })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Failed to upload ${fileName}`)
      }

      // Upload PDF
      const doc = generatePDF(jobInfo, rooms)
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      await uploadFile(pdfBase64, 'Estimate Notes.pdf', 'application/pdf')

      // Upload each photo one at a time
      const roomCounts = {}
      for (const room of rooms) {
        for (const win of room.windows) {
          for (const dataUrl of (win.photos || [])) {
            const roomName = room.name || 'Unknown Room'
            roomCounts[roomName] = (roomCounts[roomName] || 0) + 1
            const count = roomCounts[roomName]
            const ext = dataUrl.includes('image/png') ? 'png' : 'jpg'
            const mimeType = dataUrl.includes('image/png') ? 'image/png' : 'image/jpeg'
            const fileName = `${roomName}${count > 1 ? ` ${count}` : ''}.${ext}`
            const base64 = dataUrl.split(',')[1]
            await uploadFile(base64, fileName, mimeType)
          }
        }
      }

      setSubmitted(true)
    } catch (err) { alert('JobTread error: ' + err.message) } finally { setSubmitting(false) }
  }

  let globalWinNum = 1

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px 0' }}>
      <div style={{ background: 'var(--navy-light)', borderBottom: '3px solid var(--gold)', padding: '18px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, letterSpacing: '0.06em' }}>FETTIG MILLWORK & WINDOWS</div>
        <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 600 }}>WINDOW ESTIMATOR</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[['job','1','Job Info'],['windows','2','Windows'],['review','3','Review & Submit']].map(([s,n,label]) => (
            <button key={s} className={step===s?'btn-gold':'btn-outline'} onClick={()=>{if(s==='windows'&&!jobValid)return;setStep(s)}} style={{flex:1,fontSize:12,padding:'7px 8px',opacity:(s==='windows'&&!jobValid)?0.4:1}}>{n}. {label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* ── Step 1 ── */}
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
            <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14, opacity: jobValid ? 1 : 0.5 }} onClick={() => jobValid && setStep('windows')}>Next: Add Windows →</button>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 'windows' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>Windows</div>
              <div style={{ color: 'var(--gray)', fontSize: 13 }}>Organize windows by room for <span style={{ color: 'var(--gold)' }}>{jobInfo.customerName}</span>.</div>
            </div>

            {rooms.map((room, ri) => (
              <div key={room.id} style={{ background: 'var(--navy-light)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                {/* Room header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: 4, padding: '3px 10px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', flexShrink: 0 }}>ROOM {ri + 1}</div>
                  <input
                    placeholder="Room name (e.g. Living Room, Kitchen...)"
                    value={room.name}
                    onChange={e => updateRoom(room.id, 'name', e.target.value)}
                    style={{ flex: 1, margin: 0 }}
                  />
                  {rooms.length > 1 && (
                    <button className="btn-danger" onClick={() => deleteRoom(room.id)} style={{ flexShrink: 0 }}>✕</button>
                  )}
                </div>

                {/* Windows in room */}
                {room.windows.map((win, wi) => {
                  const num = globalWinNum++
                  return editInfo?.roomId === room.id && editInfo?.winIndex === wi
                    ? <WindowForm key={wi} initial={win} onSave={saveWindow} onCancel={() => setEditInfo(null)} />
                    : <WindowCard key={wi} win={win} index={num - 1} onEdit={() => { setShowFormInRoom(null); setEditInfo({ roomId: room.id, winIndex: wi }) }} onRemove={() => removeWindow(room.id, wi)} />
                })}

                {/* Add window form */}
                {showFormInRoom === room.id && !editInfo
                  ? <WindowForm onSave={saveWindow} onCancel={() => setShowFormInRoom(null)} />
                  : (!editInfo || editInfo.roomId !== room.id) && (
                    <button className="btn-outline" style={{ width: '100%', padding: 12, fontSize: 14, borderStyle: 'dashed' }} onClick={() => { setShowFormInRoom(room.id); setEditInfo(null) }}>+ Add Window to {room.name || `Room ${ri + 1}`}</button>
                  )
                }
              </div>
            ))}

            <button className="btn-outline" style={{ width: '100%', padding: 12, fontSize: 14, marginBottom: 16 }} onClick={() => setRooms(rs => [...rs, newRoom()])}>+ Add Another Room</button>

            {allWindows.length > 0 && (
              <button className="btn-gold" style={{ width: '100%', fontSize: 16, padding: 14 }} onClick={() => setStep('review')}>Review Estimate ({allWindows.length} window{allWindows.length !== 1 ? 's' : ''}) →</button>
            )}
          </div>
        )}

        {/* ── Step 3 ── */}
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
                <div><span style={{ color: 'var(--gray)' }}>Rooms:</span> <strong>{rooms.filter(r => r.windows.length > 0).length}</strong></div>
                <div><span style={{ color: 'var(--gray)' }}>Total Units:</span> <strong>{allWindows.reduce((s, w) => s + parseInt(w.qty || 1), 0)}</strong></div>
              </div>
            </div>

            {(() => { let n = 1; return rooms.filter(r => r.windows.length > 0).map(room => (
              <div key={room.id} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>
                  {room.name || 'Unnamed Room'}
                </div>
                {room.windows.map((win, wi) => <WindowCard key={wi} win={win} index={n++ - 1} onEdit={() => { setStep('windows'); setTimeout(() => setEditInfo({ roomId: room.id, winIndex: wi }), 50) }} onRemove={() => removeWindow(room.id, wi)} />)}
              </div>
            ))})()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
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
              <button className="btn-outline" style={{ width: '100%', fontSize: 14, padding: 12 }} onClick={() => { setStep('job'); setJobInfo({ customerName: '', jobId: '', jobName: '', address: '', estimator: '', notes: '' }); setRooms([newRoom()]); setSubmitted(false) }}>Start New Estimate</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
