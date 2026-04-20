import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'

// ─── Window Color / Glass Data ────────────────────────────────────────────────

const EXT_COLORS = ['Stone White','Pebble Gray','Sierra','Bronze','Cashmere','Bahama Brown','Ebony']
const getIntColors = (ext) => {
  if (ext==='Ebony')  return ['Stone White','EverWood Pine','Ebony']
  if (ext==='Bronze') return ['Stone White','EverWood Pine','Sierra','Bronze']
  return ['Stone White','EverWood Pine','Sierra']
}
const INT_TO_HW     = {'Stone White':'White','EverWood Pine':'Satin Taupe','Sierra':'Sierra','Bronze':'Oil Rubbed Bronze','Ebony':'Matte Black'}
const EXT_TO_HW     = {'Stone White':'White','Pebble Gray':'Satin Taupe','Sierra':'Sierra','Bronze':'Oil Rubbed Bronze','Cashmere':'Satin Taupe','Bahama Brown':'Oil Rubbed Bronze','Ebony':'Matte Black'}
const INT_TO_BIFOLD = (color) => ['Bronze','Ebony'].includes(color) ? 'Black' : 'Brushed Stainless'
const EXT_TO_BIFOLD = (color) => ['Bronze','Bahama Brown','Ebony'].includes(color) ? 'Black' : 'Brushed Stainless'
const INT_TO_SCREEN = {'Stone White':'Stone White','EverWood Pine':'Satin Taupe','Sierra':'Sierra','Bronze':'Bronze','Ebony':'Ebony'}
const GLASS_SURFACES = {
  Double: ['Clear','Low E1','Low E2','Low E3','Low E2/ERS','Low E3/ERS'],
  Triple: ['Low E2/E1','Low E3/E1','Low E2/E1/ERS','Low E3/E1/ERS'],
}
const DECORATIVE_GLASSES = {
  Double: ['None','Obscure','Glue Chip','Rain','Reed','Narrow Reed','Frost'],
  Triple: ['None','Obscure'],
}
const STD_PATTERNS   = ['Rectangular','Prairie','Checkrail','Cottage','Oriel']
const ROUND_PATTERNS = ['Sunburst','Rectangular']
const RECT_PATTERNS  = ['Rectangular']
const HARDWARE_COLORS= ['Satin Taupe','Sierra','White','Matte Black','Oil Rubbed Bronze','Satin Nickel','Brushed Chrome','Antique Brass','Brass']
const SCREEN_COLORS  = ['Stone White','EverWood Pine','Satin Taupe','Sierra','Bronze','Ebony']
const SCREEN_MESHES  = ['Bright View Mesh','Charcoal Hi-Transparency Fiberglass Mesh']
const JAMB_TYPES     = ['Primed','Pine','Oak','Knotty Alder','Maple','Other']
const CASING_STYLES  = ['Ranch','Colonial','Other']
const FRACTIONS = ['','1/16"','1/8"','3/16"','1/4"','5/16"','3/8"','7/16"','1/2"','9/16"','5/8"','11/16"','3/4"','13/16"','7/8"','15/16"']

function fracToDecimal(f){if(!f)return 0;const m=f.match(/(\d+)\/(\d+)/);return m?parseInt(m[1])/parseInt(m[2]):0}
function decimalToFrac(dec){
  const whole=Math.floor(dec),sixteenths=Math.round((dec-whole)*16)
  if(sixteenths===0)return{whole:String(whole),frac:''}
  if(sixteenths===16)return{whole:String(whole+1),frac:''}
  const map={1:'1/16"',2:'1/8"',3:'3/16"',4:'1/4"',5:'5/16"',6:'3/8"',7:'7/16"',8:'1/2"',9:'9/16"',10:'5/8"',11:'11/16"',12:'3/4"',13:'13/16"',14:'7/8"',15:'15/16"'}
  return{whole:String(whole),frac:map[sixteenths]||''}
}
function fmtMeasurement(val,frac){if(!val)return'';return frac?`${val} ${frac}`:`${val}"`}

// ─── Patio Door Data ──────────────────────────────────────────────────────────

const CALL_WIDTH_DATA = {
  w_sliding_2:    {50:{frame:'59"',ro:'60"'},60:{frame:'71"',ro:'72"'},80:{frame:'95"',ro:'96"'}},
  w_sliding_3:    {76:{frame:'88-1/2"',ro:'89-1/2"'},90:{frame:'106-1/2"',ro:'107-1/2"'},120:{frame:'142-1/2"',ro:'143-1/2"'}},
  w_sliding_4:    {100:{frame:'117"',ro:'118"'},120:{frame:'141"',ro:'142"'},160:{frame:'189"',ro:'190"'}},
  w_french_in_1:  {26:{frame:'30-5/16"',ro:'31-5/16"'},28:{frame:'32-5/16"',ro:'33-5/16"'},30:{frame:'36-5/16"',ro:'37-5/16"'}},
  w_french_in_2:  {50:{frame:'59"',ro:'60"'},54:{frame:'63"',ro:'64"'},60:{frame:'71"',ro:'72"'}},
  w_french_out_2: {50:{frame:'59-1/4"',ro:'60-1/4"'},54:{frame:'63-1/4"',ro:'64-1/4"'},60:{frame:'71-1/4"',ro:'72-1/4"'}},
  w_french_in_3:  {76:{frame:'87-3/4"',ro:'88-3/4"'},80:{frame:'93-3/4"',ro:'94-3/4"'},90:{frame:'105-3/4"',ro:'106-3/4"'}},
  w_french_out_3: {76:{frame:'88"',ro:'89"'},80:{frame:'94"',ro:'95"'},90:{frame:'106"',ro:'107"'}},
  w_bifold_1:     {30:{frame:'36-19/32"',ro:'37-19/32"'},34:{frame:'39-9/32"',ro:'40-9/32"'}},
  w_bifold_2:     {60:{frame:'71-9/16"',ro:'72-9/16"'},66:{frame:'76-59/64"',ro:'77-59/64"'}},
  w_bifold_3:     {90:{frame:'106-7/64"',ro:'107-7/64"'},98:{frame:'114-5/32"',ro:'115-5/32"'}},
  w_bifold_4:     {120:{frame:'141"',ro:'142"'},128:{frame:'151-23/32"',ro:'152-23/32"'}},
  w_bifold_5:     {150:{frame:'175-19/32"',ro:'176-19/32"'},160:{frame:'189"',ro:'190"'}},
  w_bifold_6:     {120:{frame:'141"',ro:'142"'},178:{frame:'210-3/8"',ro:'211-3/8"'},190:{frame:'226-15/32"',ro:'227-15/32"'}},
  w_bifold_7:     {206:{frame:'245-5/64"',ro:'246-5/64"'},220:{frame:'263-27/32"',ro:'264-27/32"'}},
}
const CALL_HEIGHT_DATA = {
  h_sliding: {65:{frame:'79-1/2"',ro:'80"'},68:{frame:'82"',ro:'82-1/2"'},80:{frame:'95-1/2"',ro:'96"'}},
  h_french:  {65:{frame:'79-1/2"',ro:'80"'},68:{frame:'82"',ro:'82-1/2"'},70:{frame:'86"',ro:'86-1/2"'},80:{frame:'95-1/2"',ro:'96"'}},
}

const DOOR_TYPE_CONFIG = {
  '2 Panel Sliding Patio Door':      {widthKey:'w_sliding_2',    heightKey:'h_sliding', configs:['OX','XO'],                             handingConfigs:[],                              category:'sliding',         decoGlass:['Obscure']},
  '3 Panel Sliding Patio Door':      {widthKey:'w_sliding_3',    heightKey:'h_sliding', configs:['OOX','XOO','OXO'],                    handingConfigs:['OXO'],                         category:'sliding',         decoGlass:['Obscure']},
  '4 Panel Sliding Patio Door':      {widthKey:'w_sliding_4',    heightKey:'h_sliding', configs:['OXXO'],                                handingConfigs:['OXXO'],                        category:'sliding',         decoGlass:['Obscure']},
  '2 Panel Sliding French Door':     {widthKey:'w_sliding_2',    heightKey:'h_sliding', configs:['OX','XO'],                             handingConfigs:[],                              category:'sliding',         decoGlass:['Obscure']},
  '3 Panel Sliding French Door':     {widthKey:'w_sliding_3',    heightKey:'h_sliding', configs:['OOX','XOO','OXO'],                    handingConfigs:['OXO'],                         category:'sliding',         decoGlass:['Obscure']},
  '4 Panel Sliding French Door':     {widthKey:'w_sliding_4',    heightKey:'h_sliding', configs:['OXXO'],                                handingConfigs:['OXXO'],                        category:'sliding',         decoGlass:['Obscure']},
  'Inswing French Door':             {widthKey:'w_french_in_1',  heightKey:'h_french',  configs:['X','O'],                               handingConfigs:['X'],                           category:'inswing_french',  decoGlass:['Obscure','Glue Chip','Frost'], jamb:true},
  '2 Panel Inswing French Door':     {widthKey:'w_french_in_2',  heightKey:'h_french',  configs:['OX','XO','XX','OO'],                   handingConfigs:['OX','XO','XX'],                category:'inswing_french',  decoGlass:['Obscure','Glue Chip','Frost'], jamb:true},
  '3 Panel Inswing French Door':     {widthKey:'w_french_in_3',  heightKey:'h_french',  configs:['OOX','XOO','OXO','OXX','XXO','OOO'],  handingConfigs:['OOX','XOO','OXO','OXX','XXO'],category:'inswing_french',  decoGlass:['Obscure','Glue Chip','Frost'], jamb:true},
  'Outswing French Door':            {widthKey:'w_french_in_1',  heightKey:'h_french',  configs:['X','O'],                               handingConfigs:['X'],                           category:'outswing_french', decoGlass:['Obscure','Glue Chip','Frost']},
  '2 Panel Outswing French Door':    {widthKey:'w_french_out_2', heightKey:'h_french',  configs:['OX','XO','XX','OO'],                   handingConfigs:['OX','XO','XX'],                category:'outswing_french', decoGlass:['Obscure','Glue Chip','Frost']},
  '3 Panel Outswing French Door':    {widthKey:'w_french_out_3', heightKey:'h_french',  configs:['OXO'],                                 handingConfigs:['OXO'],                         category:'outswing_french', decoGlass:['Obscure','Glue Chip','Frost']},
  'Unidirectional Bi-Fold Door':           {category:'bifold_uni',    panelOptions:[1,2,3,4,5,6,7], heightKey:'h_french', decoGlass:['Obscure','Glue Chip','Frost']},
  'Unidirectional Bi-Fold w/Access Panel': {category:'bifold_access', panelOptions:[3,4,5,6,7],     heightKey:'h_french', decoGlass:['Obscure','Glue Chip','Frost']},
  'Bi-Parting Bi-Fold Door':              {category:'bifold_bipart', panelOptions:[2,4,6],           heightKey:'h_french', decoGlass:['Obscure','Glue Chip','Frost']},
}

const BIFOLD_UNI = {
  1:{ops:['1L','1R'],  widthKey:'w_bifold_1'},
  2:{ops:['2L','2R'],      widthKey:'w_bifold_2'},
  3:{ops:['3L','3R'],      widthKey:'w_bifold_3'},
  4:{ops:['4L','4R'],      widthKey:'w_bifold_4'},
  5:{ops:['5L','5R'],      widthKey:'w_bifold_5'},
  6:{ops:['6L','6R'],      widthKey:'w_bifold_6'},
  7:{ops:['7L','7R'],      widthKey:'w_bifold_7'},
}
const BIFOLD_ACCESS = {
  3:{ops:['2L1R','1L2R'],  widthKey:'w_bifold_3'},
  4:{ops:['3L1R','1L3R'],  widthKey:'w_bifold_4'},
  5:{ops:['4L1R','1L4R'],  widthKey:'w_bifold_5'},
  6:{ops:['5L1R','1L5R'],  widthKey:'w_bifold_6'},
  7:{ops:['6L1R','1L6R'],  widthKey:'w_bifold_7'},
}
const BIFOLD_BIPART = {
  2:{ops:['1L1R'], widthKey:'w_bifold_2', handing:['Left','Right']},
  4:{ops:['2L2R'], widthKey:'w_bifold_4', handing:null},
  6:{ops:['3L3R'], widthKey:'w_bifold_6', handing:['Left','Right']},
}

const OUTSWING_HINGE_COLORS = [...HARDWARE_COLORS,'Pebble Gray','Cashmere']
const BIFOLD_HINGE_COLORS   = ['Black','Brushed Stainless']
const DOOR_HANDLE_STYLES    = ['Cambridge','Northfield']

function getBifoldPanelRow(category, panelCount) {
  if (category==='bifold_uni')    return BIFOLD_UNI[panelCount]
  if (category==='bifold_access') return BIFOLD_ACCESS[panelCount]
  if (category==='bifold_bipart') return BIFOLD_BIPART[panelCount]
  return null
}

function deriveDoorStyle(dc, isFrench, frenchSwing, bifoldSub, panelCount) {
  if (!dc) return ''
  if (dc==='sliding') {
    if (!panelCount) return ''
    return isFrench ? `${panelCount} Panel Sliding French Door` : `${panelCount} Panel Sliding Patio Door`
  }
  if (dc==='french') {
    if (!frenchSwing || !panelCount) return ''
    const sw = frenchSwing==='inswing' ? 'Inswing' : 'Outswing'
    return panelCount===1 ? `${sw} French Door` : `${panelCount} Panel ${sw} French Door`
  }
  if (dc==='bifold') {
    if (!bifoldSub) return ''
    return {uni:'Unidirectional Bi-Fold Door',access:'Unidirectional Bi-Fold w/Access Panel',bipart:'Bi-Parting Bi-Fold Door'}[bifoldSub]||''
  }
  return ''
}

function getPanelCounts(dc, bifoldSub) {
  if (dc==='sliding') return [2,3,4]
  if (dc==='french')  return [1,2,3]
  if (dc==='bifold') {
    if (bifoldSub==='uni')    return [1,2,3,4,5,6,7]
    if (bifoldSub==='access') return [3,4,5,6,7]
    if (bifoldSub==='bipart') return [2,4,6]
  }
  return []
}

function resolveConfigs(dtc) {
  if (!dtc?.configs) return {filteredConfigs:[], autoConfig:null}
  const filtered = dtc.configs.filter(c => c.includes('X'))
  return filtered.length===1 ? {filteredConfigs:[], autoConfig:filtered[0]} : {filteredConfigs:filtered, autoConfig:null}
}

function resolveBifoldOps(panelRow) {
  if (!panelRow?.ops) return {filteredOps:[], autoOp:null}
  const ops = panelRow.ops
  return ops.length===1 ? {filteredOps:[], autoOp:ops[0]} : {filteredOps:ops, autoOp:null}
}

function getDoorHardwareCfg(category, panelCount) {
  if (category==='sliding') {
    return {stdHandle:true,handleColorInt:true,handleColorExt:true,bifoldPanel:false,bifoldExt:false,bifoldInt:false,hingeInt:false,hingeExt:false}
  }
  if (category==='inswing_french') {
    return {stdHandle:true,handleColorInt:true,handleColorExt:true,bifoldPanel:false,bifoldExt:false,bifoldInt:false,hingeInt:true,hingeExt:false,hingeOpts:HARDWARE_COLORS}
  }
  if (category==='outswing_french') {
    return {stdHandle:true,handleColorInt:true,handleColorExt:true,bifoldPanel:false,bifoldExt:false,bifoldInt:false,hingeInt:false,hingeExt:true,hingeOpts:OUTSWING_HINGE_COLORS}
  }
  if (category==='bifold_uni') {
    const odd=panelCount%2===1
    return {stdHandle:odd,handleColorInt:odd,handleColorExt:odd,bifoldPanel:panelCount>=2,bifoldExt:true,bifoldInt:panelCount>=2,hingeInt:false,hingeExt:false}
  }
  if (category==='bifold_access') {
    return {stdHandle:true,handleColorInt:true,handleColorExt:true,bifoldPanel:true,bifoldExt:true,bifoldInt:true,hingeInt:false,hingeExt:false}
  }
  if (category==='bifold_bipart') {
    if (panelCount===2) return {stdHandle:true, handleColorInt:true, handleColorExt:true, bifoldPanel:false,bifoldExt:true, bifoldInt:false,hingeInt:false,hingeExt:false}
    if (panelCount===4) return {stdHandle:false,handleColorInt:false,handleColorExt:false,bifoldPanel:true, bifoldExt:true, bifoldInt:true, hingeInt:false,hingeExt:false}
    if (panelCount===6) return {stdHandle:true, handleColorInt:true, handleColorExt:true, bifoldPanel:true, bifoldExt:true, bifoldInt:true, hingeInt:false,hingeExt:false}
  }
  return {}
}

function getScreenCfg(category, panelCount) {
  if (category==='outswing_french') return {show:false}
  if (category==='sliding'||category==='inswing_french') return {show:true,always:true}
  const opts = panelCount===1
    ? ['No Screen','Single Retractable Pleated Screen Assembly']
    : ['No Screen','Single Retractable Pleated Screen Assembly','Double Retractable Pleated Screen Assembly']
  return {show:true,always:false,opts}
}

// ─── Window Style Data ────────────────────────────────────────────────────────

const MULTI_PANE_STYLES = ['Double Hung','Single Hung','Double Hung Bay']
const ROUND_TOP_WINDOW_STYLES = ['Half Circle','Extended Half Round','Eyebrow','Extended Eyebrow','Quarter Round','Extended Quarter Round','Quarter Eyebrow','Extended Quarter Eyebrow']

const WIN = {
  'Casement':               {wide:[1,2,3,4],mt:2,m:['w','h'],    pt:'cas', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:1,sm:1},
  'Picture':                {wide:[1,2,3,4],mt:2,m:['w','h'],    pt:'pic', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:0,sc:0,sm:0},
  'Awning':                 {wide:[1,2,3,4],mt:2,m:['w','h'],    pt:'awn', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:1,sm:1},
  'Double Hung':            {wide:[1,2,3,4],mt:2,m:['w','h'],    pt:'dh',  g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:0,sm:1},
  'Single Hung':            {wide:[1,2,3,4],mt:2,m:['w','h'],    pt:'sh',  g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:0,sm:1},
  'Slider':                 {wide:[1],       mt:2,m:['w','h'],    pt:'sld', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:0,sm:1},
  'Slider Triple Sash':     {wide:[1],       mt:2,m:['w','h'],    pt:'slt', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:0,sm:1,sash:1},
  'Bow':                    {wide:[4,5,6],   mt:1,m:['w','h'],    pt:'bow', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:1,sm:1},
  'Casement Bay':           {wide:[3],       mt:1,m:['w','h'],    pt:'cby', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:1,sm:1,bay:1},
  'Double Hung Bay':        {wide:[3],       mt:1,m:['w','h'],    pt:'dhb', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:1,sc:0,sm:1,bay:1},
  'Rectangle':              {wide:[1,2,3,4],mt:2,m:['w','h'],    pt:'pic', g:['GBG','SDL'],gp:STD_PATTERNS,  hw:0,sc:0,sm:0},
  'Right Triangle':         {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG'],     gp:RECT_PATTERNS, hw:0,sc:0,sm:0,facing:1},
  'Isosceles Triangle':     {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG'],     gp:RECT_PATTERNS, hw:0,sc:0,sm:0},
  'Trapezoid':              {wide:[1],       mt:2,m:['w','h','s'],pt:'none',g:['GBG'],     gp:RECT_PATTERNS, hw:0,sc:0,sm:0,facing:1},
  'Pentagon':               {wide:[1],       mt:2,m:['w','h','s'],pt:'none',g:['GBG'],     gp:RECT_PATTERNS, hw:0,sc:0,sm:0},
  'Hexagon':                {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG'],     gp:RECT_PATTERNS, hw:0,sc:0,sm:0},
  'Octagon':                {wide:[1],       mt:2,m:['w'],        pt:'none',g:['GBG'],     gp:RECT_PATTERNS, hw:0,sc:0,sm:0},
  'Half Circle':            {wide:[1],       mt:2,m:['w'],        pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0},
  'Extended Half Round':    {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0,sunburst:1},
  'Eyebrow':                {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0},
  'Extended Eyebrow':       {wide:[1],       mt:2,m:['w','h','s'],pt:'none',g:['GBG','SDL'],gp:RECT_PATTERNS, hw:0,sc:0,sm:0},
  'Quarter Round':          {wide:[1],       mt:2,m:['w'],        pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0,facing:1},
  'Extended Quarter Round': {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0,facing:1},
  'Quarter Eyebrow':        {wide:[1],       mt:2,m:['w','h'],    pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0,facing:1},
  'Extended Quarter Eyebrow':{wide:[1],      mt:2,m:['w','h','s'],pt:'none',g:['GBG','SDL'],gp:RECT_PATTERNS, hw:0,sc:0,sm:0,facing:1},
  'Full Circle':            {wide:[1],       mt:2,m:['wo'],       pt:'none',g:['GBG','SDL'],gp:ROUND_PATTERNS,hw:0,sc:0,sm:0},
}
const WINDOW_STYLE_GROUPS = [
  {label:'Standard',     styles:['Casement','Picture','Awning','Double Hung','Single Hung','Slider','Slider Triple Sash','Bow','Casement Bay','Double Hung Bay']},
  {label:'Special Shape',styles:['Rectangle','Right Triangle','Isosceles Triangle','Trapezoid','Pentagon','Hexagon','Octagon']},
  {label:'Round Top',    styles:['Half Circle','Extended Half Round','Eyebrow','Extended Eyebrow','Quarter Round','Extended Quarter Round','Quarter Eyebrow','Extended Quarter Eyebrow','Full Circle']},
]
function getPanelNames(n){const m={2:['Left','Right'],3:['Left','Center','Right'],4:['Left','Lft-Ctr','Rgt-Ctr','Right'],5:['Left','L-Ctr','Ctr','R-Ctr','Right'],6:['Left','L-Ctr','CL','CR','R-Ctr','Right']};return m[n]||Array.from({length:n},(_,i)=>`Panel ${i+1}`)}
function getPanelConfig(pt,wide){
  if(!pt||pt==='none'||pt==='pic')return null
  if(pt==='cas'||pt==='cby'){if(wide===1)return{type:'single',options:['Left','Right']};const s={2:'Left | Right',3:'Left | Stationary | Right',4:'Left | Stationary | Stationary | Right'};return{type:'multi',standard:s[wide]||'',panelOptions:['Left','Right','Fixed'],panels:wide}}
  if(pt==='bow'){if(wide<4)return null;return{type:'multi',standard:`Left | ${Array(wide-2).fill('Stationary').join(' | ')} | Right`,panelOptions:['Left','Right','Fixed'],panels:wide}}
  if(pt==='awn'){if(wide===1)return null;return{type:'multi',standard:Array(wide).fill('Awning').join(' | '),panelOptions:['Awning','Awning Picture'],panels:wide}}
  if(pt==='dh'){if(wide===1)return null;return{type:'multi',standard:Array(wide).fill('DH').join(' | '),panelOptions:['Double Hung','Double Hung Picture'],panels:wide}}
  if(pt==='sh'){if(wide===1)return null;return{type:'multi',standard:Array(wide).fill('SH').join(' | '),panelOptions:['Single Hung','Single Hung Picture'],panels:wide}}
  if(pt==='sld')return{type:'single',options:['XO','OX']}
  if(pt==='slt')return{type:'fixed',value:'XOX'}
  if(pt==='dhb')return{type:'multi',standardOptions:['DH | DH | DH','DH | Picture | DH'],panelOptions:['Double Hung','Fixed'],panels:3}
  return null
}
function getTopOptions(base){return['Double Hung','Single Hung'].includes(base)?['Picture',...ROUND_TOP_WINDOW_STYLES]:['Casement','Picture','Awning',...ROUND_TOP_WINDOW_STYLES]}
function getTopWinMeasurements(style){
  if(!style)return{m:[],facing:false}
  const facing=['Quarter Round','Extended Quarter Round','Quarter Eyebrow','Extended Quarter Eyebrow'].includes(style)
  if(['Half Circle','Quarter Round'].includes(style))return{m:['w'],facing}
  if(['Extended Eyebrow','Extended Quarter Eyebrow'].includes(style))return{m:['w','h','s'],facing}
  return{m:['w','h'],facing}
}

// ─── Image Maps ───────────────────────────────────────────────────────────────

const _hw = (name) => `/images/door-hardware/${name}`
const _hc_i = (slug) => `/images/door-hardware/handle-int-${slug}.png`
const _hc_e = (slug) => `/images/door-hardware/handle-ext-${slug}.png`
const HW_SLUGS = {'Satin Taupe':'satin-taupe','Sierra':'sierra','White':'white','Matte Black':'matte-black','Oil Rubbed Bronze':'oil-rubbed-bronze','Satin Nickel':'satin-nickel','Brushed Chrome':'brushed-chrome','Antique Brass':'antique-brass','Brass':'brass'}
const OS_SLUGS = {...HW_SLUGS,'Pebble Gray':'pebble-gray','Cashmere':'cashmere'}
function makeColorMap(slugMap, fn) { return Object.fromEntries(Object.entries(slugMap).map(([k,v])=>[k,fn(v)])) }

const IMG = {
  windows:{
    'Casement':'/images/windows/casement.png','Picture':'/images/windows/picture.png','Awning':'/images/windows/awning.png',
    'Double Hung':'/images/windows/double-hung.png','Single Hung':'/images/windows/single-hung.png',
    'Slider':'/images/windows/slider.png','Slider Triple Sash':'/images/windows/slider-triple-sash.png',
    'Bow':'/images/windows/bow.png','Casement Bay':'/images/windows/casement-bay.png','Double Hung Bay':'/images/windows/double-hung-bay.png',
    'Rectangle':'/images/windows/rectangle.png','Right Triangle':'/images/windows/right-triangle.png',
    'Isosceles Triangle':'/images/windows/isosceles-triangle.png','Trapezoid':'/images/windows/trapezoid.png',
    'Pentagon':'/images/windows/pentagon.png','Hexagon':'/images/windows/hexagon.png','Octagon':'/images/windows/octagon.png',
    'Half Circle':'/images/windows/half-circle.png','Extended Half Round':'/images/windows/extended-half-round.png',
    'Eyebrow':'/images/windows/eyebrow.png','Extended Eyebrow':'/images/windows/extended-eyebrow.png',
    'Quarter Round':'/images/windows/quarter-round.png','Extended Quarter Round':'/images/windows/extended-quarter-round.png',
    'Quarter Eyebrow':'/images/windows/quarter-eyebrow.png','Extended Quarter Eyebrow':'/images/windows/extended-quarter-eyebrow.png',
    'Full Circle':'/images/windows/full-circle.png',
  },
  doors:{
    '2 Panel Sliding Patio Door':'/images/doors/sliding-patio-2.png',
    '3 Panel Sliding Patio Door':'/images/doors/sliding-patio-3.png',
    '4 Panel Sliding Patio Door':'/images/doors/sliding-patio-4.png',
    '2 Panel Sliding French Door':'/images/doors/sliding-french-2.png',
    '3 Panel Sliding French Door':'/images/doors/sliding-french-3.png',
    '4 Panel Sliding French Door':'/images/doors/sliding-french-4.png',
    'Inswing French Door':'/images/doors/inswing-1.png',
    '2 Panel Inswing French Door':'/images/doors/inswing-2.png',
    '3 Panel Inswing French Door':'/images/doors/inswing-3.png',
    'Outswing French Door':'/images/doors/outswing-1.png',
    '2 Panel Outswing French Door':'/images/doors/outswing-2.png',
    '3 Panel Outswing French Door':'/images/doors/outswing-3.png',
    'Unidirectional Bi-Fold Door':'/images/doors/bifold-uni.png',
    'Unidirectional Bi-Fold w/Access Panel':'/images/doors/bifold-access.png',
    'Bi-Parting Bi-Fold Door':'/images/doors/bifold-bipart.png',
  },
  doorConfigs:{
    'sliding-patio':{
      'OX':'/images/door-configs/sliding-patio-2-ox.png',
      'XO':'/images/door-configs/sliding-patio-2-xo.png',
      'OOX':'/images/door-configs/sliding-patio-3-oox.png',
      'XOO':'/images/door-configs/sliding-patio-3-xoo.png',
      'OXO':'/images/door-configs/sliding-patio-3-oxo.png',
    },
    'sliding-french':{
      'OX':'/images/door-configs/sliding-french-2-ox.png',
      'XO':'/images/door-configs/sliding-french-2-xo.png',
      'OOX':'/images/door-configs/sliding-french-3-oox.png',
      'XOO':'/images/door-configs/sliding-french-3-xoo.png',
      'OXO':'/images/door-configs/sliding-french-3-oxo.png',
    },
    'inswing':{
      'OX':'/images/door-configs/inswing-2-ox.png',
      'XO':'/images/door-configs/inswing-2-xo.png',
      'XX':'/images/door-configs/inswing-2-xx.png',
      'OOX':'/images/door-configs/inswing-3-oox.png',
      'XOO':'/images/door-configs/inswing-3-xoo.png',
      'OXO':'/images/door-configs/inswing-3-oxo.png',
      'OXX':'/images/door-configs/inswing-3-oxx.png',
      'XXO':'/images/door-configs/inswing-3-xxo.png',
    },
    'outswing':{
      'OX':'/images/door-configs/outswing-2-ox.png',
      'XO':'/images/door-configs/outswing-2-xo.png',
      'XX':'/images/door-configs/outswing-2-xx.png',
    },
    'bifold-uni':{
      '1L':'/images/door-configs/bifold-uni-1l.png','1R':'/images/door-configs/bifold-uni-1r.png',
      '2L':'/images/door-configs/bifold-uni-2l.png','2R':'/images/door-configs/bifold-uni-2r.png',
      '3L':'/images/door-configs/bifold-uni-3l.png','3R':'/images/door-configs/bifold-uni-3r.png',
      '4L':'/images/door-configs/bifold-uni-4l.png','4R':'/images/door-configs/bifold-uni-4r.png',
      '5L':'/images/door-configs/bifold-uni-5l.png','5R':'/images/door-configs/bifold-uni-5r.png',
      '6L':'/images/door-configs/bifold-uni-6l.png','6R':'/images/door-configs/bifold-uni-6r.png',
      '7L':'/images/door-configs/bifold-uni-7l.png','7R':'/images/door-configs/bifold-uni-7r.png',
    },
    'bifold-access':{
      '2L1R':'/images/door-configs/bifold-access-2l1r.png','1L2R':'/images/door-configs/bifold-access-1l2r.png',
      '3L1R':'/images/door-configs/bifold-access-3l1r.png','1L3R':'/images/door-configs/bifold-access-1l3r.png',
      '4L1R':'/images/door-configs/bifold-access-4l1r.png','1L4R':'/images/door-configs/bifold-access-1l4r.png',
      '5L1R':'/images/door-configs/bifold-access-5l1r.png','1L5R':'/images/door-configs/bifold-access-1l5r.png',
      '6L1R':'/images/door-configs/bifold-access-6l1r.png','1L6R':'/images/door-configs/bifold-access-1l6r.png',
    },
    'bifold-bipart':{
      '1L1R':'/images/door-configs/bifold-bipart-1l1r.png',
      '2L2R':'/images/door-configs/bifold-bipart-2l2r.png',
      '3L3R':'/images/door-configs/bifold-bipart-3l3r.png',
    },
  },
  handingImgs:{
    'sliding-patio-3-oxo-left':   '/images/door-configs/sliding-patio-3-oxo-left.png',
    'sliding-patio-3-oxo-right':  '/images/door-configs/sliding-patio-3-oxo-right.png',
    'sliding-patio-4-oxxo-left':  '/images/door-configs/sliding-patio-4-oxxo-left.png',
    'sliding-patio-4-oxxo-right': '/images/door-configs/sliding-patio-4-oxxo-right.png',
    'sliding-french-3-oxo-left':   '/images/door-configs/sliding-french-3-oxo-left.png',
    'sliding-french-3-oxo-right':  '/images/door-configs/sliding-french-3-oxo-right.png',
    'sliding-french-4-oxxo-left':  '/images/door-configs/sliding-french-4-oxxo-left.png',
    'sliding-french-4-oxxo-right': '/images/door-configs/sliding-french-4-oxxo-right.png',
    'inswing-1-x-left':   '/images/door-configs/inswing-1-x-left.png',
    'inswing-1-x-right':  '/images/door-configs/inswing-1-x-right.png',
    'inswing-2-ox-left':  '/images/door-configs/inswing-2-ox-left.png',
    'inswing-2-ox-right': '/images/door-configs/inswing-2-ox-right.png',
    'inswing-2-xo-left':  '/images/door-configs/inswing-2-xo-left.png',
    'inswing-2-xo-right': '/images/door-configs/inswing-2-xo-right.png',
    'inswing-2-xx-left':  '/images/door-configs/inswing-2-xx-left.png',
    'inswing-2-xx-right': '/images/door-configs/inswing-2-xx-right.png',
    'inswing-3-oox-left':  '/images/door-configs/inswing-3-oox-left.png',
    'inswing-3-oox-right': '/images/door-configs/inswing-3-oox-right.png',
    'inswing-3-xoo-left':  '/images/door-configs/inswing-3-xoo-left.png',
    'inswing-3-xoo-right': '/images/door-configs/inswing-3-xoo-right.png',
    'inswing-3-oxo-left':  '/images/door-configs/inswing-3-oxo-left.png',
    'inswing-3-oxo-right': '/images/door-configs/inswing-3-oxo-right.png',
    'inswing-3-oxx-left':  '/images/door-configs/inswing-3-oxx-left.png',
    'inswing-3-oxx-right': '/images/door-configs/inswing-3-oxx-right.png',
    'inswing-3-xxo-left':  '/images/door-configs/inswing-3-xxo-left.png',
    'inswing-3-xxo-right': '/images/door-configs/inswing-3-xxo-right.png',
    'outswing-1-x-left':   '/images/door-configs/outswing-1-x-left.png',
    'outswing-1-x-right':  '/images/door-configs/outswing-1-x-right.png',
    'outswing-2-ox-left':  '/images/door-configs/outswing-2-ox-left.png',
    'outswing-2-ox-right': '/images/door-configs/outswing-2-ox-right.png',
    'outswing-2-xo-left':  '/images/door-configs/outswing-2-xo-left.png',
    'outswing-2-xo-right': '/images/door-configs/outswing-2-xo-right.png',
    'outswing-2-xx-left':  '/images/door-configs/outswing-2-xx-left.png',
    'outswing-2-xx-right': '/images/door-configs/outswing-2-xx-right.png',
    'outswing-3-oxo-left':  '/images/door-configs/outswing-3-oxo-left.png',
    'outswing-3-oxo-right': '/images/door-configs/outswing-3-oxo-right.png',
  },
  doorHandleSliding:{'Cambridge':_hw('sliding-cambridge.png'),'Northfield':_hw('sliding-northfield.png')},
  doorHandleFrench: {'Cambridge':_hw('french-cambridge.png'),'Northfield':_hw('french-northfield.png')},
  doorHandleColorInt: makeColorMap(HW_SLUGS, _hc_i),
  doorHandleColorExt: makeColorMap(HW_SLUGS, _hc_e),
  hingeInswingInt: makeColorMap(HW_SLUGS, _hc_i),
  hingeOutswingInt: makeColorMap(HW_SLUGS, _hc_i),
  hingeOutswingExt: {
    ...makeColorMap(HW_SLUGS, _hc_e),
    'Pebble Gray': _hw('hinge-outswing-ext-pebble-gray.png'),
    'Cashmere':    _hw('hinge-outswing-ext-cashmere.png'),
  },
  bifoldExtHinge: {'Black':_hw('bifold-ext-hinge-black.png'),'Brushed Stainless':_hw('bifold-ext-hinge-brushed-stainless.png')},
  bifoldIntHinge: {'Black':_hw('bifold-int-hinge-black.png'),'Brushed Stainless':_hw('bifold-int-hinge-brushed-stainless.png')},
  bifoldPanelHandle: {'Black':_hw('bifold-panel-handle-black.png'),'Brushed Stainless':_hw('bifold-panel-handle-brushed-stainless.png')},
  facing:{
    'Right Triangle':{'Left':'/images/facing/right-triangle-left.png','Right':'/images/facing/right-triangle-right.png'},
    'Trapezoid':{'Left':'/images/facing/trapezoid-left.png','Right':'/images/facing/trapezoid-right.png'},
    'Quarter Round':{'Left':'/images/facing/quarter-round-left.png','Right':'/images/facing/quarter-round-right.png'},
    'Extended Quarter Round':{'Left':'/images/facing/extended-quarter-round-left.png','Right':'/images/facing/extended-quarter-round-right.png'},
    'Quarter Eyebrow':{'Left':'/images/facing/quarter-eyebrow-left.png','Right':'/images/facing/quarter-eyebrow-right.png'},
    'Extended Quarter Eyebrow':{'Left':'/images/facing/extended-quarter-eyebrow-left.png','Right':'/images/facing/extended-quarter-eyebrow-right.png'},
    'Casement':{'Left':'/images/facing/casement-left.png','Right':'/images/facing/casement-right.png'},
    'Slider':{'XO':'/images/facing/slider-xo.png','OX':'/images/facing/slider-ox.png'},
  },
  exteriorColor:{'Stone White':'/images/colors/ext-stone-white.jpg','Pebble Gray':'/images/colors/ext-pebble-gray.jpg','Sierra':'/images/colors/ext-sierra.jpg','Bronze':'/images/colors/ext-bronze.jpg','Cashmere':'/images/colors/ext-cashmere.jpg','Bahama Brown':'/images/colors/ext-bahama-brown.jpg','Ebony':'/images/colors/ext-ebony.jpg'},
  interiorColor:{'Stone White':'/images/colors/int-stone-white.jpg','EverWood Pine':'/images/colors/int-everwood-pine.jpg','Sierra':'/images/colors/int-sierra.jpg','Bronze':'/images/colors/int-bronze.jpg','Ebony':'/images/colors/int-ebony.jpg'},
  glassSurface:{'Clear':'/images/glass/clear.png','Low E1':'/images/glass/low-e1.png','Low E2':'/images/glass/low-e2.png','Low E3':'/images/glass/low-e3.png','Low E2/ERS':'/images/glass/low-e2-ers.png','Low E3/ERS':'/images/glass/low-e3-ers.png','Low E2/E1':'/images/glass/low-e2-e1.png','Low E3/E1':'/images/glass/low-e3-e1.png','Low E2/E1/ERS':'/images/glass/low-e2-e1-ers.png','Low E3/E1/ERS':'/images/glass/low-e3-e1-ers.png'},
  decorativeGlass:{'Obscure':'/images/glass/deco-obscure.jpg','Glue Chip':'/images/glass/deco-glue-chip.jpg','Rain':'/images/glass/deco-rain.jpg','Reed':'/images/glass/deco-reed.jpg','Narrow Reed':'/images/glass/deco-narrow-reed.jpg','Frost':'/images/glass/deco-frost.jpg'},
  grilleType:{'GBG':'/images/grille/gbg.png','SDL':'/images/grille/sdl.png'},
  grillePattern:{'Rectangular':'/images/grille/pattern-rectangular.png','Prairie':'/images/grille/pattern-prairie.png','Checkrail':'/images/grille/pattern-checkrail.png','Cottage':'/images/grille/pattern-cottage.png','Oriel':'/images/grille/pattern-oriel.png','Sunburst':'/images/grille/pattern-sunburst.png'},
  hardwareColor:{'Satin Taupe':'/images/hardware/satin-taupe.png','Sierra':'/images/hardware/sierra.png','White':'/images/hardware/white.png','Matte Black':'/images/hardware/matte-black.png','Oil Rubbed Bronze':'/images/hardware/oil-rubbed-bronze.png','Satin Nickel':'/images/hardware/satin-nickel.png','Brushed Chrome':'/images/hardware/brushed-chrome.png','Antique Brass':'/images/hardware/antique-brass.png','Brass':'/images/hardware/brass.png'},
  screenColor:{'Stone White':'/images/screen/stone-white.png','EverWood Pine':'/images/screen/everwood-pine.png','Satin Taupe':'/images/screen/satin-taupe.png','Sierra':'/images/screen/sierra.png','Bronze':'/images/screen/bronze.png','Ebony':'/images/screen/ebony.png'},
  screenMesh:{'Bright View Mesh':'/images/screen/bright-view-mesh.png','Charcoal Hi-Transparency Fiberglass Mesh':'/images/screen/charcoal-mesh.png'},
  casingStyle:{'Ranch':'/images/casing/ranch.png','Colonial':'/images/casing/colonial.png'},
}

// ─── Carry-Over: which fields transfer from the previous item ─────────────────
// These are the "options" fields — colors, glass, hardware, screen, casing.
// Style, dimensions, configuration, handing, qty, photos, notes, siding flags are NOT carried.

const WINDOW_CARRY_FIELDS = [
  'exteriorColor','interiorColor','pane','glassSurface','tempered','decorativeGlass',
  'grilleType','grillePattern','simulatedRail','grillePaneApplication',
  'topPaneGrillePattern','bottomPaneGrillePattern',
  'hardwareColor','screenColor','screenMesh',
  'jambDepth','jambDepthFrac','jambType','jambTypeOther',
  'casingWidth','casingWidthFrac','casingType','casingTypeOther','casingStyle','lpTrimColor',
]

const DOOR_CARRY_FIELDS = [
  'exteriorColor','interiorColor','glassSurface','decorativeGlass',
  'grilleType','grillePattern',
  'handleStyle','handleColorInt','handleColorExt',
  'hingeColorInt','hingeColorExt',
  'bifoldPanelHandleColor','bifoldExtHingeColor','bifoldIntHingeColor',
  'screenMesh',
  'jambDepth','jambDepthFrac','jambType','jambTypeOther',
  'casingWidth','casingWidthFrac','casingType','casingTypeOther','casingStyle','lpTrimColor',
]

function extractCarryFields(item, fields) {
  const out = { itemType: item.itemType }  // always carry itemType for banner label
  fields.forEach(f => { if (item[f] !== undefined) out[f] = item[f] })
  return out
}

// ─── Carry-Over Banner Component ──────────────────────────────────────────────

function CarryOverBanner({ prevItem, onApply, onDismiss }) {
  const isWindow = prevItem.itemType !== 'door'

  // Build a comprehensive list of chips from all meaningful non-default filled values.
  // Skips size/dimension fields and structural fields — only "options" the user chose.
  const chips = []

  // Colors
  if (prevItem.exteriorColor) chips.push({ label: 'Ext Color', value: prevItem.exteriorColor })
  if (prevItem.interiorColor)  chips.push({ label: 'Int Color', value: prevItem.interiorColor })

  // Pane (window only — only show if non-default Triple)
  if (isWindow && prevItem.pane && prevItem.pane !== 'Double') chips.push({ label: 'Pane', value: prevItem.pane })

  // Glass
  if (prevItem.glassSurface) chips.push({ label: 'Glass', value: prevItem.glassSurface })

  // Tempered (window only — only if Yes)
  if (isWindow && prevItem.tempered === 'Yes') chips.push({ label: 'Tempered', value: 'Yes' })

  // Decorative glass (only if not None)
  if (prevItem.decorativeGlass && prevItem.decorativeGlass !== 'None') chips.push({ label: 'Deco Glass', value: prevItem.decorativeGlass })

  // Grille
  if (prevItem.grilleType) {
    const gVal = prevItem.grillePattern ? `${prevItem.grilleType} · ${prevItem.grillePattern}` : prevItem.grilleType
    chips.push({ label: 'Grille', value: gVal })
  }
  if (prevItem.simulatedRail) chips.push({ label: 'Sim. Rail', value: prevItem.simulatedRail })

  // Hardware (window)
  if (isWindow && prevItem.hardwareColor) chips.push({ label: 'Hardware', value: prevItem.hardwareColor })
  if (isWindow && prevItem.screenColor)   chips.push({ label: 'Screen Color', value: prevItem.screenColor })

  // Screen mesh
  if (prevItem.screenMesh) chips.push({ label: 'Screen Mesh', value: prevItem.screenMesh === 'Bright View Mesh' ? 'Bright View' : 'Charcoal Mesh' })

  // Door hardware
  if (!isWindow) {
    if (prevItem.handleStyle && prevItem.handleStyle !== 'Cambridge') chips.push({ label: 'Handle', value: prevItem.handleStyle })
    if (prevItem.handleColorExt) chips.push({ label: 'Ext Handle', value: prevItem.handleColorExt })
    if (prevItem.handleColorInt) chips.push({ label: 'Int Handle', value: prevItem.handleColorInt })
    if (prevItem.hingeColorInt) chips.push({ label: 'Int Hinge', value: prevItem.hingeColorInt })
    if (prevItem.hingeColorExt) chips.push({ label: 'Ext Hinge', value: prevItem.hingeColorExt })
    if (prevItem.bifoldExtHingeColor) chips.push({ label: 'BiFold Ext Hinge', value: prevItem.bifoldExtHingeColor })
    if (prevItem.bifoldIntHingeColor) chips.push({ label: 'BiFold Int Hinge', value: prevItem.bifoldIntHingeColor })
    if (prevItem.bifoldPanelHandleColor) chips.push({ label: 'Panel Handle', value: prevItem.bifoldPanelHandleColor })
  }

  // Jamb & Casing
  if (prevItem.jambDepth) chips.push({ label: 'Jamb Depth', value: fmtMeasurement(prevItem.jambDepth, prevItem.jambDepthFrac) })
  if (prevItem.jambType)  chips.push({ label: 'Jamb Type', value: prevItem.jambType === 'Other' ? (prevItem.jambTypeOther || 'Other') : prevItem.jambType })
  if (prevItem.casingWidth) chips.push({ label: 'Casing Width', value: fmtMeasurement(prevItem.casingWidth, prevItem.casingWidthFrac) })
  if (prevItem.casingType)  chips.push({ label: 'Casing Type', value: prevItem.casingType === 'Other' ? (prevItem.casingTypeOther || 'Other') : prevItem.casingType })
  if (prevItem.casingStyle) chips.push({ label: 'Casing Style', value: prevItem.casingStyle })
  if (prevItem.lpTrimColor) chips.push({ label: 'LP Trim', value: prevItem.lpTrimColor })

  const ORANGE = '#e8622a'
  const CHARCOAL = '#1e2432'
  const BLUE = '#4a90d9'

  return (
    <div style={{
      gridColumn: '1/-1',
      marginBottom: 16,
      borderRadius: 10,
      overflow: 'hidden',
      border: `1.5px solid rgba(232,98,42,0.45)`,
      boxShadow: '0 2px 12px rgba(232,98,42,0.10)',
    }}>
      {/* Header bar */}
      <div style={{
        background: `linear-gradient(135deg, rgba(232,98,42,0.10) 0%, rgba(232,98,42,0.03) 100%)`,
        borderBottom: '1px solid rgba(232,98,42,0.18)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>🎨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12, color: ORANGE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Copy Options from Previous {isWindow ? 'Window' : 'Door'}?
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Colors, glass, hardware, screen &amp; casing — adjust anything after.
          </div>
        </div>
      </div>

      {/* Preview chips */}
      <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.03)' }}>
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {chips.map((c, i) => (
              <span key={i} style={{
                background: 'var(--surface)',
                border: `1px solid rgba(74,144,217,0.3)`,
                borderRadius: 20,
                padding: '3px 9px',
                fontSize: 11,
                color: CHARCOAL,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{ color: BLUE, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{c.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onApply}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 6,
              border: `1.5px solid ${ORANGE}`,
              background: ORANGE,
              color: '#fff',
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            ✓ Yes, Copy Options
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: '9px 14px',
              borderRadius: 6,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = CHARCOAL; e.currentTarget.style.color = CHARCOAL }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            No, Start Fresh
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function SelectWithPreview({label,value,onChange,opts,imgMap,placeholder}) {
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const selImg=imgMap?.[value]
  return(
    <div style={{marginBottom:12,position:'relative'}} ref={ref}>
      {label&&<label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{label}</label>}
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)',border:'1.5px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderRadius:6,cursor:'pointer',minHeight:52}}>
        {value?(<>{selImg&&<img src={selImg} alt={value} style={{width:60,height:48,objectFit:'contain',borderRadius:3,flexShrink:0}}/>}<span style={{flex:1,fontSize:15,color:'var(--text)'}}>{value}</span></>):<span style={{flex:1,fontSize:15,color:'var(--text-muted)'}}>{placeholder||'Select...'}</span>}
        <span style={{color:'var(--red)',fontSize:12}}>{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:300,background:'var(--surface)',border:'1.5px solid var(--red)',borderRadius:8,marginTop:4,maxHeight:320,overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
          {opts.map(opt=>{const img=imgMap?.[opt],sel=value===opt;return(
            <div key={opt} onClick={()=>{onChange(opt);setOpen(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',cursor:'pointer',background:sel?'rgba(192,57,43,0.12)':'transparent',borderLeft:sel?'3px solid var(--red)':'3px solid transparent'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,0.06)'} onMouseLeave={e=>e.currentTarget.style.background=sel?'rgba(192,57,43,0.12)':'transparent'}>
              {img?<img src={img} alt={opt} style={{width:80,height:64,objectFit:'contain',borderRadius:4,flexShrink:0}}/>:<div style={{width:64,height:52,background:'var(--bg-mid)',borderRadius:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:9,color:'var(--text-muted)',textAlign:'center',padding:'0 4px'}}>{opt}</span></div>}
              <span style={{fontSize:15,color:sel?'var(--red)':'var(--text)',fontWeight:sel?600:400}}>{opt}</span>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function ImagePicker({label,value,onChange,groups}) {
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const imgMap=groups?Object.fromEntries(groups.flatMap(g=>g.styles.map(s=>[s,IMG.windows[s]]))):{}
  const selImg=imgMap[value]
  const renderOpt=(opt)=>{const img=imgMap[opt],sel=value===opt;return(
    <div key={opt} onClick={()=>{onChange(opt);setOpen(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',cursor:'pointer',background:sel?'rgba(192,57,43,0.12)':'transparent',borderLeft:sel?'3px solid var(--red)':'3px solid transparent'}}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,0.06)'} onMouseLeave={e=>e.currentTarget.style.background=sel?'rgba(192,57,43,0.12)':'transparent'}>
      {img?<img src={img} alt={opt} style={{width:80,height:64,objectFit:'contain',borderRadius:4,flexShrink:0}}/>:<div style={{width:44,height:36,background:'var(--bg-card)',borderRadius:4,flexShrink:0}}/>}
      <span style={{fontSize:15,color:sel?'var(--red)':'var(--text)',fontWeight:sel?600:400}}>{opt}</span>
    </div>
  )}
  return(
    <div style={{marginBottom:12,position:'relative'}} ref={ref}>
      {label&&<label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{label}</label>}
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)',border:'1.5px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderRadius:6,cursor:'pointer',minHeight:52}}>
        {value?(<>{selImg&&<img src={selImg} alt={value} style={{width:60,height:48,objectFit:'contain',borderRadius:3,flexShrink:0}}/>}<span style={{flex:1,fontSize:15,color:'var(--text)'}}>{value}</span></>):<span style={{flex:1,fontSize:15,color:'var(--text-muted)'}}>Select style...</span>}
        <span style={{color:'var(--red)',fontSize:12}}>{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:300,background:'var(--surface)',border:'1.5px solid var(--red)',borderRadius:8,marginTop:4,maxHeight:360,overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
          {groups.map(g=>(
            <div key={g.label}>
              <div style={{padding:'8px 12px 4px',fontSize:10,fontWeight:700,color:'var(--red)',letterSpacing:'0.1em',textTransform:'uppercase',borderBottom:'1px solid rgba(192,57,43,0.2)'}}>{g.label}</div>
              {g.styles.map(opt=>renderOpt(opt))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({label,children,col}) {
  return(
    <div style={{marginBottom:12,gridColumn:col}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{label}</label>
      {children}
    </div>
  )
}
function SectionHeader({children}) {
  return <div style={{gridColumn:'1/-1',fontFamily:'var(--font-head)',fontSize:12,fontWeight:700,color:'var(--red)',letterSpacing:'0.1em',textTransform:'uppercase',borderBottom:'1px solid rgba(192,57,43,0.25)',paddingBottom:6,marginTop:8,marginBottom:4}}>{children}</div>
}
function MeasurementInput({value,frac,onValue,onFrac,placeholder}) {
  return(
    <div style={{display:'flex',gap:6}}>
      <input type="number" step="1" placeholder={placeholder||'e.g. 36'} value={value} onChange={e=>onValue(e.target.value)} style={{flex:2}}/>
      <select value={frac||''} onChange={e=>onFrac(e.target.value)} style={{flex:1,fontSize:13}}>{FRACTIONS.map(f=><option key={f} value={f}>{f||'+'}</option>)}</select>
    </div>
  )
}
function CallSizePicker({label,value,onChange,widthKey}) {
  const data=widthKey?CALL_WIDTH_DATA[widthKey]:null
  const opts=data?Object.keys(data).map(Number):[]
  const sel=value&&data?data[value]:null
  return(
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{label}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value?Number(e.target.value):'')}>
        <option value="">Select call size...</option>
        {opts.map(n=>{const d=data[n];return<option key={n} value={n}>{n} — Frame: {d.frame} · RO: {d.ro}</option>})}
      </select>
      {sel&&<div style={{marginTop:6,padding:'7px 12px',background:'rgba(74,144,217,0.08)',border:'1px solid rgba(74,144,217,0.25)',borderRadius:6,fontSize:12,color:'var(--text-muted)'}}>Frame: <strong style={{color:'var(--text)'}}>{sel.frame}</strong> &nbsp;·&nbsp; RO: <strong style={{color:'var(--text)'}}>{sel.ro}</strong></div>}
    </div>
  )
}
function CallHeightPicker({label,value,onChange,heightKey}) {
  const data=CALL_HEIGHT_DATA[heightKey]||{}
  const opts=Object.keys(data).map(Number)
  const sel=value?data[value]:null
  return(
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{label}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value?Number(e.target.value):'')}>
        <option value="">Select call size...</option>
        {opts.map(n=>{const d=data[n];return<option key={n} value={n}>{n} — Frame: {d.frame} · RO: {d.ro}</option>})}
      </select>
      {sel&&<div style={{marginTop:6,padding:'7px 12px',background:'rgba(74,144,217,0.08)',border:'1px solid rgba(74,144,217,0.25)',borderRadius:6,fontSize:12,color:'var(--text-muted)'}}>Frame: <strong style={{color:'var(--text)'}}>{sel.frame}</strong> &nbsp;·&nbsp; RO: <strong style={{color:'var(--text)'}}>{sel.ro}</strong></div>}
    </div>
  )
}

function ToggleRow({label,value,onChange,options,labelFn}) {
  return(
    <div style={{marginBottom:12}}>
      {label&&<label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>{label}</label>}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {options.map(opt=>{
          const sel=value===opt
          const lbl=labelFn?labelFn(opt):String(opt)
          return(
            <button key={opt} type="button" onClick={()=>onChange(opt)}
              style={{padding:'8px 18px',borderRadius:6,border:`1.5px solid ${sel?'var(--red)':'var(--border)'}`,background:sel?'rgba(192,57,43,0.08)':'transparent',color:sel?'var(--red)':'var(--text-muted)',fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,letterSpacing:'0.04em',cursor:'pointer',transition:'all 0.12s'}}>
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Summarizers ──────────────────────────────────────────────────────────────

function summarizeWindow(w) {
  const p=[]
  if(w.insert)p.push('INSERT')
  if(w.numberWide>1)p.push(`${w.numberWide} Wide`)
  if(w.facing)p.push(w.facing)
  if(w.sashSplit)p.push(`Sash:${w.sashSplit}`)
  if(w.configuration)p.push(w.configuration)
  if(w.measurementType)p.push(w.measurementType)
  if(w.width)p.push(`W:${fmtMeasurement(w.width,w.widthFrac)}`)
  if(w.height&&w.numberHigh!==2)p.push(`H:${fmtMeasurement(w.height,w.heightFrac)}`)
  if(w.widthOrHeight)p.push(fmtMeasurement(w.widthOrHeight,w.widthOrHeightFrac))
  if(w.exteriorColor)p.push(`Ext:${w.exteriorColor}`)
  if(w.interiorColor)p.push(`Int:${w.interiorColor}`)
  if(w.pane)p.push(w.pane+' Pane')
  if(w.glassSurface)p.push(w.glassSurface)
  if(w.tempered==='Yes')p.push('Tempered')
  if(w.decorativeGlass&&w.decorativeGlass!=='None')p.push(w.decorativeGlass)
  if(w.grilleType)p.push(w.grilleType)
  if(w.grillePattern)p.push(w.grillePattern)
  if(w.hardwareColor)p.push(`HW:${w.hardwareColor}`)
  if(w.numberHigh===2&&w.topStyle)p.push(`Top:${w.topStyle}`)
  if(w.jambDepth)p.push(`Jamb:${fmtMeasurement(w.jambDepth,w.jambDepthFrac)}`)
  if(w.casingStyle)p.push(w.casingStyle)
  if(w.lpTrimColor)p.push(`LP:${w.lpTrimColor}`)
  if(w.cutSiding)p.push('Cut Siding')
  if(w.takeDownSiding)p.push('Take Down Siding')
  return p.join(' · ')
}

function summarizeDoor(d) {
  const p=[]
  if(d.panelCount)p.push(`${d.panelCount}P`)
  if(d.configuration)p.push(d.configuration)
  if(d.handing)p.push(d.handing)
  if(d.measurementType==='Call Size'||!d.measurementType) {
    const dtc=DOOR_TYPE_CONFIG[d.style]
    const wk=d.bifoldWidthKey||dtc?.widthKey
    if(d.callWidth&&wk){const wd=CALL_WIDTH_DATA[wk]?.[d.callWidth];p.push(wd?`CW${d.callWidth}(${wd.frame})`:`CW${d.callWidth}`)}
    if(d.callHeight){const hk=dtc?.heightKey||'h_french';const hd=CALL_HEIGHT_DATA[hk]?.[d.callHeight];p.push(hd?`CH${d.callHeight}(${hd.frame})`:`CH${d.callHeight}`)}
  } else {
    if(d.width)p.push(`W:${fmtMeasurement(d.width,d.widthFrac)}`)
    if(d.height)p.push(`H:${fmtMeasurement(d.height,d.heightFrac)}`)
  }
  if(d.exteriorColor)p.push(`Ext:${d.exteriorColor}`)
  if(d.interiorColor)p.push(`Int:${d.interiorColor}`)
  if(d.glassSurface)p.push(d.glassSurface)
  if(d.decorativeGlass&&d.decorativeGlass!=='None')p.push(d.decorativeGlass)
  if(d.grilleType)p.push(d.grilleType)
  if(d.handleStyle)p.push(d.handleStyle)
  if(d.handleColorExt)p.push(d.handleColorExt)
  if(d.screenType&&d.screenType!=='No Screen')p.push('Screen')
  if(d.jambSize)p.push(`Jamb:${d.jambSize}`)
  if(d.cutSiding)p.push('Cut Siding')
  if(d.takeDownSiding)p.push('Take Down Siding')
  return p.join(' · ')
}

// ─── PDF Row Builders ─────────────────────────────────────────────────────────

function buildWindowPDFRows(w,orig=null) {
  const cfg=WIN[w.style]||{}
  const R=[]
  const sec=(l)=>R.push({type:'section',label:l})
  // changed: marks a field as changed vs original — only when orig exists and value differs
  // Only flag as changed if: orig exists AND orig has that key AND values differ after normalization
  // norm: undefined/null → '', boolean false → 'false', everything else → String()
  const norm=(v)=>{if(v===undefined||v===null)return '';return String(v)}
  const chk=(key,val)=>{
    if(!orig)return false
    if(!(key in orig))return false
    return norm(orig[key])!==norm(val)
  }
  // chkBool: for boolean fields stored as true/false — compare truthiness directly
  const chkBool=(key,val)=>{
    if(!orig)return false
    if(!(key in orig))return false
    return !!orig[key]!==!!val
  }
  const chkMeas=(kv,kf,val,frac)=>{
    if(!orig)return false
    if(!(kv in orig)&&!(kf in orig))return false
    return `${norm(orig[kv])}${norm(orig[kf])}`!==`${norm(val)}${norm(frac)}`
  }
  const pair=(al,av,bl,bv,aKey,bKey)=>R.push({type:'pair',
    a:{l:al,v:String(av??''),changed:aKey?chk(aKey,av):false},
    b:bl!=null?{l:bl,v:String(bv??''),changed:bKey?chk(bKey,bv):false}:null})
  const single=(l,v,key)=>R.push({type:'single',l,v:String(v??''),changed:key?chk(key,v):false})
  const flag=(l)=>R.push({type:'flag',label:l})

  sec('Window')
  const wideStr=w.numberWide>1?`${w.numberWide} Wide`:'1 Wide'
  const highStr=w.numberHigh===2?'2 High':'1 High'
  pair('Style',w.style,'Size',`${wideStr} · ${highStr}`,'style',null)
  if(w.facing&&w.sashSplit) pair('Facing (exterior)',w.facing,'Sash Split',w.sashSplit,'facing','sashSplit')
  else if(w.facing) single('Facing (exterior)',w.facing,'facing')
  else if(w.sashSplit) single('Sash Split',w.sashSplit,'sashSplit')
  if(w.configuration) single('Configuration',w.configuration,'configuration')

  sec('Measurements')
  const mtDisp=w.measurementType||'Frame Size', mtOrigDisp=orig?.measurementType||'Frame Size'
  R.push({type:'single',l:'Measurement Type',v:mtDisp,changed:orig?mtDisp!==mtOrigDisp:false})
  if(w.numberHigh===2) {
    const ohChanged=chkMeas('overallHeight','overallHeightFrac',w.overallHeight,w.overallHeightFrac)
    const bhChanged=chkMeas('height','heightFrac',w.height,w.heightFrac)
    R.push({type:'pair',a:{l:'Overall Height',v:w.overallHeight?fmtMeasurement(w.overallHeight,w.overallHeightFrac):'—',changed:ohChanged},b:{l:'Bottom Height',v:w.height?fmtMeasurement(w.height,w.heightFrac):'—',changed:bhChanged}})
    if(w.topHeight){const thChanged=chkMeas('topHeight','topHeightFrac',w.topHeight,w.topHeightFrac);R.push({type:'single',l:'Top Height (calculated)',v:fmtMeasurement(w.topHeight,w.topHeightFrac),changed:thChanged})}
  } else if(w.widthOrHeight) {
    const wohChanged=chkMeas('widthOrHeight','widthOrHeightFrac',w.widthOrHeight,w.widthOrHeightFrac)
    R.push({type:'single',l:'Width or Height',v:fmtMeasurement(w.widthOrHeight,w.widthOrHeightFrac),changed:wohChanged})
  } else {
    const wChanged=chkMeas('width','widthFrac',w.width,w.widthFrac)
    const hChanged=chkMeas('height','heightFrac',w.height,w.heightFrac)
    R.push({type:'pair',a:{l:'Width',v:w.width?fmtMeasurement(w.width,w.widthFrac):'—',changed:wChanged},b:{l:'Height',v:w.height?fmtMeasurement(w.height,w.heightFrac):'—',changed:hChanged}})
  }
  if(w.shortSideHeight){const sChanged=chkMeas('shortSideHeight','shortSideHeightFrac',w.shortSideHeight,w.shortSideHeightFrac);R.push({type:'single',l:'Short Side Height',v:fmtMeasurement(w.shortSideHeight,w.shortSideHeightFrac),changed:sChanged})}
  if(w.angleOfDeflection||w.flankerRatio) pair('Angle of Deflection',w.angleOfDeflection||'—','Flanker Ratio',w.flankerRatio||'—','angleOfDeflection','flankerRatio')

  if(w.numberHigh===2) {
    sec('Top Window')
    // For 2-high fields: '' and 'Same as bottom' both mean "same as bottom" — treat as equivalent
    const normSab=(v)=>(!v||v==='Same as bottom')?'same':v.toLowerCase().trim()
    const chkSab=(key,val)=>orig?normSab(orig[key])!==normSab(val):false
    const ts=w.topWindowWidth===2?`${w.topLeftStyle||'—'} | ${w.topRightStyle||'—'}`:(w.topStyle||'—')
    const origTs=orig?.topWindowWidth===2?`${orig.topLeftStyle||'—'} | ${orig.topRightStyle||'—'}`:(orig?.topStyle||'—')
    const topStyleChanged=orig?ts!==origTs:false
    const topFacingDisp=w.topFacing||'Same as bottom'
    const topFacingChanged=orig?normSab(orig.topFacing)!==normSab(w.topFacing):false
    R.push({type:'pair',a:{l:'Top Style',v:ts,changed:topStyleChanged},b:{l:'Top Facing',v:topFacingDisp,changed:topFacingChanged}})
    const topTempDisp=(w.topTempered&&w.topTempered!==w.tempered)?w.topTempered:'Same as bottom'
    const topDecoDisp=(w.topDecorativeGlass&&w.topDecorativeGlass!=='Same as bottom')?w.topDecorativeGlass:'Same as bottom'
    R.push({type:'pair',a:{l:'Top Tempered',v:topTempDisp,changed:chkSab('topTempered',w.topTempered)},b:{l:'Top Deco Glass',v:topDecoDisp,changed:chkSab('topDecorativeGlass',w.topDecorativeGlass)}})
    const topGrilleTypeDisp=(w.topGrilleType&&w.topGrilleType!=='Same as bottom')?w.topGrilleType:'Same as bottom'
    const topGrillePatDisp=(w.topGrillePattern&&w.topGrillePattern!=='Same as bottom')?w.topGrillePattern:(w.topGrilleType==='None'?'N/A':'Same as bottom')
    R.push({type:'pair',a:{l:'Top Grille Type',v:topGrilleTypeDisp,changed:chkSab('topGrilleType',w.topGrilleType)},b:{l:'Top Grille Pattern',v:topGrillePatDisp,changed:chkSab('topGrillePattern',w.topGrillePattern)}})
  }

  sec('Color & Glass')
  const extDisp=w.exteriorColor||'—', extOrigDisp=orig?.exteriorColor||'—'
  const intDisp=w.interiorColor||'—', intOrigDisp=orig?.interiorColor||'—'
  R.push({type:'pair',a:{l:'Exterior Color',v:extDisp,changed:orig?extDisp!==extOrigDisp:false},b:{l:'Interior Color',v:intDisp,changed:orig?intDisp!==intOrigDisp:false}})
  // pane/tempered: compare display values since '' and 'Double'/'No' are equivalent defaults
  const paneDisp=w.pane||'Double', tempDisp=w.tempered||'No'
  const paneOrigDisp=orig?.pane||'Double', tempOrigDisp=orig?.tempered||'No'
  R.push({type:'pair',a:{l:'Pane',v:paneDisp,changed:orig?paneDisp!==paneOrigDisp:false},b:{l:'Tempered',v:tempDisp,changed:orig?tempDisp!==tempOrigDisp:false}})
  const decoDisp=(w.decorativeGlass&&w.decorativeGlass!=='None')?w.decorativeGlass:'None'
  const decoOrigDisp=(orig?.decorativeGlass&&orig.decorativeGlass!=='None')?orig.decorativeGlass:'None'
  R.push({type:'pair',a:{l:'Glass Surface',v:w.glassSurface||'—',changed:chk('glassSurface',w.glassSurface)},b:{l:'Decorative Glass',v:decoDisp,changed:orig?decoDisp!==decoOrigDisp:false}})

  if(w.grilleType) {
    sec('Grille')
    const isMP=MULTI_PANE_STYLES.includes(w.style)
    if(isMP) {
      const paneAppDisp=w.grillePaneApplication||'Both Panes'
      const paneAppOrigDisp=orig?.grillePaneApplication||'Both Panes'
      R.push({type:'pair',a:{l:'Grille Type',v:String(w.grilleType??''),changed:chk('grilleType',w.grilleType)},b:{l:'Pane Application',v:paneAppDisp,changed:orig?paneAppDisp!==paneAppOrigDisp:false}})
      if(w.grillePaneApplication==='Both Panes') pair('Top Pane Pattern',w.topPaneGrillePattern||'—','Bottom Pane Pattern',w.bottomPaneGrillePattern||'—','topPaneGrillePattern','bottomPaneGrillePattern')
      else if(w.grillePattern) single('Grille Pattern',w.grillePattern,'grillePattern')
    } else {
      // For grille pattern: compare display values (both empty = no change)
      const gpDisplayCurr=w.grillePattern||''
      const gpDisplayOrig=orig?.grillePattern||''
      const gpChanged=orig?(gpDisplayCurr!==gpDisplayOrig):false
      R.push({type:'pair',
        a:{l:'Grille Type',v:String(w.grilleType??''),changed:chk('grilleType',w.grilleType)},
        b:{l:'Grille Pattern',v:w.grillePattern||'—',changed:gpChanged}
      })
      if(w.simulatedRail) single('Simulated Rail',w.simulatedRail,'simulatedRail')
    }
  }

  // Only show hardware/screen if the window type actually supports them (per WIN config)
  // sc:0 means exterior screen (no screen color field); sm:0 means no screen at all
  if(cfg.hw||cfg.sm) {
    const showHw=cfg.hw&&(w.hardwareColor||w.screenColor||w.screenMesh)
    const showSc=cfg.sc&&w.screenColor  // sc:1 = interior screen color shown
    const showSm=cfg.sm&&w.screenMesh
    if(showHw||showSc||showSm) {
      sec('Hardware & Screen')
      // Hardware color: show if window has hardware
      // Screen color: only show if window has interior screen (sc:1) — Double Hung/Slider have exterior screen (sc:0) so no color shown
      if(cfg.hw&&w.hardwareColor) {
        const hwDisp=w.hardwareColor||'—', hwOrigDisp=orig?.hardwareColor||'—'
        if(cfg.sc&&w.screenColor){
          const scDisp=w.screenColor||'—', scOrigDisp=orig?.screenColor||'—'
          R.push({type:'pair',a:{l:'Hardware Color',v:hwDisp,changed:orig?hwDisp!==hwOrigDisp:false},b:{l:'Screen Color',v:scDisp,changed:orig?scDisp!==scOrigDisp:false}})
        } else {
          R.push({type:'single',l:'Hardware Color',v:hwDisp,changed:orig?hwDisp!==hwOrigDisp:false})
        }
      }
      if(showSm){
        const smDisp=w.screenMesh||'—', smOrigDisp=orig?.screenMesh||'—'
        R.push({type:'single',l:'Screen Mesh',v:smDisp,changed:orig?smDisp!==smOrigDisp:false})
      }
    }
  }

  if(w.jambDepth||w.jambType||w.casingWidth||w.casingType||w.casingStyle||w.lpTrimColor) {
    sec('Extension Jamb & Casing')
    const jdChanged=chkMeas('jambDepth','jambDepthFrac',w.jambDepth,w.jambDepthFrac)
    const cwChanged=chkMeas('casingWidth','casingWidthFrac',w.casingWidth,w.casingWidthFrac)
    const jambTypeDisp=w.jambType?(w.jambType==='Other'?w.jambTypeOther||'Other':w.jambType):'—'
    const jambTypeOrigDisp=orig?.jambType?(orig.jambType==='Other'?orig.jambTypeOther||'Other':orig.jambType):'—'
    const casingTypeDisp=w.casingType?(w.casingType==='Other'?w.casingTypeOther||'Other':w.casingType):'—'
    const casingTypeOrigDisp=orig?.casingType?(orig.casingType==='Other'?orig.casingTypeOther||'Other':orig.casingType):'—'
    R.push({type:'pair',a:{l:'Jamb Depth',v:w.jambDepth?fmtMeasurement(w.jambDepth,w.jambDepthFrac):'—',changed:jdChanged},b:{l:'Jamb Type',v:jambTypeDisp,changed:orig?jambTypeDisp!==jambTypeOrigDisp:false}})
    R.push({type:'pair',a:{l:'Casing Width',v:w.casingWidth?fmtMeasurement(w.casingWidth,w.casingWidthFrac):'—',changed:cwChanged},b:{l:'Casing Type',v:casingTypeDisp,changed:orig?casingTypeDisp!==casingTypeOrigDisp:false}})
    if(w.casingStyle||w.lpTrimColor) {
      const csDisp=w.casingStyle||'—', csOrigDisp=orig?.casingStyle||'—'
      const lpChanged=orig?((w.lpTrimColor||'')!==(orig.lpTrimColor||'')):false
      R.push({type:'pair',
        a:{l:'Casing Style',v:csDisp,changed:orig?csDisp!==csOrigDisp:false},
        b:{l:'LP Trim Color',v:w.lpTrimColor||'—',changed:lpChanged&&!!(w.lpTrimColor||orig?.lpTrimColor)}
      })
    }
  }

  if(w.cutSiding||w.takeDownSiding) {
    sec('Additional')
    if(w.cutSiding&&w.takeDownSiding) R.push({type:'pair',
      a:{l:'Cut Siding',v:'YES',changed:chkBool('cutSiding',w.cutSiding)},
      b:{l:'Take Down Siding',v:'YES',changed:chkBool('takeDownSiding',w.takeDownSiding)}})
    else if(w.cutSiding) R.push({type:'single',l:'Cut Siding',v:'YES',changed:chkBool('cutSiding',w.cutSiding)})
    else R.push({type:'single',l:'Take Down Siding',v:'YES',changed:chkBool('takeDownSiding',w.takeDownSiding)})
  }
  if(w.insert) R.push({type:'flag',label:'INSERT WINDOW'})
  return R
}

function buildDoorPDFRows(d,orig=null) {
  const R=[]
  const sec=(l)=>R.push({type:'section',label:l})
  const norm=(v)=>{if(v===undefined||v===null)return '';return String(v)}
  const chk=(key,val)=>{
    if(!orig)return false
    if(!(key in orig))return false
    return norm(orig[key])!==norm(val)
  }
  const chkBool=(key,val)=>{
    if(!orig)return false
    if(!(key in orig))return false
    return !!orig[key]!==!!val
  }
  const pair=(al,av,bl,bv,aKey,bKey)=>R.push({type:'pair',
    a:{l:al,v:String(av??''),changed:aKey?chk(aKey,av):false},
    b:bl!=null?{l:bl,v:String(bv??''),changed:bKey?chk(bKey,bv):false}:null})
  const single=(l,v,key)=>R.push({type:'single',l,v:String(v??''),changed:key?chk(key,v):false})
  const flag=(l)=>R.push({type:'flag',label:l})

  const dtc=DOOR_TYPE_CONFIG[d.style]
  const category=dtc?.category||''
  const chkMeas=(kv,kf,val,frac)=>{
    if(!orig)return false
    if(!(kv in orig)&&!(kf in orig))return false
    return `${norm(orig[kv])}${norm(orig[kf])}`!==`${norm(val)}${norm(frac)}`
  }

  if(d.insert) R.push({type:'flag',label:'INSERT DOOR'})  // Note: insert is display-only, no change tracking needed

  sec('Door')
  // panelCount is numeric — compare as numbers
  const pcChanged=orig?(Number(orig.panelCount)||0)!==(Number(d.panelCount)||0):false
  R.push({type:'pair',
    a:{l:'Style',v:String(d.style??''),changed:chk('style',d.style)},
    b:{l:'Panels',v:String(d.panelCount||'—'),changed:pcChanged}
  })
  // Configuration and handing: compare display values to avoid false positives
  // from auto-resolved configs (stored as '' in form but resolved to 'OX' etc.)
  const configDisp=d.configuration||'—'
  const configOrigDisp=orig?.configuration||'—'
  const handingDisp=d.handing||'—'
  const handingOrigDisp=orig?.handing||'—'
  R.push({type:'pair',
    a:{l:'Configuration',v:configDisp,changed:orig?configDisp!==configOrigDisp:false},
    b:{l:'Handing',v:handingDisp,changed:orig?handingDisp!==handingOrigDisp:false}
  })

  sec('Measurements')
  const mt=d.measurementType||'Call Size'
  const mtOrigDispD=orig?.measurementType||'Call Size'
  R.push({type:'single',l:'Measurement Type',v:mt,changed:orig?mt!==mtOrigDispD:false})
  if(mt==='Call Size') {
    const wk=d.bifoldWidthKey||dtc?.widthKey
    const hk=dtc?.heightKey||'h_french'
    const cwLabel=d.callWidth&&wk?(()=>{const wd=CALL_WIDTH_DATA[wk]?.[d.callWidth];return wd?`${d.callWidth}" — Frame: ${wd.frame} · RO: ${wd.ro}`:`${d.callWidth}"`})():'—'
    const chLabel=d.callHeight?(()=>{const hd=CALL_HEIGHT_DATA[hk]?.[d.callHeight];return hd?`${d.callHeight}" — Frame: ${hd.frame} · RO: ${hd.ro}`:`${d.callHeight}"`})():'—'
    // Compare call sizes numerically to handle number/string type differences
    const cwChanged=orig?(Number(orig.callWidth)||0)!==(Number(d.callWidth)||0):false
    const chChanged=orig?(Number(orig.callHeight)||0)!==(Number(d.callHeight)||0):false
    R.push({type:'single',l:'Call Width',v:cwLabel,changed:cwChanged})
    R.push({type:'single',l:'Call Height',v:chLabel,changed:chChanged})
  } else {
    const wChanged=chkMeas('width','widthFrac',d.width,d.widthFrac)
    const hChanged=chkMeas('height','heightFrac',d.height,d.heightFrac)
    R.push({type:'pair',a:{l:'Width',v:d.width?fmtMeasurement(d.width,d.widthFrac):'—',changed:wChanged},b:{l:'Height',v:d.height?fmtMeasurement(d.height,d.heightFrac):'—',changed:hChanged}})
  }

  sec('Color & Glass')
  const dExtDisp=d.exteriorColor||'—', dExtOrigDisp=orig?.exteriorColor||'—'
  const dIntDisp=d.interiorColor||'—', dIntOrigDisp=orig?.interiorColor||'—'
  R.push({type:'pair',a:{l:'Exterior Color',v:dExtDisp,changed:orig?dExtDisp!==dExtOrigDisp:false},b:{l:'Interior Color',v:dIntDisp,changed:orig?dIntDisp!==dIntOrigDisp:false}})
  const dGlassDisp=d.glassSurface||'—', dGlassOrigDisp=orig?.glassSurface||'—'
  R.push({type:'pair',a:{l:'Glass Surface',v:dGlassDisp,changed:orig?dGlassDisp!==dGlassOrigDisp:false},b:{l:'Pane',v:'Double (Tempered)',changed:false}})
  if(d.decorativeGlass&&d.decorativeGlass!=='None'){
    const ddDecoDisp=d.decorativeGlass, ddDecoOrigDisp=orig?.decorativeGlass||''
    single('Decorative Glass',d.decorativeGlass,null)
    // Override changed: only flag if actual values differ
    if(R.length>0){const last=R[R.length-1];if(last.type==='single')last.changed=orig?ddDecoDisp!==ddDecoOrigDisp:false}
  }

  if(d.grilleType) {
    sec('Grille')
    pair('Grille Type',d.grilleType,'Grille Pattern',d.grillePattern||'—','grilleType','grillePattern')
  }

  const hw=getDoorHardwareCfg(category,d.panelCount)
  const hasHW=hw.stdHandle||hw.handleColorInt||hw.handleColorExt||hw.hingeInt||hw.hingeExt||hw.bifoldPanel||hw.bifoldExt||hw.bifoldInt
  if(hasHW) {
    sec('Hardware')
    if(hw.stdHandle) pair('Handle Style',d.handleStyle||'—',hw.handleColorExt?'Ext. Handle Color':null,hw.handleColorExt?d.handleColorExt||'—':null,'handleStyle',hw.handleColorExt?'handleColorExt':null)
    if(hw.handleColorInt) {
      if(hw.hingeInt) pair('Int. Handle Color',d.handleColorInt||'—','Int. Hinge Color',d.hingeColorInt||'—','handleColorInt','hingeColorInt')
      else if(hw.hingeExt) pair('Int. Handle Color',d.handleColorInt||'—','Ext. Hinge Color',d.hingeColorExt||'—','handleColorInt','hingeColorExt')
      else single('Int. Handle Color',d.handleColorInt||'—','handleColorInt')
    } else if(hw.hingeExt&&!hw.stdHandle) single('Ext. Hinge Color',d.hingeColorExt||'—','hingeColorExt')
    if(hw.bifoldExt||hw.bifoldPanel) {
      if(hw.bifoldPanel&&hw.bifoldExt) pair('BiFold Panel Handle',d.bifoldPanelHandleColor||'—','BiFold Ext. Hinge',d.bifoldExtHingeColor||'—','bifoldPanelHandleColor','bifoldExtHingeColor')
      else if(hw.bifoldExt) single('BiFold Ext. Hinge Color',d.bifoldExtHingeColor||'—','bifoldExtHingeColor')
    }
    if(hw.bifoldInt) single('BiFold Int. Hinge Color',d.bifoldIntHingeColor||'—','bifoldIntHingeColor')
  }

  const sc=getScreenCfg(category,d.panelCount)
  sec('Screen')
  if(!sc.show) single('Screen','N/A (Outswing)')
  else if(sc.always) pair('Screen','Included (Exterior)','Screen Mesh',d.screenMesh||'—',null,'screenMesh')
  else {
    pair('Screen Type',d.screenType||'No Screen',d.screenType&&d.screenType!=='No Screen'?'Mesh':null,d.screenType&&d.screenType!=='No Screen'?'Pleated Charcoal Mesh':null,'screenType',null)
  }

  if(dtc?.jamb&&d.jambSize) {
    sec('Jamb Size')
    single('Jamb Size',d.jambSize,'jambSize')
  }

  if(d.jambDepth||d.jambType||d.casingWidth||d.casingType||d.casingStyle||d.lpTrimColor) {
    sec('Extension Jamb & Casing')
    const jdChanged=chkMeas('jambDepth','jambDepthFrac',d.jambDepth,d.jambDepthFrac)
    const cwChanged=chkMeas('casingWidth','casingWidthFrac',d.casingWidth,d.casingWidthFrac)
    const djambTypeDisp=d.jambType?(d.jambType==='Other'?d.jambTypeOther||'Other':d.jambType):'—'
    const djambTypeOrigDisp=orig?.jambType?(orig.jambType==='Other'?orig.jambTypeOther||'Other':orig.jambType):'—'
    const dcasingTypeDisp=d.casingType?(d.casingType==='Other'?d.casingTypeOther||'Other':d.casingType):'—'
    const dcasingTypeOrigDisp=orig?.casingType?(orig.casingType==='Other'?orig.casingTypeOther||'Other':orig.casingType):'—'
    R.push({type:'pair',a:{l:'Jamb Depth',v:d.jambDepth?fmtMeasurement(d.jambDepth,d.jambDepthFrac):'—',changed:jdChanged},b:{l:'Jamb Type',v:djambTypeDisp,changed:orig?djambTypeDisp!==djambTypeOrigDisp:false}})
    R.push({type:'pair',a:{l:'Casing Width',v:d.casingWidth?fmtMeasurement(d.casingWidth,d.casingWidthFrac):'—',changed:cwChanged},b:{l:'Casing Type',v:dcasingTypeDisp,changed:orig?dcasingTypeDisp!==dcasingTypeOrigDisp:false}})
    if(d.casingStyle||d.lpTrimColor) {
      const dcsDisp=d.casingStyle||'—', dcsOrigDisp=orig?.casingStyle||'—'
      const lpChanged=orig?((d.lpTrimColor||'')!==(orig.lpTrimColor||'')):false
      R.push({type:'pair',
        a:{l:'Casing Style',v:dcsDisp,changed:orig?dcsDisp!==dcsOrigDisp:false},
        b:{l:'LP Trim Color',v:d.lpTrimColor||'—',changed:lpChanged&&!!(d.lpTrimColor||orig?.lpTrimColor)}
      })
    }
  }

  if(d.cutSiding||d.takeDownSiding) {
    sec('Additional')
    if(d.cutSiding&&d.takeDownSiding) R.push({type:'pair',
      a:{l:'Cut Siding',v:'YES',changed:chkBool('cutSiding',d.cutSiding)},
      b:{l:'Take Down Siding',v:'YES',changed:chkBool('takeDownSiding',d.takeDownSiding)}})
    else if(d.cutSiding) R.push({type:'single',l:'Cut Siding',v:'YES',changed:chkBool('cutSiding',d.cutSiding)})
    else R.push({type:'single',l:'Take Down Siding',v:'YES',changed:chkBool('takeDownSiding',d.takeDownSiding)})
  }
  return R
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generatePDF(jobInfo,rooms,isFinalMeasurement=false,originalRooms=null) {
  const doc=new jsPDF({unit:'pt',format:'letter'})
  const W=doc.internal.pageSize.getWidth(),pH=doc.internal.pageSize.getHeight()
  const M=48; let y=0
  const CHARCOAL=[30,36,50],ORANGE=[232,98,42],BLUE=[74,144,217],WHITE=[255,255,255],MGRAY=[226,230,237],TEXTDK=[26,31,46],TEXTMD=[74,85,104]
  const footerLabel=isFinalMeasurement?'Fettig Millwork & Windows, Inc.  —  Final Measurement':'Fettig Millwork & Windows, Inc.  —  Estimate'
  const addFooter=()=>{doc.setFillColor(...CHARCOAL);doc.rect(0,pH-32,W,32,'F');doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...MGRAY);doc.text(footerLabel,M,pH-11);doc.setTextColor(...ORANGE);doc.text('CONFIDENTIAL',W-M,pH-11,{align:'right'})}
  doc.setFillColor(...WHITE);doc.rect(0,0,W,72,'F');doc.setFillColor(...ORANGE);doc.rect(0,72,W,4,'F')
  doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(...CHARCOAL);doc.text('FETTIG MILLWORK & WINDOWS, INC.',M,32)
  const docLabel=isFinalMeasurement?'Final Measurement':'Window & Door Estimate'
  doc.setFontSize(10);doc.setFont('helvetica','normal');doc.setTextColor(...TEXTMD);doc.text(docLabel,M,52);doc.text(new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),W-M,52,{align:'right'})
  y=96
  const fields=[['Customer',jobInfo.customerName],['Job Name',jobInfo.jobName],['Job Address',jobInfo.address],['Estimator',jobInfo.estimator]].filter(([,v])=>v)
  doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(...ORANGE);doc.text('JOB INFORMATION',M,y);y+=14
  doc.setDrawColor(...ORANGE);doc.setLineWidth(0.5);doc.line(M,y,W-M,y);y+=10
  const col2=W/2;let leftY=y,rightY=y
  fields.forEach(([label,value],i)=>{const cx=i%2===0?M:col2;let cy=i%2===0?leftY:rightY;doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...BLUE);doc.text(label.toUpperCase(),cx,cy);cy+=12;doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...TEXTDK);doc.text(value||'—',cx,cy);cy+=17;if(i%2===0)leftY=cy;else rightY=cy})
  y=Math.max(leftY,rightY)+10;doc.setDrawColor(...MGRAY);doc.setLineWidth(0.5);doc.line(M,y,W-M,y);y+=14
  const LGRAY=[180,185,195]
  const cX=M+36,cW=W-M-cX
  const col2X=cX+cW/2
  const YELLOW=[255,248,180],CHANGED=[140,90,0]
  // Draw a single field: label in blue bold 7.5pt, value in dark normal 8.5pt
  // If changed=true: yellow rect behind text, both label+value in amber, label prefixed with [*]
  const drawField=(label,value,x,maxW,changed)=>{
    const prefix=changed?'[*] ':''
    const lbl=prefix+label+': '
    // For changed fields: label 7.5pt bold, value 9.5pt bold black (larger+bolder for clarity)
    // For normal fields: label 7.5pt bold blue, value 8.5pt normal dark
    const valSize=changed?9.5:8.5
    const valFont=changed?'bold':'normal'
    // Measure with correct fonts before drawing anything
    doc.setFont('helvetica','bold');doc.setFontSize(7.5)
    const lw=doc.getTextWidth(lbl)
    doc.setFont('helvetica',valFont);doc.setFontSize(valSize)
    const avail=maxW-lw-4
    let val=String(value??'')
    while(val.length>3&&doc.getTextWidth(val)>avail)val=val.slice(0,-1)
    if(val!==String(value??''))val=val.slice(0,-2)+'...'
    const totalW=lw+doc.getTextWidth(val)+6
    // Draw highlight rect first (before any text) — taller to fit 9.5pt
    if(changed){doc.setFillColor(...YELLOW);doc.rect(x-2,y-9,Math.min(totalW,maxW+4),12,'F')}
    // Draw label
    doc.setFont('helvetica','bold');doc.setFontSize(7.5)
    doc.setTextColor(...(changed?CHANGED:BLUE))
    doc.text(lbl,x,y)
    // Draw value — bold black when changed, normal dark otherwise
    doc.setFont('helvetica',valFont);doc.setFontSize(valSize)
    doc.setTextColor(...(changed?TEXTDK:TEXTDK))
    doc.text(val,x+lw,y)
  }
  // renderField: alias for drawField with changed=false (used for unchanged fields)
  const renderField=(label,value,x,maxW)=>drawField(label,value,x,maxW,false)
  const renderRow=(row)=>{
    if(row.type==='section'){
      y+=4
      doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...ORANGE)
      doc.text(row.label.toUpperCase(),cX,y)
      doc.setDrawColor(...ORANGE);doc.setLineWidth(0.25)
      doc.line(cX+doc.getTextWidth(row.label.toUpperCase())+4,y-1,M+cW,y-1)
      y+=10;return
    }
    if(row.type==='flag'){
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...ORANGE)
      doc.text(row.label,cX,y);y+=14;return
    }
    if(row.type==='pair'){
      drawField(row.a.l,row.a.v,cX,cW/2-4,!!row.a?.changed)
      if(row.b) drawField(row.b.l,row.b.v,col2X,cW/2-4,!!row.b?.changed)
      y+=(row.a?.changed||row.b?.changed)?15:13;return
    }
    if(row.type==='single'){
      drawField(row.l,row.v,cX,cW-4,!!row.changed)
      y+=row.changed?15:13;return
    }
  }

  let itemNum=1
  let firstItem=true

  // Estimate height needed for an item's rows (without rendering)
  const estimateRowsH=(rows)=>rows.reduce((h,r)=>{
    if(r.type==='section')return h+14
    if(r.type==='flag')return h+14
    const changed=r.a?.changed||r.b?.changed||r.changed
    return h+(changed?15:13)
  },0)

  rooms.forEach((room,ri)=>{
    if(!room.items.length)return
    room.items.forEach((item,itemIdx)=>{
      const isDoor=item.itemType==='door'
      const origRoom=originalRooms?.[ri]
      const origItem=origRoom?.items?.[itemIdx]||null
      const itemRows=isDoor?buildDoorPDFRows(item,origItem):buildWindowPDFRows(item,origItem)
      const hasChanges=origItem&&itemRows.some(r=>(r.a?.changed||r.b?.changed||r.changed))
      const titleText=`${item.style}${isDoor?' (Patio Door)':''}${parseInt(item.qty)>1?` × ${item.qty}`:''}`

      // ── Calculate total height this item needs ────────────────────────────
      const roomBannerH=room.name?24:0
      const titleH=20
      const fieldsH=estimateRowsH(itemRows)
      const notesH=item.notes?16:0
      const photos=(item.photos||[]).filter(Boolean)
      // Photo layout: up to 3 per row, height = photoW * 0.75 capped so each photo
      // is at most 120pt tall to keep items compact
      const availW=W-M*2
      const gap=8
      const perRow=Math.min(Math.max(photos.length,1),2)
      const rawPhotoW=Math.floor((availW-(perRow-1)*gap)/perRow)
      const photoH=Math.min(Math.round(rawPhotoW*0.75),200) // preferred max 200pt tall
      const photoW=Math.round(photoH/0.75)
      const photoRowCount=photos.length>0?Math.ceil(photos.length/perRow):0
      const photosH=photos.length>0?photoRowCount*(photoH+gap)+12:0
      // Total height if photos render at preferred size; render step will shrink if needed
      const itemTotalH=roomBannerH+titleH+fieldsH+notesH+photosH+20

      const pageContentH=pH-80-40 // usable height (top 40 + bottom footer 40)

      // ── Page break logic ──────────────────────────────────────────────────
      if(firstItem){
        // First item: already have y set from job info section, just check it fits
        // If item is taller than the full page, we'll just start it here and let it flow
        firstItem=false
      } else {
        // Check if item fits on remaining page
        const remaining=pH-60-y
        if(itemTotalH>remaining){
          addFooter();doc.addPage();y=40
        }
      }

      // ── Render room banner ────────────────────────────────────────────────
      if(room.name){
        doc.setFillColor(...ORANGE);doc.rect(M,y-10,W-M*2,22,'F')
        doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...WHITE)
        doc.text(room.name.toUpperCase(),M+8,y+5);y+=24
      }

      // ── Render item title ─────────────────────────────────────────────────
      const badgeColor=hasChanges?ORANGE:LGRAY
      doc.setFillColor(...badgeColor);doc.rect(M,y-10,28,22,'F')
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...WHITE)
      doc.text(String(itemNum),M+14,y+4,{align:'center'})
      doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...CHARCOAL)
      doc.text(titleText,cX,y+4)
      if(hasChanges){
        const tw=doc.getTextWidth(titleText)
        doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...ORANGE)
        doc.text(' [CHANGED]',cX+tw,y+4)
      }
      y+=20

      // ── Render fields ─────────────────────────────────────────────────────
      itemRows.forEach(row=>renderRow(row))

      // ── Render notes ──────────────────────────────────────────────────────
      if(item.notes){
        y+=4
        doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(...TEXTMD)
        doc.text('NOTES: ',cX,y)
        doc.setFont('helvetica','italic');doc.setFontSize(8);doc.setTextColor(...TEXTMD)
        doc.text(item.notes,cX+doc.getTextWidth('NOTES: '),y)
        y+=12
      }

      // ── Render photos — always on same page, shrink to fit if needed ────────
      if(photos.length>0){
        y+=6
        // How much vertical space remains on this page above the footer?
        const remainingY=pH-60-y
        const photoRows=Math.ceil(photos.length/perRow)
        // Ideal height uses the pre-calculated photoH; shrink if it won't fit
        const idealTotalH=photoRows*(photoH+gap)
        let finalPhotoH=photoH
        let finalPhotoW=photoW
        if(idealTotalH>remainingY&&remainingY>20){
          // Shrink proportionally so all rows fit in remaining space
          const rowH=Math.max(Math.floor((remainingY-(photoRows-1)*gap)/photoRows),20)
          finalPhotoH=rowH
          finalPhotoW=Math.round(rowH/0.75)
        }
        // Center each row on the page
        const totalRowW=(n)=>n*finalPhotoW+(n-1)*gap
        let col=0,rowStart=0
        for(let i=0;i<photos.length;i++){
          if(col===0){
            const inThisRow=Math.min(perRow,photos.length-i)
            rowStart=M+(availW-totalRowW(inThisRow))/2
          }
          const px=rowStart+col*(finalPhotoW+gap)
          try{ doc.addImage(photos[i],'JPEG',px,y,finalPhotoW,finalPhotoH) }catch(e){/* skip */}
          col++
          if(col>=perRow){col=0;y+=finalPhotoH+gap}
        }
        if(col>0)y+=finalPhotoH+gap
        y+=4
      }

      y+=10;itemNum++
    })
  })
  const allItems=rooms.flatMap(r=>r.items)
  if(allItems.length>0){
    if(y+30>pH-60){addFooter();doc.addPage();y=40}
    doc.setFillColor(...CHARCOAL);doc.rect(M,y-10,W-M*2,22,'F');doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...ORANGE)
    const wc=allItems.filter(i=>i.itemType!=='door').length,dc=allItems.filter(i=>i.itemType==='door').length,tq=allItems.reduce((s,i)=>s+parseInt(i.qty||1),0)
    const pts=[];if(wc)pts.push(`${wc} window item(s)`);if(dc)pts.push(`${dc} door item(s)`)
    doc.text(`TOTAL: ${pts.join('  |  ')}  |  ${tq} unit(s)`,M+8,y+5);y+=20
  }
  if(jobInfo.notes){y+=8;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...ORANGE);doc.text('ADDITIONAL NOTES',M,y);y+=14;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(...TEXTDK);doc.splitTextToSize(jobInfo.notes,W-M*2).forEach(line=>{doc.text(line,M,y);y+=14})}
  addFooter();return doc
}

// ─── Customer Search ──────────────────────────────────────────────────────────

function CustomerJobSearch({onSelect}) {
  const [query,setQuery]=useState(''),[results,setResults]=useState([]),[loading,setLoading]=useState(false),[expanded,setExpanded]=useState(null),[error,setError]=useState(null)
  const debounceRef=useRef(null)
  useEffect(()=>{
    if(query.length<2){setResults([]);return}
    clearTimeout(debounceRef.current)
    debounceRef.current=setTimeout(async()=>{
      setLoading(true);setError(null)
      try{const res=await fetch(`/api/search?q=${encodeURIComponent(query)}`);const data=await res.json();if(data.error)throw new Error(data.error);setResults(data.customers||[])}
      catch(err){setError(err.message)}finally{setLoading(false)}
    },350)
  },[query])
  const select=(customer,job)=>{onSelect({customerName:customer.name,jobId:job.id,jobName:job.name,address:[job.address?.street,job.address?.city,job.address?.state].filter(Boolean).join(', ')});setQuery('');setResults([])}
  return(
    <div style={{position:'relative'}}>
      <div style={{position:'relative'}}>
        <input placeholder="Start typing a customer name..." value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off"/>
        {loading&&<div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--red)',fontSize:12}}>Searching...</div>}
      </div>
      {error&&<div style={{marginTop:8,padding:'10px 12px',background:'#fff5f5',border:'1px solid #fed7d7',borderRadius:6,fontSize:13,color:'#e74c3c'}}>⚠️ {error}</div>}
      {results.length>0&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:200,background:'var(--surface)',border:'1.5px solid var(--red)',borderRadius:8,marginTop:4,maxHeight:340,overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
          {results.map(customer=>(
            <div key={customer.id}>
              <div onClick={()=>setExpanded(expanded===customer.id?null:customer.id)} style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid rgba(192,57,43,0.12)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontWeight:600,fontSize:14}}>{customer.name}</div><div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{customer.jobs?.nodes?.length||0} job{customer.jobs?.nodes?.length!==1?'s':''}</div></div>
                <div style={{color:'var(--red)',fontSize:12}}>{expanded===customer.id?'▲':'▼'}</div>
              </div>
              {expanded===customer.id&&customer.jobs?.nodes?.map(job=>(
                <div key={job.id} onClick={()=>select(customer,job)} style={{padding:'10px 14px 10px 28px',cursor:'pointer',borderBottom:'1px solid rgba(192,57,43,0.06)',background:'rgba(192,57,43,0.05)'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,0.12)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(192,57,43,0.05)'}>
                  <div style={{fontWeight:500,fontSize:13}}>{job.name||`Job #${job.id}`}</div>
                  {job.address?.street&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>📍 {[job.address.street,job.address.city,job.address.state].filter(Boolean).join(', ')}</div>}
                  {job.status&&<div style={{fontSize:11,color:'var(--red)',marginTop:2,textTransform:'uppercase',letterSpacing:'0.06em'}}>{job.status}</div>}
                </div>
              ))}
              {expanded===customer.id&&!customer.jobs?.nodes?.length&&<div style={{padding:'10px 28px',fontSize:13,color:'var(--text-muted)',fontStyle:'italic'}}>No jobs found.</div>}
            </div>
          ))}
        </div>
      )}
      {query.length>=2&&!loading&&results.length===0&&!error&&<div style={{marginTop:8,padding:'10px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:6,fontSize:13,color:'var(--text-muted)'}}>No customers found matching "{query}"</div>}
    </div>
  )
}

// ─── Item Cards ───────────────────────────────────────────────────────────────

function WindowCard({win,index,onEdit,onRemove,onPhotoClick,finalMode}) {
  return(
    <div style={{background:'var(--surface)',border:'1.5px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderRadius:8,padding:'12px 14px',marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{background:'var(--red)',color:'var(--bg)',borderRadius:4,padding:'2px 7px',fontFamily:'var(--font-head)',fontWeight:700,fontSize:12}}>#{index+1}</span>
            <span style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:15,color:'var(--text)'}}>{win.style}</span>
            {parseInt(win.qty)>1&&<span style={{color:'var(--text-muted)',fontSize:13}}>× {win.qty}</span>}
          </div>
          <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>{summarizeWindow(win)}</div>
          {finalMode&&(win.width||win.height)&&(
            <div style={{marginTop:6,padding:'6px 10px',background:'rgba(74,144,217,0.08)',borderRadius:6,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              {win.width&&<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>W </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{fmtMeasurement(win.width,win.widthFrac)}</span></div>}
              {win.height&&win.numberHigh!==2&&<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>H </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{fmtMeasurement(win.height,win.heightFrac)}</span></div>}
              {win.numberHigh===2&&win.overallHeight&&<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>H </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{fmtMeasurement(win.overallHeight,win.overallHeightFrac)}</span></div>}
            </div>
          )}
          {win.notes&&<div style={{marginTop:4,fontSize:11,color:'var(--text-muted)',fontStyle:'italic'}}>"{win.notes}"</div>}
          {win.photos?.length>0&&<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>{win.photos.map((p,i)=><img key={i} src={p} alt="" onClick={onPhotoClick?()=>onPhotoClick(p):undefined} style={{width:onPhotoClick?80:56,height:onPhotoClick?64:44,objectFit:'cover',borderRadius:4,border:`1.5px solid ${onPhotoClick?'var(--blue)':'var(--border)'}`,cursor:onPhotoClick?'zoom-in':'default',transition:'transform 0.1s'}} onMouseEnter={e=>{if(onPhotoClick)e.currentTarget.style.transform='scale(1.05)'}} onMouseLeave={e=>{if(onPhotoClick)e.currentTarget.style.transform='scale(1)'}}/>)}</div>}
        </div>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          <button className="btn-outline" onClick={()=>onEdit(index)} style={{padding:'6px 12px',fontSize:13}}>Edit</button>
          <button className="btn-danger" onClick={()=>onRemove(index)}>✕</button>
        </div>
      </div>
    </div>
  )
}

function DoorCard({door,index,onEdit,onRemove,onPhotoClick,finalMode}) {
  return(
    <div style={{background:'var(--surface)',border:'1.5px solid rgba(192,57,43,0.35)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderRadius:8,padding:'12px 14px',marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{background:'var(--blue)',color:'#fff',borderRadius:4,padding:'2px 7px',fontFamily:'var(--font-head)',fontWeight:700,fontSize:12}}>#{index+1}</span>
            <span style={{background:'rgba(74,144,217,0.12)',color:'var(--blue)',borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>PATIO DOOR</span>
            <span style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:15,color:'var(--text)'}}>{door.style}</span>
            {parseInt(door.qty)>1&&<span style={{color:'var(--text-muted)',fontSize:13}}>× {door.qty}</span>}
          </div>
          <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>{summarizeDoor(door)}</div>
          {finalMode&&(door.callWidth||door.width)&&(
            <div style={{marginTop:6,padding:'6px 10px',background:'rgba(74,144,217,0.08)',borderRadius:6,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              {door.callWidth?<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>W </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{door.callWidth}"</span></div>:door.width?<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>W </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{fmtMeasurement(door.width,door.widthFrac)}</span></div>:null}
              {door.callHeight?<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>H </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{door.callHeight}"</span></div>:door.height?<div><span style={{fontSize:10,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.06em'}}>H </span><span style={{fontSize:18,fontWeight:900,color:'var(--charcoal)',letterSpacing:'-0.02em'}}>{fmtMeasurement(door.height,door.heightFrac)}</span></div>:null}
            </div>
          )}
          {door.notes&&<div style={{marginTop:4,fontSize:11,color:'var(--text-muted)',fontStyle:'italic'}}>"{door.notes}"</div>}
          {door.photos?.length>0&&<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>{door.photos.map((p,i)=><img key={i} src={p} alt="" onClick={onPhotoClick?()=>onPhotoClick(p):undefined} style={{width:onPhotoClick?80:56,height:onPhotoClick?64:44,objectFit:'cover',borderRadius:4,border:`1.5px solid ${onPhotoClick?'var(--blue)':'var(--border)'}`,cursor:onPhotoClick?'zoom-in':'default',transition:'transform 0.1s'}} onMouseEnter={e=>{if(onPhotoClick)e.currentTarget.style.transform='scale(1.05)'}} onMouseLeave={e=>{if(onPhotoClick)e.currentTarget.style.transform='scale(1)'}}/>)}</div>}
        </div>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          <button className="btn-outline" onClick={()=>onEdit(index)} style={{padding:'6px 12px',fontSize:13}}>Edit</button>
          <button className="btn-danger" onClick={()=>onRemove(index)}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ─── Top Window Unit (2-High windows) ─────────────────────────────────────────

function TopWindowUnit({label,value,onChange,options}) {
  const {m,facing}=getTopWinMeasurements(value.style)
  const set=(k,v)=>onChange({...value,[k]:v})
  return(
    <div style={{background:'rgba(0,0,0,0.15)',borderRadius:8,padding:'12px',marginBottom:8}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--red)',letterSpacing:'0.07em',marginBottom:8}}>{label}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        <div style={{gridColumn:'1/-1',marginBottom:10}}>
          <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Style</label>
          <select value={value.style} onChange={e=>onChange({style:e.target.value,width:'',widthFrac:'',height:'',heightFrac:'',shortSideHeight:'',shortSideHeightFrac:'',facing:''})}>
            <option value="">Select...</option>{options.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        {facing&&<div style={{gridColumn:'1/-1',marginBottom:10}}><label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Facing</label><select value={value.facing} onChange={e=>set('facing',e.target.value)}><option value="">Select...</option><option>Left</option><option>Right</option></select></div>}
        {m.includes('w')&&<div style={{marginBottom:10}}><label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Width (in) *</label><MeasurementInput value={value.width} frac={value.widthFrac} onValue={v=>set('width',v)} onFrac={v=>set('widthFrac',v)}/></div>}
        {m.includes('h')&&<div style={{marginBottom:10}}><label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Height (in) *</label><MeasurementInput value={value.height} frac={value.heightFrac} onValue={v=>set('height',v)} onFrac={v=>set('heightFrac',v)}/></div>}
        {m.includes('s')&&<div style={{gridColumn:'1/-1',marginBottom:10}}><label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Short Side Height (in) *</label><MeasurementInput value={value.shortSideHeight} frac={value.shortSideHeightFrac} onValue={v=>set('shortSideHeight',v)} onFrac={v=>set('shortSideHeightFrac',v)}/></div>}
      </div>
    </div>
  )
}

// ─── Window Form ──────────────────────────────────────────────────────────────

const EMPTY={
  itemType:'window',style:'',numberWide:1,facing:'',sashSplit:'',measurementType:'Frame Size',configType:'standard',standardConfig:'',panelConfigs:[],
  width:'',widthFrac:'',height:'',heightFrac:'',shortSideHeight:'',shortSideHeightFrac:'',widthOrHeight:'',widthOrHeightFrac:'',angleOfDeflection:'',flankerRatio:'',
  exteriorColor:'',interiorColor:'',pane:'Double',glassSurface:'',tempered:'No',decorativeGlass:'None',
  grilleType:'',grillePattern:'',simulatedRail:'',grillePaneApplication:'Both Panes',topPaneGrillePattern:'',bottomPaneGrillePattern:'',
  hardwareColor:'',screenColor:'',screenMesh:'',
  photos:[],qty:'1',notes:'',cutSiding:false,takeDownSiding:false,insert:false,
  numberHigh:1,topWindowWidth:1,topStyle:'',topHeight:'',topHeightFrac:'',topShortSideHeight:'',topShortSideHeightFrac:'',topFacing:'',
  topLeftStyle:'',topRightStyle:'',topLeftFacing:'',topRightFacing:'',topLeftShortSide:'',topLeftShortSideFrac:'',topRightShortSide:'',topRightShortSideFrac:'',
  topTempered:'',topDecorativeGlass:'',topGrilleType:'',topGrillePattern:'',
  topLeftHeight:'',topLeftHeightFrac:'',topRightHeight:'',topRightHeightFrac:'',
  overallHeight:'',overallHeightFrac:'',
  jambDepth:'',jambDepthFrac:'',jambType:'',jambTypeOther:'',casingWidth:'',casingWidthFrac:'',casingType:'',casingTypeOther:'',casingStyle:'',lpTrimColor:'',
}

// prevOptions: object of carry-over fields from last saved item (or null if first item / editing)
function WindowForm({initial,onSave,onCancel,prevOptions}) {
  // Banner state: null = not yet decided, 'offered' = showing banner, 'dismissed' = user said no
  const [bannerState,setBannerState]=useState(()=> prevOptions && !initial ? 'offered' : null)
  const [form,setForm]=useState(()=>initial?{...EMPTY,...initial}:{...EMPTY})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const cameraRef=useRef(null)
  const cfg=WIN[form.style]
  const panelCfg=cfg?getPanelConfig(cfg.pt,form.numberWide):null
  const intColors=getIntColors(form.exteriorColor)
  const glassSurfaces=GLASS_SURFACES[form.pane]||[]
  const decorGlasses=DECORATIVE_GLASSES[form.pane]||[]
  const topOpts=getTopOptions(form.style)

  const applyCarryOver = () => {
    if (!prevOptions) return
    setForm(f => ({ ...f, ...prevOptions }))
    setBannerState('applied')
  }

  // mountedRef guards: skip reset effects on initial render so editing doesn't wipe saved values
  const wStyleMounted=useRef(false)
  useEffect(()=>{
    if(!wStyleMounted.current){wStyleMounted.current=true;return}
    if(!form.style||!WIN[form.style])return
    const c=WIN[form.style]
    setForm(f=>({...f,numberWide:c.wide[0],measurementType:c.mt===1?'Rough Opening':'Frame Size',configType:'standard',standardConfig:'',panelConfigs:Array(c.wide[0]).fill(''),facing:'',sashSplit:'',grilleType:'',grillePattern:'',simulatedRail:'',grillePaneApplication:'Both Panes',topPaneGrillePattern:'',bottomPaneGrillePattern:''}))
  },[form.style])
  const wNumWideMounted=useRef(false)
  useEffect(()=>{
    if(!wNumWideMounted.current){wNumWideMounted.current=true;return}
    setForm(f=>({...f,panelConfigs:Array(f.numberWide).fill(''),standardConfig:''}))
  },[form.numberWide])
  const wTopWidthMounted=useRef(false)
  useEffect(()=>{
    if(!wTopWidthMounted.current){wTopWidthMounted.current=true;return}
    setForm(f=>({...f,topStyle:'',topGrilleType:'',topGrillePattern:''}))
  },[form.topWindowWidth])
  const wPaneMounted=useRef(false)
  useEffect(()=>{
    if(!wPaneMounted.current){wPaneMounted.current=true;return}
    setForm(f=>({...f,glassSurface:'',decorativeGlass:'None'}))
  },[form.pane])
  const wGrilleMounted=useRef(false)
  useEffect(()=>{
    if(!wGrilleMounted.current){wGrilleMounted.current=true;return}
    setForm(f=>({...f,grillePattern:'',simulatedRail:''}))
  },[form.grilleType])
  // Safe on mount — validates/cascades rather than resetting
  useEffect(()=>{if(form.interiorColor&&!getIntColors(form.exteriorColor).includes(form.interiorColor))set('interiorColor','')},[form.exteriorColor])
  useEffect(()=>{if(!form.overallHeight||!form.height)return;const o=parseFloat(form.overallHeight)+fracToDecimal(form.overallHeightFrac),b=parseFloat(form.height)+fracToDecimal(form.heightFrac);if(isNaN(o)||isNaN(b)||b>=o)return;const{whole,frac}=decimalToFrac(o-b);setForm(f=>({...f,topHeight:whole,topHeightFrac:frac}))},[form.overallHeight,form.overallHeightFrac,form.height,form.heightFrac])
  useEffect(()=>{if(form.jambType&&!form.casingType)set('casingType',form.jambType)},[form.jambType])
  const wHwMounted=useRef(false)
  useEffect(()=>{
    if(!wHwMounted.current){wHwMounted.current=true;return}
    if(!form.interiorColor)return
    setForm(f=>({...f,hardwareColor:INT_TO_HW[f.interiorColor]||f.hardwareColor,screenColor:INT_TO_SCREEN[f.interiorColor]||f.screenColor}))
  },[form.interiorColor])

  const handlePhoto=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>set('photos',[...(form.photos||[]),ev.target.result]);r.readAsDataURL(file);e.target.value=''}
  const removePhoto=i=>set('photos',form.photos.filter((_,j)=>j!==i))
  const getMissing=()=>{
    if(!cfg)return[]
    const m=[],is2=form.numberHigh===2
    if(cfg.m.includes('w')&&!form.width)m.push('Width')
    if(cfg.m.includes('h')&&!is2&&!form.height)m.push('Height')
    if(cfg.m.includes('h')&&is2&&!form.overallHeight)m.push('Overall Height')
    if(cfg.m.includes('s')&&!is2&&!form.shortSideHeight)m.push('Short Side Height')
    if(cfg.m.includes('wo')&&!form.widthOrHeight)m.push('Width or Height')
    if(!form.exteriorColor)m.push('Exterior Color')
    if(!form.interiorColor)m.push('Interior Color')
    if(!form.glassSurface)m.push('Glass Surface')
    if(cfg.sm&&!form.screenMesh)m.push('Screen Mesh Type')
    return m
  }
  const handleSave=()=>{
    const missing=getMissing()
    if(!form.style){alert('Please select a window style.');return}
    if(!form.qty){alert('Please enter a quantity.');return}
    if(missing.length>0){alert(`Please fill in required fields:\n• ${missing.join('\n• ')}`);return}
    const w={...form,itemType:'window'}
    if(panelCfg){
      if(panelCfg.type==='fixed')w.configuration=panelCfg.value
      else if(panelCfg.type==='single')w.configuration=form.standardConfig
      else if(panelCfg.type==='multi'){if(form.configType==='standard')w.configuration=form.standardConfig||panelCfg.standard||(panelCfg.standardOptions?.[0]);else w.configuration=(form.panelConfigs||[]).join(' | ')}
    }
    onSave(w)
  }
  const base2Wide=form.numberWide===2
  const forceRound=form.numberWide>=3

  const renderGrille=(topOverride)=>{
    const c=WIN[topOverride||form.style]||cfg
    const gp=c?.gp||[]
    const isMP=MULTI_PANE_STYLES.includes(topOverride||form.style)
    if(topOverride){return(<>
      <SelectWithPreview label="Grille Type" value={form.topGrilleType||''} onChange={v=>{set('topGrilleType',v);set('topGrillePattern','')}} imgMap={IMG.grilleType} opts={['Same as bottom','None',...(c?.g||cfg?.g||[])]} placeholder={`Same as bottom (${form.grilleType||'None'})`}/>
      {form.topGrilleType&&form.topGrilleType!=='Same as bottom'&&form.topGrilleType!=='None'&&gp.length>0&&<SelectWithPreview label="Grille Pattern" value={form.topGrillePattern||''} onChange={v=>set('topGrillePattern',v)} imgMap={IMG.grillePattern} opts={['Same as bottom',...gp]} placeholder={`Same as bottom (${form.grillePattern||'None'})`}/>}
    </>)}
    if(isMP){return(<>
      <SelectWithPreview label="Grille Type" value={form.grilleType} onChange={v=>{set('grilleType',v);set('grillePattern','');set('topPaneGrillePattern','');set('bottomPaneGrillePattern','')}} imgMap={IMG.grilleType} opts={['',...(cfg?.g||[])]} placeholder="None"/>
      {form.grilleType&&<>
        <Field label="Pane Application" col="1/-1"><select value={form.grillePaneApplication} onChange={e=>{set('grillePaneApplication',e.target.value);set('grillePattern','');set('topPaneGrillePattern','');set('bottomPaneGrillePattern','')}}><option>Both Panes</option><option>Top Pane Only</option><option>Bottom Pane Only</option></select></Field>
        {form.grillePaneApplication==='Both Panes'?(<div style={{gridColumn:'1/-1'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><SelectWithPreview label="Top Pane Pattern" value={form.topPaneGrillePattern} onChange={v=>set('topPaneGrillePattern',v)} imgMap={IMG.grillePattern} opts={gp} placeholder="Select..."/><SelectWithPreview label="Bottom Pane Pattern" value={form.bottomPaneGrillePattern} onChange={v=>set('bottomPaneGrillePattern',v)} imgMap={IMG.grillePattern} opts={gp} placeholder="Select..."/></div></div>)
        :<SelectWithPreview label="Grille Pattern" value={form.grillePattern} onChange={v=>set('grillePattern',v)} imgMap={IMG.grillePattern} opts={gp} placeholder="Select..."/>}
      </>}
    </>)}
    return(<>
      <SelectWithPreview label="Grille Type" value={form.grilleType} onChange={v=>{set('grilleType',v);set('grillePattern','')}} imgMap={IMG.grilleType} opts={['',...(cfg?.g||[])]} placeholder="None"/>
      {form.grilleType&&<>
        <SelectWithPreview label="Grille Pattern" value={form.grillePattern} onChange={v=>set('grillePattern',v)} imgMap={IMG.grillePattern} opts={gp} placeholder="Select..."/>
        {form.grilleType==='SDL'&&<Field label="Simulated Rail"><select value={form.simulatedRail} onChange={e=>set('simulatedRail',e.target.value)}><option value="">Select...</option><option>Yes</option><option>No</option></select></Field>}
        {cfg?.sunburst&&form.grillePattern==='Sunburst'&&<Field label="Below Sunburst" col="1/-1"><input value="Rectangular (required with Sunburst)" disabled style={{opacity:0.6}}/></Field>}
      </>}
    </>)
  }

  return(
    <div style={{background:'var(--surface)',border:'2px solid var(--red)',boxShadow:'var(--shadow-lg)',borderRadius:10,padding:'20px',marginBottom:16}}>
      <div style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,letterSpacing:'0.08em',color:'var(--charcoal)',marginBottom:16,textTransform:'uppercase'}}>Window Details</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>

        {/* ── Carry-Over Banner ── */}
        {bannerState==='offered'&&prevOptions&&(
          <CarryOverBanner
            prevItem={prevOptions}
            onApply={applyCarryOver}
            onDismiss={()=>setBannerState('dismissed')}
          />
        )}
        {bannerState==='applied'&&(
          <div style={{gridColumn:'1/-1',marginBottom:12,padding:'8px 14px',background:'rgba(39,174,96,0.08)',border:'1px solid rgba(39,174,96,0.3)',borderRadius:8,fontSize:12,color:'#27ae60',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
            <span>✓</span> Options copied from previous item — adjust anything below as needed.
          </div>
        )}

        <Field label="Number High"><select value={form.numberHigh} onChange={e=>set('numberHigh',parseInt(e.target.value))}><option value={1}>1 High</option><option value={2}>2 High</option></select></Field>
        <div/>
        {form.numberHigh===1&&(
          <div style={{gridColumn:'1/-1',display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{flex:1}}><ImagePicker label="Window Style *" value={form.style} onChange={v=>set('style',v)} groups={WINDOW_STYLE_GROUPS}/></div>
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer',userSelect:'none',flexShrink:0}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em'}}>Insert</span>
              <div onClick={()=>set('insert',!form.insert)} style={{width:32,height:32,borderRadius:6,border:`2px solid ${form.insert?'var(--red)':'var(--border)'}`,background:form.insert?'var(--red)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}>
                {form.insert&&<span style={{color:'#fff',fontSize:18,fontWeight:900,lineHeight:1}}>✓</span>}
              </div>
            </label>
          </div>
        )}
        {form.numberHigh===2&&(
          <>
            <div style={{gridColumn:'1/-1',background:'rgba(192,57,43,0.06)',border:'1px solid rgba(192,57,43,0.25)',borderRadius:8,padding:'10px 14px',marginBottom:4}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,color:'var(--red)',letterSpacing:'0.08em',textTransform:'uppercase'}}>Bottom Window Style</div>
            </div>
            <div style={{gridColumn:'1/-1',display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{flex:1}}><ImagePicker label="Bottom Window Style *" value={form.style} onChange={v=>set('style',v)} groups={[{label:'Standard',styles:['Casement','Picture','Awning','Double Hung','Single Hung']}]}/></div>
              <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer',userSelect:'none',flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em'}}>Insert</span>
                <div onClick={()=>set('insert',!form.insert)} style={{width:32,height:32,borderRadius:6,border:`2px solid ${form.insert?'var(--red)':'var(--border)'}`,background:form.insert?'var(--red)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}>
                  {form.insert&&<span style={{color:'#fff',fontSize:18,fontWeight:900,lineHeight:1}}>✓</span>}
                </div>
              </label>
            </div>
          </>
        )}
        {cfg&&<>
          {cfg.wide.length>1&&<><Field label="Number Wide"><select value={form.numberWide} onChange={e=>set('numberWide',parseInt(e.target.value))}>{cfg.wide.map(n=><option key={n} value={n}>{n} Wide</option>)}</select></Field><div/></>}
          {cfg.facing&&<div style={{gridColumn:'auto'}}><SelectWithPreview label="Facing (from exterior)" value={form.facing} onChange={v=>set('facing',v)} imgMap={IMG.facing[form.style]||{}} opts={['Left','Right']} placeholder="Select..."/></div>}
          {cfg.sash&&<Field label="Sash Split" col="1/-1"><select value={form.sashSplit} onChange={e=>set('sashSplit',e.target.value)}><option value="">Select...</option><option>1/4 - 1/2 - 1/4</option><option>1/3 - 1/3 - 1/3</option></select></Field>}
          {panelCfg&&<>
            <SectionHeader>Configuration</SectionHeader>
            {panelCfg.type==='fixed'&&<Field label="Configuration" col="1/-1"><input value={panelCfg.value} disabled style={{opacity:0.6}}/></Field>}
            {panelCfg.type==='single'&&<div style={{gridColumn:'1/-1'}}><SelectWithPreview label="Configuration (from exterior)" value={form.standardConfig} onChange={v=>set('standardConfig',v)} imgMap={IMG.facing[form.style]||{}} opts={panelCfg.options} placeholder="Select..."/></div>}
            {panelCfg.type==='multi'&&<>
              <Field label="Configuration Type" col="1/-1"><select value={form.configType} onChange={e=>set('configType',e.target.value)}><option value="standard">Standard</option><option value="custom">Custom</option></select></Field>
              {form.configType==='standard'&&<Field label="Standard Configuration" col="1/-1">{panelCfg.standardOptions?<select value={form.standardConfig} onChange={e=>set('standardConfig',e.target.value)}><option value="">Select...</option>{panelCfg.standardOptions.map(o=><option key={o}>{o}</option>)}</select>:<input value={panelCfg.standard} disabled style={{opacity:0.6}}/>}</Field>}
              {form.configType==='custom'&&<Field label="Custom Panel Configuration" col="1/-1">
                <div style={{fontSize:11,color:'var(--red)',marginBottom:6,fontStyle:'italic'}}>Viewed from exterior</div>
                <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(panelCfg.panels,3)},1fr)`,gap:8}}>
                  {Array.from({length:panelCfg.panels}).map((_,i)=>{const names=getPanelNames(panelCfg.panels);return<div key={i}><div style={{fontSize:10,color:'var(--text-muted)',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{names[i]}</div><select value={form.panelConfigs[i]||''} onChange={e=>{const pc=[...form.panelConfigs];pc[i]=e.target.value;set('panelConfigs',pc)}}><option value="">Select...</option>{panelCfg.panelOptions.map(o=><option key={o}>{o}</option>)}</select></div>})}
                </div>
              </Field>}
            </>}
          </>}
          <SectionHeader>{form.numberHigh===2?'Bottom Window Measurements':'Measurements'}</SectionHeader>
          {cfg.mt===2?<Field label="Measurement Type" col="1/-1"><select value={form.measurementType} onChange={e=>set('measurementType',e.target.value)}><option>Frame Size</option><option>Rough Opening</option><option>Inside Opening</option></select></Field>:<Field label="Measurement Type" col="1/-1"><div style={{padding:'10px 14px',background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.3)',borderRadius:6,fontSize:14,color:'var(--red)',fontWeight:600}}>📐 Use Rough Opening measurements for this window type</div></Field>}
          {cfg.m.includes('w')&&<Field label="Width (inches) *"><MeasurementInput value={form.width} frac={form.widthFrac} onValue={v=>set('width',v)} onFrac={v=>set('widthFrac',v)}/></Field>}
          {cfg.m.includes('wo')&&<Field label="Width or Height (inches) *" col="1/-1"><MeasurementInput value={form.widthOrHeight} frac={form.widthOrHeightFrac} onValue={v=>set('widthOrHeight',v)} onFrac={v=>set('widthOrHeightFrac',v)}/></Field>}
          {cfg.m.includes('h')&&form.numberHigh===2?(<><Field label="Overall Height (in) *"><MeasurementInput value={form.overallHeight} frac={form.overallHeightFrac} onValue={v=>set('overallHeight',v)} onFrac={v=>set('overallHeightFrac',v)}/></Field><Field label="Bottom Window Height (in)"><MeasurementInput value={form.height} frac={form.heightFrac} onValue={v=>set('height',v)} onFrac={v=>set('heightFrac',v)}/></Field></>)
          :cfg.m.includes('h')?<Field label="Height (inches) *"><MeasurementInput value={form.height} frac={form.heightFrac} onValue={v=>set('height',v)} onFrac={v=>set('heightFrac',v)}/></Field>:null}
          {cfg.m.includes('s')&&form.numberHigh!==2&&<Field label="Short Side Height (in) *" col="1/-1"><MeasurementInput value={form.shortSideHeight} frac={form.shortSideHeightFrac} onValue={v=>set('shortSideHeight',v)} onFrac={v=>set('shortSideHeightFrac',v)}/></Field>}
          {cfg.bay&&<><Field label="Angle of Deflection"><select value={form.angleOfDeflection||''} onChange={e=>set('angleOfDeflection',e.target.value)}><option value="">Select...</option><option>30°</option><option>45°</option></select></Field><Field label="Flanker to Center Ratio"><select value={form.flankerRatio||''} onChange={e=>set('flankerRatio',e.target.value)}><option value="">Select...</option><option>1:2:1</option><option>1:1:1</option></select></Field></>}
          <SectionHeader>Color & Glass</SectionHeader>
          <SelectWithPreview label="Exterior Color *" value={form.exteriorColor} onChange={v=>set('exteriorColor',v)} imgMap={IMG.exteriorColor} opts={EXT_COLORS} placeholder="Select..."/>
          <Field label="Pane"><select value={form.pane} onChange={e=>set('pane',e.target.value)}><option>Double</option><option>Triple</option></select></Field>
          <SelectWithPreview label="Interior Color *" value={form.interiorColor} onChange={v=>set('interiorColor',v)} imgMap={IMG.interiorColor} opts={intColors} placeholder="Select..."/>
          <Field label="Tempered"><select value={form.tempered} onChange={e=>set('tempered',e.target.value)}><option>No</option><option>Yes</option></select></Field>
          <SelectWithPreview label="Glass Surface *" value={form.glassSurface} onChange={v=>set('glassSurface',v)} imgMap={IMG.glassSurface} opts={glassSurfaces} placeholder="Select..."/>
          <SelectWithPreview label="Decorative Glass" value={form.decorativeGlass} onChange={v=>set('decorativeGlass',v)} imgMap={IMG.decorativeGlass} opts={decorGlasses}/>
          <SectionHeader>Grille</SectionHeader>
          {renderGrille(null)}
          {(cfg.hw||cfg.sc||cfg.sm)&&<SectionHeader>Hardware & Screen</SectionHeader>}
          {cfg.hw&&<SelectWithPreview label="Hardware Color" value={form.hardwareColor} onChange={v=>set('hardwareColor',v)} imgMap={IMG.hardwareColor} opts={HARDWARE_COLORS} placeholder="Select..."/>}
          {cfg.sc&&<SelectWithPreview label="Interior Screen Color" value={form.screenColor} onChange={v=>set('screenColor',v)} imgMap={IMG.screenColor} opts={SCREEN_COLORS} placeholder="Select..."/>}
          {cfg.sm&&<SelectWithPreview label="Screen Mesh Type *" value={form.screenMesh} onChange={v=>set('screenMesh',v)} imgMap={IMG.screenMesh} opts={SCREEN_MESHES} placeholder="Select..."/>}
          {form.numberHigh===2&&cfg.m.includes('h')&&<>
            <div style={{gridColumn:'1/-1',background:'rgba(192,57,43,0.06)',border:'1px solid rgba(192,57,43,0.25)',borderRadius:8,padding:'10px 14px',marginTop:12,marginBottom:4}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,color:'var(--red)',letterSpacing:'0.08em',textTransform:'uppercase'}}>Top Window</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Color, glass, pane, hardware & screen match the bottom window.</div>
            </div>
            {base2Wide&&!forceRound&&<Field label="Top Window Width" col="1/-1"><select value={form.topWindowWidth} onChange={e=>set('topWindowWidth',parseInt(e.target.value))}><option value={1}>1 Wide</option><option value={2}>2 Wide</option></select></Field>}
            {base2Wide&&form.topWindowWidth===2&&!forceRound?(<>
              <SelectWithPreview label="Left Panel Style" value={form.topLeftStyle} onChange={v=>set('topLeftStyle',v)} imgMap={IMG.windows} opts={topOpts} placeholder="Select..."/>
              <SelectWithPreview label="Right Panel Style" value={form.topRightStyle} onChange={v=>set('topRightStyle',v)} imgMap={IMG.windows} opts={topOpts} placeholder="Select..."/>
              {WIN[form.topLeftStyle]?.facing&&<SelectWithPreview label="Left Panel Facing" value={form.topLeftFacing||''} onChange={v=>set('topLeftFacing',v)} imgMap={IMG.facing[form.topLeftStyle]||{}} opts={['Left','Right']} placeholder="Select..."/>}
              {WIN[form.topRightStyle]?.facing&&<SelectWithPreview label="Right Panel Facing" value={form.topRightFacing||''} onChange={v=>set('topRightFacing',v)} imgMap={IMG.facing[form.topRightStyle]||{}} opts={['Left','Right']} placeholder="Select..."/>}
              {WIN[form.topLeftStyle]?.m.includes('s')&&<Field label="Left Short Side (in)"><MeasurementInput value={form.topLeftShortSide} frac={form.topLeftShortSideFrac} onValue={v=>set('topLeftShortSide',v)} onFrac={v=>set('topLeftShortSideFrac',v)}/></Field>}
              {WIN[form.topRightStyle]?.m.includes('s')&&<Field label="Right Short Side (in)"><MeasurementInput value={form.topRightShortSide} frac={form.topRightShortSideFrac} onValue={v=>set('topRightShortSide',v)} onFrac={v=>set('topRightShortSideFrac',v)}/></Field>}
            </>):<div style={{gridColumn:'1/-1'}}><SelectWithPreview label="Top Window Style" value={form.topStyle} onChange={v=>{set('topStyle',v);set('topGrilleType','');set('topGrillePattern','')}} imgMap={IMG.windows} opts={forceRound?ROUND_TOP_WINDOW_STYLES:topOpts} placeholder="Select..."/></div>}
            {WIN[form.topStyle]?.facing&&<div style={{gridColumn:'auto'}}><SelectWithPreview label="Top Window Facing (from exterior)" value={form.topFacing||''} onChange={v=>set('topFacing',v)} imgMap={IMG.facing[form.topStyle]||{}} opts={['Left','Right']} placeholder="Select..."/></div>}
            <SectionHeader>Top Window Measurements</SectionHeader>
            <Field label="Top Window Height (in)"><MeasurementInput value={form.topHeight} frac={form.topHeightFrac} onValue={v=>set('topHeight',v)} onFrac={v=>set('topHeightFrac',v)}/></Field>
            {WIN[form.topStyle]?.m.includes('s')&&<Field label="Top Short Side Height (in)"><MeasurementInput value={form.topShortSideHeight} frac={form.topShortSideHeightFrac} onValue={v=>set('topShortSideHeight',v)} onFrac={v=>set('topShortSideHeightFrac',v)}/></Field>}
            <SectionHeader>Top Window Options</SectionHeader>
            <Field label="Tempered"><select value={form.topTempered||''} onChange={e=>set('topTempered',e.target.value)}><option value="">Same as bottom ({form.tempered})</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
            <SelectWithPreview label="Decorative Glass" value={form.topDecorativeGlass||''} onChange={v=>set('topDecorativeGlass',v)} imgMap={IMG.decorativeGlass} opts={['Same as bottom',...decorGlasses.filter(g=>g!=='None')]} placeholder={`Same as bottom (${form.decorativeGlass})`}/>
            <SectionHeader>Top Window Grille</SectionHeader>
            {renderGrille(form.topStyle||form.style)}
          </>}
          <SectionHeader>Extension Jamb & Casing</SectionHeader>
          <div style={{gridColumn:'1/-1',fontSize:12,color:'var(--text-muted)',marginBottom:4,fontStyle:'italic'}}>Leave blank if not needed.</div>
          <Field label="Jamb Depth (inches)"><MeasurementInput value={form.jambDepth} frac={form.jambDepthFrac} onValue={v=>set('jambDepth',v)} onFrac={v=>set('jambDepthFrac',v)}/></Field>
          <Field label="Jamb Type"><select value={form.jambType} onChange={e=>{set('jambType',e.target.value);if(!form.casingType)set('casingType',e.target.value)}}><option value="">Select...</option>{JAMB_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
          {form.jambType==='Other'&&<Field label="Jamb Type (specify)" col="1/-1"><input placeholder="Describe jamb type..." value={form.jambTypeOther||''} onChange={e=>set('jambTypeOther',e.target.value)}/></Field>}
          <Field label="Casing Width (inches)"><MeasurementInput value={form.casingWidth} frac={form.casingWidthFrac} onValue={v=>set('casingWidth',v)} onFrac={v=>set('casingWidthFrac',v)}/></Field>
          <Field label="Casing Type"><select value={form.casingType} onChange={e=>set('casingType',e.target.value)}><option value="">Select...</option>{JAMB_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
          {form.casingType==='Other'&&<Field label="Casing Type (specify)" col="1/-1"><input placeholder="Describe casing type..." value={form.casingTypeOther||''} onChange={e=>set('casingTypeOther',e.target.value)}/></Field>}
          <SelectWithPreview label="Casing Style" value={form.casingStyle} onChange={v=>set('casingStyle',v)} imgMap={IMG.casingStyle} opts={CASING_STYLES} placeholder="Select..."/>
          <Field label="LP Trim Color"><input placeholder="e.g. White (leave blank if none)" value={form.lpTrimColor} onChange={e=>set('lpTrimColor',e.target.value)}/></Field>
          <SectionHeader>Photos & Notes</SectionHeader>
          <Field label="Photos" col="1/-1">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto}/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <button type="button" className="btn-outline" onClick={()=>cameraRef.current.click()} style={{padding:'8px 16px',fontSize:13}}>📷 Take / Add Photo</button>
              {(form.photos||[]).map((p,i)=>(<div key={i} style={{position:'relative'}}><img src={p} alt="" style={{width:64,height:52,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)'}}/><button onClick={()=>removePhoto(i)} style={{position:'absolute',top:-6,right:-6,background:'#c0392b',border:'none',borderRadius:'50%',color:'#fff',width:18,height:18,fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>))}
            </div>
          </Field>
          <div style={{gridColumn:'1/-1',display:'flex',gap:24,marginBottom:4}}>
            {[['cutSiding','Cut Siding'],['takeDownSiding','Take Down Siding']].map(([key,label])=>(
              <label key={key} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
                <div onClick={()=>set(key,!form[key])} style={{width:24,height:24,borderRadius:5,border:`2px solid ${form[key]?'var(--red)':'var(--border)'}`,background:form[key]?'var(--red)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',flexShrink:0}}>
                  {form[key]&&<span style={{color:'#fff',fontSize:14,fontWeight:900,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{label}</span>
              </label>
            ))}
          </div>
          <Field label="Quantity"><input type="number" min="1" value={form.qty} onChange={e=>set('qty',e.target.value)}/></Field>
          <div/>
          <Field label="Notes / Special Instructions" col="1/-1"><textarea rows={2} placeholder="Any special notes..." value={form.notes} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></Field>
        </>}
      </div>
      <div style={{display:'flex',gap:10,marginTop:12}}>
        <button className="btn-gold" onClick={handleSave} style={{flex:1}}>Save Window</button>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Patio Door Form ──────────────────────────────────────────────────────────

function getHandingImgMap(doorCategory, isFrenchSliding, frenchSwing, panelCount, config) {
  if (!config || !panelCount) return null
  const cfg = config.toLowerCase()
  let prefix = ''
  if (doorCategory==='sliding') prefix = `${isFrenchSliding?'sliding-french':'sliding-patio'}-${panelCount}-${cfg}`
  else if (doorCategory==='french') prefix = `${frenchSwing==='inswing'?'inswing':'outswing'}-${panelCount}-${cfg}`
  else return null
  const L = IMG.handingImgs[`${prefix}-left`]
  const R = IMG.handingImgs[`${prefix}-right`]
  if (!L && !R) return null
  return {'Left': L, 'Right': R}
}

function getDoorConfigImgMap(doorCategory, isFrenchSliding, frenchSwing, bifoldSubtype) {
  if (doorCategory==='sliding') return IMG.doorConfigs[isFrenchSliding?'sliding-french':'sliding-patio']||{}
  if (doorCategory==='french')  return IMG.doorConfigs[frenchSwing==='inswing'?'inswing':'outswing']||{}
  if (doorCategory==='bifold')  return IMG.doorConfigs[{uni:'bifold-uni',access:'bifold-access',bipart:'bifold-bipart'}[bifoldSubtype]]||{}
  return {}
}

const DOOR_EMPTY = {
  itemType:'door',
  doorCategory:'',
  isFrenchSliding:false,
  frenchSwing:'',
  bifoldSubtype:'',
  panelCount:null,
  style:'',
  configuration:'',
  handing:'',
  measurementType:'Call Size',
  callWidth:'',callHeight:'',
  width:'',widthFrac:'',height:'',heightFrac:'',
  bifoldWidthKey:'',
  exteriorColor:'',interiorColor:'',
  glassSurface:'',decorativeGlass:'None',
  grilleType:'',grillePattern:'',
  handleStyle:'Cambridge',
  handleColorInt:'',handleColorExt:'',
  hingeColorInt:'',hingeColorExt:'',
  bifoldPanelHandleColor:'',bifoldExtHingeColor:'',bifoldIntHingeColor:'',
  screenType:'No Screen',screenMesh:'',
  jambSize:'4-9/16"',
  jambDepth:'',jambDepthFrac:'',jambType:'',jambTypeOther:'',
  casingWidth:'',casingWidthFrac:'',casingType:'',casingTypeOther:'',casingStyle:'',lpTrimColor:'',
  photos:[],qty:'1',notes:'',cutSiding:false,takeDownSiding:false,
}

// prevOptions: carry-over fields from last saved item (or null)
function DoorForm({initial,onSave,onCancel,prevOptions}) {
  const [bannerState,setBannerState]=useState(()=> prevOptions && !initial ? 'offered' : null)
  const [form,setForm]=useState(()=>initial?{...DOOR_EMPTY,...initial}:{...DOOR_EMPTY})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const cameraRef=useRef(null)

  // pendingCarryRef holds options so catBtn can re-merge them after resetting to DOOR_EMPTY
  const pendingCarryRef = useRef(null)

  const applyCarryOver = () => {
    if (!prevOptions) return
    // Derive door hardware colors from the carried colors when the previous item
    // was a window (which has no door hardware fields).
    const ext = prevOptions.exteriorColor || ''
    const int = prevOptions.interiorColor || ''
    const derived = {
      handleColorExt:        prevOptions.handleColorExt        || EXT_TO_HW[ext]  || '',
      handleColorInt:        prevOptions.handleColorInt        || INT_TO_HW[int]  || '',
      hingeColorInt:         prevOptions.hingeColorInt         || INT_TO_HW[int]  || '',
      hingeColorExt:         prevOptions.hingeColorExt         || EXT_TO_HW[ext]  || '',
      bifoldExtHingeColor:   prevOptions.bifoldExtHingeColor   || EXT_TO_BIFOLD(ext) || '',
      bifoldIntHingeColor:   prevOptions.bifoldIntHingeColor   || INT_TO_BIFOLD(int) || '',
      bifoldPanelHandleColor:prevOptions.bifoldPanelHandleColor|| INT_TO_BIFOLD(int) || '',
    }
    const merged = { ...prevOptions, ...derived }
    pendingCarryRef.current = merged
    setForm(f => ({ ...f, ...merged }))
    setBannerState('applied')
  }

  const currentStyle=deriveDoorStyle(form.doorCategory,form.isFrenchSliding,form.frenchSwing,form.bifoldSubtype,form.panelCount)
  const dtc=DOOR_TYPE_CONFIG[currentStyle]
  const category=dtc?.category||''
  const isBifold=category.startsWith('bifold')
  const panelRow=isBifold&&form.panelCount?getBifoldPanelRow(category,form.panelCount):null
  const panelCounts=getPanelCounts(form.doorCategory,form.bifoldSubtype)

  const {filteredConfigs,autoConfig}=!isBifold&&dtc ? resolveConfigs(dtc) : {filteredConfigs:[],autoConfig:null}
  const {filteredOps,autoOp}=isBifold&&panelRow ? resolveBifoldOps(panelRow) : {filteredOps:[],autoOp:null}
  const autoConf=autoConfig||autoOp

  const activeConfig=autoConf||form.configuration
  const needsHanding=dtc?.handingConfigs?.includes(activeConfig)||
    (category==='bifold_bipart'&&form.panelCount&&BIFOLD_BIPART[form.panelCount]?.handing)
  const handingOpts=category==='bifold_bipart'&&form.panelCount
    ? BIFOLD_BIPART[form.panelCount]?.handing
    : (dtc?.handingConfigs?.includes(activeConfig)?['Left','Right']:null)

  const hw=getDoorHardwareCfg(category,form.panelCount)
  const sc=getScreenCfg(category,form.panelCount)
  const intColors=getIntColors(form.exteriorColor)
  const glassSurfaces=GLASS_SURFACES['Double']
  const decoOpts=dtc?.decoGlass||['Obscure']
  const isFrenchStyle=category==='inswing_french'||category==='outswing_french'
  const handleImgMap=(isFrenchStyle||isBifold)?IMG.doorHandleFrench:IMG.doorHandleSliding
  const hingeIntMap=IMG.hingeInswingInt
  const hingeOpts=category==='outswing_french'?OUTSWING_HINGE_COLORS:HARDWARE_COLORS
  const widthKey=isBifold?(panelRow?.widthKey||''):(dtc?.widthKey||'')
  const heightKey=dtc?.heightKey||'h_french'

  // mountedRef guards: skip reset effects on initial render so editing doesn't wipe saved values
  const dStyleMounted=useRef(false)
  useEffect(()=>{
    if(!dStyleMounted.current){dStyleMounted.current=true;return}
    setForm(f=>({...f,configuration:'',handing:'',callWidth:'',callHeight:'',bifoldWidthKey:''}))
  },[currentStyle,form.panelCount])
  const dBifoldKeyMounted=useRef(false)
  useEffect(()=>{
    if(!dBifoldKeyMounted.current){dBifoldKeyMounted.current=true;return}
    if(isBifold&&panelRow)set('bifoldWidthKey',panelRow.widthKey||'')
  },[currentStyle,form.panelCount])
  const dHandingMounted=useRef(false)
  useEffect(()=>{
    if(!dHandingMounted.current){dHandingMounted.current=true;return}
    set('handing','')
  },[form.configuration])
  const dGrilleMounted=useRef(false)
  useEffect(()=>{
    if(!dGrilleMounted.current){dGrilleMounted.current=true;return}
    setForm(f=>({...f,grillePattern:''}))
  },[form.grilleType])
  // Safe on mount — validates/cascades
  useEffect(()=>{if(form.interiorColor&&!getIntColors(form.exteriorColor).includes(form.interiorColor))set('interiorColor','')},[form.exteriorColor])
  // Hardware/screen cascade — skip on mount so editing preserves saved values
  const dExtColorMounted=useRef(false)
  useEffect(()=>{
    if(!dExtColorMounted.current){dExtColorMounted.current=true;return}
    if(!form.exteriorColor)return
    const hwExt=EXT_TO_HW[form.exteriorColor]
    const bifoldExt=EXT_TO_BIFOLD(form.exteriorColor)
    setForm(f=>({
      ...f,
      handleColorExt: hwExt||f.handleColorExt,
      hingeColorExt:  hwExt||f.hingeColorExt,
      bifoldExtHingeColor: bifoldExt,
    }))
  },[form.exteriorColor])
  const dIntColorMounted=useRef(false)
  useEffect(()=>{
    if(!dIntColorMounted.current){dIntColorMounted.current=true;return}
    if(!form.interiorColor)return
    const hwInt=INT_TO_HW[form.interiorColor]
    const bifoldInt=INT_TO_BIFOLD(form.interiorColor)
    setForm(f=>({
      ...f,
      handleColorInt: hwInt||f.handleColorInt,
      hingeColorInt:  hwInt||f.hingeColorInt,
      bifoldIntHingeColor: bifoldInt,
      bifoldPanelHandleColor: bifoldInt,
    }))
  },[form.interiorColor])
  useEffect(()=>{if(form.jambType&&!form.casingType)set('casingType',form.jambType)},[form.jambType])

  const handlePhoto=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>set('photos',[...(form.photos||[]),ev.target.result]);r.readAsDataURL(file);e.target.value=''}
  const removePhoto=i=>set('photos',form.photos.filter((_,j)=>j!==i))

  const getMissing=()=>{
    const m=[]
    if(!currentStyle)m.push('Door type selection')
    if(!autoConf&&!form.configuration)m.push('Configuration')
    if(handingOpts&&!form.handing)m.push('Handing')
    if(form.measurementType==='Call Size'||!form.measurementType){
      if(!form.callWidth)m.push('Call Width')
      if(!form.callHeight)m.push('Call Height')
    } else {
      if(!form.width)m.push('Width')
      if(!form.height)m.push('Height')
    }
    if(!form.exteriorColor)m.push('Exterior Color')
    if(!form.interiorColor)m.push('Interior Color')
    if(!form.glassSurface)m.push('Glass Surface')
    if(sc.show&&sc.always&&!form.screenMesh)m.push('Screen Mesh')
    return m
  }

  const handleSave=()=>{
    if(!currentStyle){alert('Please complete door type selection.');return}
    if(isBifold&&!form.panelCount){alert('Please select number of panels.');return}
    const missing=getMissing()
    if(missing.length>0){alert(`Please fill in required fields:\n• ${missing.join('\n• ')}`);return}
    const finalConfig=autoConf||form.configuration
    onSave({...form,style:currentStyle,configuration:finalConfig,itemType:'door'})
  }

  const catBtn=(cat,label)=>{
    const sel=form.doorCategory===cat
    return(
      <button type="button" key={cat} onClick={()=>{setForm(f=>({...DOOR_EMPTY,...(pendingCarryRef.current||{}),doorCategory:cat,measurementType:'Call Size',photos:f.photos,qty:f.qty,notes:f.notes}))}}
        style={{flex:1,padding:'14px 8px',borderRadius:8,border:`2px solid ${sel?'var(--red)':'var(--border)'}`,background:sel?'rgba(192,57,43,0.08)':'transparent',color:sel?'var(--red)':'var(--text-muted)',fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,letterSpacing:'0.04em',cursor:'pointer',transition:'all 0.12s',textAlign:'center'}}>
        {label}
      </button>
    )
  }
  const panelBtn=(n)=>{
    const sel=form.panelCount===n
    return(
      <button type="button" key={n} onClick={()=>set('panelCount',n)}
        style={{width:44,height:38,borderRadius:6,border:`1.5px solid ${sel?'var(--blue)':'var(--border)'}`,background:sel?'rgba(74,144,217,0.12)':'transparent',color:sel?'var(--blue)':'var(--text-muted)',fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,cursor:'pointer',transition:'all 0.12s'}}>
        {n}
      </button>
    )
  }

  const noHw=!hw.stdHandle&&!hw.handleColorInt&&!hw.handleColorExt&&!hw.bifoldPanel&&!hw.bifoldExt&&!hw.bifoldInt&&!hw.hingeInt&&!hw.hingeExt

  return(
    <div style={{background:'var(--surface)',border:'2px solid var(--red)',boxShadow:'var(--shadow-lg)',borderRadius:10,padding:'20px',marginBottom:16}}>
      <div style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,letterSpacing:'0.08em',color:'var(--charcoal)',marginBottom:16,textTransform:'uppercase'}}>Patio Door Details</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>

        {/* ── Carry-Over Banner ── */}
        {bannerState==='offered'&&prevOptions&&(
          <CarryOverBanner
            prevItem={prevOptions}
            onApply={applyCarryOver}
            onDismiss={()=>setBannerState('dismissed')}
          />
        )}
        {bannerState==='applied'&&(
          <div style={{gridColumn:'1/-1',marginBottom:12,padding:'8px 14px',background:'rgba(39,174,96,0.08)',border:'1px solid rgba(39,174,96,0.3)',borderRadius:8,fontSize:12,color:'#27ae60',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
            <span>✓</span> Options copied from previous item — adjust anything below as needed.
          </div>
        )}

        {/* ── Step 1: Door Category ── */}
        <div style={{gridColumn:'1/-1',marginBottom:16}}>
          <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Door Type *</label>
          <div style={{display:'flex',gap:8}}>
            {catBtn('sliding','Sliding')}
            {catBtn('french','French Door')}
            {catBtn('bifold','Bi-Fold Door')}
          </div>
        </div>

        {form.doorCategory==='sliding'&&<>
          <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:20,marginBottom:12,flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>French Sliding?</span>
              <div onClick={()=>setForm(f=>({...f,isFrenchSliding:!f.isFrenchSliding,panelCount:null,configuration:'',handing:'',callWidth:'',callHeight:''}))}
                style={{width:30,height:30,borderRadius:6,border:`2px solid ${form.isFrenchSliding?'var(--blue)':'var(--border)'}`,background:form.isFrenchSliding?'var(--blue)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}>
                {form.isFrenchSliding&&<span style={{color:'#fff',fontSize:16,fontWeight:900,lineHeight:1}}>✓</span>}
              </div>
            </label>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Panels Wide *</label>
              <div style={{display:'flex',gap:6}}>{[2,3,4].map(n=>panelBtn(n))}</div>
            </div>
          </div>
        </>}

        {form.doorCategory==='french'&&<>
          <div style={{gridColumn:'1/-1',marginBottom:12}}>
            <ToggleRow label="Swing Direction *" value={form.frenchSwing} onChange={v=>setForm(f=>({...f,frenchSwing:v,panelCount:null,configuration:'',handing:'',callWidth:'',callHeight:''}))} options={['inswing','outswing']} labelFn={v=>v==='inswing'?'Inswing':'Outswing'}/>
            {form.frenchSwing&&<>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Panels Wide *</label>
              <div style={{display:'flex',gap:6}}>{[1,2,3].map(n=>panelBtn(n))}</div>
            </>}
          </div>
        </>}

        {form.doorCategory==='bifold'&&<>
          <div style={{gridColumn:'1/-1',marginBottom:12}}>
            <ToggleRow label="Bi-Fold Type *" value={form.bifoldSubtype} onChange={v=>setForm(f=>({...f,bifoldSubtype:v,panelCount:null,configuration:'',handing:'',callWidth:'',callHeight:''}))} options={['uni','access','bipart']} labelFn={v=>({uni:'Unidirectional',access:'w/ Access Panel',bipart:'Bi-Parting'}[v])}/>
            {form.bifoldSubtype&&<>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Panels Wide *</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{panelCounts.map(n=>panelBtn(n))}</div>
            </>}
          </div>
        </>}

        {currentStyle&&<>
          {IMG.doors[currentStyle]&&<div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:14,padding:'10px 14px',background:'rgba(192,57,43,0.05)',border:'1px solid rgba(192,57,43,0.2)',borderRadius:8,marginBottom:8}}>
            <div style={{width:80,height:64,overflow:'hidden',borderRadius:4,flexShrink:0}}>
              <img src={IMG.doors[currentStyle]} alt={currentStyle} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/>
            </div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,color:'var(--text)'}}>{currentStyle}</div>
          </div>}

          {autoConf ? (()=>{
            const configImgMap=getDoorConfigImgMap(form.doorCategory,form.isFrenchSliding,form.frenchSwing,form.bifoldSubtype)
            const configImg=configImgMap?.[autoConf]
            return(
              <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(192,57,43,0.05)',border:'1px solid rgba(192,57,43,0.2)',borderRadius:6,marginBottom:8}}>
                {configImg&&<div style={{width:80,height:64,borderRadius:4,flexShrink:0,background:'rgba(192,57,43,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <img src={configImg} alt={autoConf} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
                </div>}
                <div><span style={{fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em'}}>Configuration: </span><span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{autoConf}</span></div>
              </div>
            )
          })() : (filteredConfigs.length>0||filteredOps.length>0) ? (
            <div style={{gridColumn:'1/-1'}}>
              <SelectWithPreview label="Configuration (viewed from exterior) *" value={form.configuration} onChange={v=>set('configuration',v)} imgMap={getDoorConfigImgMap(form.doorCategory,form.isFrenchSliding,form.frenchSwing,form.bifoldSubtype)} opts={filteredConfigs.length>0?filteredConfigs:filteredOps} placeholder="Select..."/>
            </div>
          ) : null}

          {handingOpts&&(()=>{
            const handingImgMap=getHandingImgMap(form.doorCategory,form.isFrenchSliding,form.frenchSwing,form.panelCount,activeConfig)
            return handingImgMap
              ? <div style={{gridColumn:'1/-1'}}><SelectWithPreview label="Handing *" value={form.handing} onChange={v=>set('handing',v)} imgMap={handingImgMap} opts={handingOpts} placeholder="Select..."/></div>
              : <Field label="Handing *" col="1/-1"><select value={form.handing} onChange={e=>set('handing',e.target.value)}><option value="">Select...</option>{handingOpts.map(h=><option key={h}>{h}</option>)}</select></Field>
          })()}

          <SectionHeader>Measurement</SectionHeader>
          <Field label="Measurement Type" col="1/-1">
            <select value={form.measurementType} onChange={e=>set('measurementType',e.target.value)}>
              <option>Call Size</option>
              <option>Frame Size</option>
              <option>Rough Opening</option>
            </select>
          </Field>
          {(form.measurementType==='Call Size'||!form.measurementType)&&<>
            {widthKey&&<CallSizePicker label="Call Width *" value={form.callWidth} onChange={v=>set('callWidth',v)} widthKey={widthKey}/>}
            <CallHeightPicker label="Call Height *" value={form.callHeight} onChange={v=>set('callHeight',v)} heightKey={heightKey}/>
          </>}
          {form.measurementType==='Frame Size'&&<>
            <Field label="Width (inches) *"><MeasurementInput value={form.width} frac={form.widthFrac} onValue={v=>set('width',v)} onFrac={v=>set('widthFrac',v)}/></Field>
            <Field label="Height (inches) *"><MeasurementInput value={form.height} frac={form.heightFrac} onValue={v=>set('height',v)} onFrac={v=>set('heightFrac',v)}/></Field>
          </>}
          {form.measurementType==='Rough Opening'&&<>
            <Field label="Rough Opening Width (inches) *"><MeasurementInput value={form.width} frac={form.widthFrac} onValue={v=>set('width',v)} onFrac={v=>set('widthFrac',v)}/></Field>
            <Field label="Rough Opening Height (inches) *"><MeasurementInput value={form.height} frac={form.heightFrac} onValue={v=>set('height',v)} onFrac={v=>set('heightFrac',v)}/></Field>
          </>}

          <SectionHeader>Color & Glass</SectionHeader>
          <div>
            <SelectWithPreview label="Exterior Color *" value={form.exteriorColor} onChange={v=>set('exteriorColor',v)} imgMap={IMG.exteriorColor} opts={EXT_COLORS} placeholder="Select..."/>
            <SelectWithPreview label="Interior Color *" value={form.interiorColor} onChange={v=>set('interiorColor',v)} imgMap={IMG.interiorColor} opts={intColors} placeholder="Select..."/>
          </div>
          <div>
            <SelectWithPreview label="Glass Surface *" value={form.glassSurface} onChange={v=>set('glassSurface',v)} imgMap={IMG.glassSurface} opts={glassSurfaces} placeholder="Select..."/>
            <SelectWithPreview label="Decorative Glass" value={form.decorativeGlass} onChange={v=>set('decorativeGlass',v)} imgMap={IMG.decorativeGlass} opts={['None',...decoOpts]} placeholder="None"/>
          </div>

          <SectionHeader>Grille</SectionHeader>
          <SelectWithPreview label="Grille Type" value={form.grilleType} onChange={v=>{set('grilleType',v);set('grillePattern','')}} imgMap={IMG.grilleType} opts={['','GBG','SDL']} placeholder="None"/>
          {form.grilleType&&<SelectWithPreview label="Grille Pattern" value={form.grillePattern} onChange={v=>set('grillePattern',v)} imgMap={IMG.grillePattern} opts={STD_PATTERNS} placeholder="Select..."/>}

          <SectionHeader>Hardware</SectionHeader>
          {noHw&&<div style={{gridColumn:'1/-1',padding:'10px 14px',background:'rgba(74,144,217,0.06)',border:'1px solid rgba(74,144,217,0.2)',borderRadius:6,fontSize:13,color:'var(--text-muted)',fontStyle:'italic'}}>No hardware options for this configuration.</div>}
          {!noHw&&(()=>{
            const pc=form.panelCount
            const cat=category

            if(cat==='sliding') return(<>
              <div>
                <SelectWithPreview label="Exterior Handle Color" value={form.handleColorExt} onChange={v=>set('handleColorExt',v)} imgMap={IMG.doorHandleColorExt} opts={HARDWARE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="Interior Handle Color" value={form.handleColorInt} onChange={v=>set('handleColorInt',v)} imgMap={IMG.doorHandleColorInt} opts={HARDWARE_COLORS} placeholder="Select..."/>
              </div>
              <div>
                <SelectWithPreview label="Handle Style" value={form.handleStyle} onChange={v=>set('handleStyle',v)} imgMap={handleImgMap} opts={DOOR_HANDLE_STYLES} placeholder="Select..."/>
              </div>
            </>)

            if(cat==='inswing_french') return(<>
              <div>
                <SelectWithPreview label="Exterior Handle Color" value={form.handleColorExt} onChange={v=>set('handleColorExt',v)} imgMap={IMG.doorHandleColorExt} opts={HARDWARE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="Interior Handle Color" value={form.handleColorInt} onChange={v=>set('handleColorInt',v)} imgMap={IMG.doorHandleColorInt} opts={HARDWARE_COLORS} placeholder="Select..."/>
              </div>
              <div>
                <SelectWithPreview label="Handle Style" value={form.handleStyle} onChange={v=>set('handleStyle',v)} imgMap={handleImgMap} opts={DOOR_HANDLE_STYLES} placeholder="Select..."/>
                <SelectWithPreview label="Interior Hinge Color" value={form.hingeColorInt} onChange={v=>set('hingeColorInt',v)} imgMap={hingeIntMap} opts={HARDWARE_COLORS} placeholder="Select..."/>
              </div>
            </>)
            if(cat==='outswing_french') return(<>
              <div>
                <SelectWithPreview label="Exterior Handle Color" value={form.handleColorExt} onChange={v=>set('handleColorExt',v)} imgMap={IMG.doorHandleColorExt} opts={HARDWARE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="Interior Handle Color" value={form.handleColorInt} onChange={v=>set('handleColorInt',v)} imgMap={IMG.doorHandleColorInt} opts={HARDWARE_COLORS} placeholder="Select..."/>
              </div>
              <div>
                <SelectWithPreview label="Handle Style" value={form.handleStyle} onChange={v=>set('handleStyle',v)} imgMap={handleImgMap} opts={DOOR_HANDLE_STYLES} placeholder="Select..."/>
                <SelectWithPreview label="Exterior Hinge Color" value={form.hingeColorExt} onChange={v=>set('hingeColorExt',v)} imgMap={IMG.hingeOutswingExt} opts={OUTSWING_HINGE_COLORS} placeholder="Select..."/>
              </div>
            </>)

            if((cat==='bifold_bipart'&&pc===2)||(cat==='bifold_uni'&&pc===1)) return(<>
              <div>
                <SelectWithPreview label="Exterior Handle Color" value={form.handleColorExt} onChange={v=>set('handleColorExt',v)} imgMap={IMG.doorHandleColorExt} opts={HARDWARE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="Interior Handle Color" value={form.handleColorInt} onChange={v=>set('handleColorInt',v)} imgMap={IMG.doorHandleColorInt} opts={HARDWARE_COLORS} placeholder="Select..."/>
              </div>
              <div>
                <SelectWithPreview label="Handle Style" value={form.handleStyle} onChange={v=>set('handleStyle',v)} imgMap={handleImgMap} opts={DOOR_HANDLE_STYLES} placeholder="Select..."/>
                <SelectWithPreview label="BiFold Exterior Hinge Color" value={form.bifoldExtHingeColor} onChange={v=>set('bifoldExtHingeColor',v)} imgMap={IMG.bifoldExtHinge} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
              </div>
            </>)

            if((cat==='bifold_uni'&&[2,4,6].includes(pc))||(cat==='bifold_bipart'&&pc===4)) return(<>
              <div>
                <SelectWithPreview label="BiFold Exterior Hinge Color" value={form.bifoldExtHingeColor} onChange={v=>set('bifoldExtHingeColor',v)} imgMap={IMG.bifoldExtHinge} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="BiFold Interior Hinge Color" value={form.bifoldIntHingeColor} onChange={v=>set('bifoldIntHingeColor',v)} imgMap={IMG.bifoldIntHinge} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
              </div>
              <div>
                <SelectWithPreview label="BiFold Panel Handle Color" value={form.bifoldPanelHandleColor} onChange={v=>set('bifoldPanelHandleColor',v)} imgMap={IMG.bifoldPanelHandle} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
              </div>
            </>)

            return(<>
              <div>
                <SelectWithPreview label="Handle Style" value={form.handleStyle} onChange={v=>set('handleStyle',v)} imgMap={handleImgMap} opts={DOOR_HANDLE_STYLES} placeholder="Select..."/>
                <SelectWithPreview label="Exterior Handle Color" value={form.handleColorExt} onChange={v=>set('handleColorExt',v)} imgMap={IMG.doorHandleColorExt} opts={HARDWARE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="Interior Handle Color" value={form.handleColorInt} onChange={v=>set('handleColorInt',v)} imgMap={IMG.doorHandleColorInt} opts={HARDWARE_COLORS} placeholder="Select..."/>
              </div>
              <div>
                <SelectWithPreview label="BiFold Panel Handle Color" value={form.bifoldPanelHandleColor} onChange={v=>set('bifoldPanelHandleColor',v)} imgMap={IMG.bifoldPanelHandle} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="BiFold Exterior Hinge Color" value={form.bifoldExtHingeColor} onChange={v=>set('bifoldExtHingeColor',v)} imgMap={IMG.bifoldExtHinge} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
                <SelectWithPreview label="BiFold Interior Hinge Color" value={form.bifoldIntHingeColor} onChange={v=>set('bifoldIntHingeColor',v)} imgMap={IMG.bifoldIntHinge} opts={BIFOLD_HINGE_COLORS} placeholder="Select..."/>
              </div>
            </>)
          })()}

          {dtc?.jamb&&<><SectionHeader>Jamb Size</SectionHeader><Field label="Jamb Size" col="1/-1"><select value={form.jambSize} onChange={e=>set('jambSize',e.target.value)}><option>4-9/16"</option><option>6-9/16"</option></select></Field></>}

          <SectionHeader>Screen</SectionHeader>
          {!sc.show&&<div style={{gridColumn:'1/-1',padding:'8px 14px',background:'rgba(74,144,217,0.06)',border:'1px solid rgba(74,144,217,0.2)',borderRadius:6,fontSize:13,color:'var(--text-muted)',fontStyle:'italic'}}>Screen not available on outswing French doors.</div>}
          {sc.show&&sc.always&&<>
            <div style={{gridColumn:'1/-1',fontSize:12,color:'var(--text-muted)',fontStyle:'italic',marginBottom:4}}>Exterior screen included. Matches exterior color.</div>
            <SelectWithPreview label="Screen Mesh Type *" value={form.screenMesh} onChange={v=>set('screenMesh',v)} imgMap={IMG.screenMesh} opts={SCREEN_MESHES} placeholder="Select..."/>
            <div/>
          </>}
          {sc.show&&!sc.always&&<>
            <Field label="Screen Type" col="1/-1"><select value={form.screenType} onChange={e=>set('screenType',e.target.value)}>{sc.opts.map(o=><option key={o}>{o}</option>)}</select></Field>
            {form.screenType&&form.screenType!=='No Screen'&&
              <div style={{gridColumn:'1/-1',fontSize:12,color:'var(--text-muted)',fontStyle:'italic'}}>Mesh: Pleated Charcoal Mesh (standard for retractable screens).</div>
            }
          </>}

          <SectionHeader>Extension Jamb & Casing</SectionHeader>
          <div style={{gridColumn:'1/-1',fontSize:12,color:'var(--text-muted)',marginBottom:4,fontStyle:'italic'}}>Leave blank if not needed.</div>
          <Field label="Jamb Depth (inches)"><MeasurementInput value={form.jambDepth} frac={form.jambDepthFrac} onValue={v=>set('jambDepth',v)} onFrac={v=>set('jambDepthFrac',v)}/></Field>
          <Field label="Jamb Type"><select value={form.jambType} onChange={e=>{set('jambType',e.target.value);if(!form.casingType)set('casingType',e.target.value)}}><option value="">Select...</option>{JAMB_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
          {form.jambType==='Other'&&<Field label="Jamb Type (specify)" col="1/-1"><input placeholder="Describe jamb type..." value={form.jambTypeOther||''} onChange={e=>set('jambTypeOther',e.target.value)}/></Field>}
          <Field label="Casing Width (inches)"><MeasurementInput value={form.casingWidth} frac={form.casingWidthFrac} onValue={v=>set('casingWidth',v)} onFrac={v=>set('casingWidthFrac',v)}/></Field>
          <Field label="Casing Type"><select value={form.casingType} onChange={e=>set('casingType',e.target.value)}><option value="">Select...</option>{JAMB_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
          {form.casingType==='Other'&&<Field label="Casing Type (specify)" col="1/-1"><input placeholder="Describe casing type..." value={form.casingTypeOther||''} onChange={e=>set('casingTypeOther',e.target.value)}/></Field>}
          <SelectWithPreview label="Casing Style" value={form.casingStyle} onChange={v=>set('casingStyle',v)} imgMap={IMG.casingStyle} opts={CASING_STYLES} placeholder="Select..."/>
          <Field label="LP Trim Color"><input placeholder="e.g. White (leave blank if none)" value={form.lpTrimColor} onChange={e=>set('lpTrimColor',e.target.value)}/></Field>

          <SectionHeader>Photos & Notes</SectionHeader>
          <Field label="Photos" col="1/-1">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto}/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <button type="button" className="btn-outline" onClick={()=>cameraRef.current.click()} style={{padding:'8px 16px',fontSize:13}}>📷 Take / Add Photo</button>
              {(form.photos||[]).map((p,i)=>(<div key={i} style={{position:'relative'}}><img src={p} alt="" style={{width:64,height:52,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)'}}/><button onClick={()=>removePhoto(i)} style={{position:'absolute',top:-6,right:-6,background:'#c0392b',border:'none',borderRadius:'50%',color:'#fff',width:18,height:18,fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>))}
            </div>
          </Field>
          <div style={{gridColumn:'1/-1',display:'flex',gap:24,marginBottom:4}}>
            {[['cutSiding','Cut Siding'],['takeDownSiding','Take Down Siding']].map(([key,label])=>(
              <label key={key} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
                <div onClick={()=>set(key,!form[key])} style={{width:24,height:24,borderRadius:5,border:`2px solid ${form[key]?'var(--red)':'var(--border)'}`,background:form[key]?'var(--red)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',flexShrink:0}}>
                  {form[key]&&<span style={{color:'#fff',fontSize:14,fontWeight:900,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{label}</span>
              </label>
            ))}
          </div>
          <Field label="Quantity"><input type="number" min="1" value={form.qty} onChange={e=>set('qty',e.target.value)}/></Field>
          <div/>
          <Field label="Notes / Special Instructions" col="1/-1"><textarea rows={2} placeholder="Any special notes..." value={form.notes} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></Field>
        </>}
      </div>
      <div style={{display:'flex',gap:10,marginTop:12}}>
        <button className="btn-gold" onClick={handleSave} style={{flex:1}}>Save Door</button>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const newRoom=()=>({id:Date.now(),name:'',items:[]})

export default function App() {
  const [step,setStep]=useState('job')
  const [jobInfo,setJobInfo]=useState({customerName:'',jobId:'',jobName:'',address:'',estimator:'',notes:''})
  const [rooms,setRooms]=useState([newRoom()])
  const [addForm,setAddForm]=useState(null)
  const [editInfo,setEditInfo]=useState(null)
  const [submitting,setSubmitting]=useState(false)
  const [submitted,setSubmitted]=useState(false)

  // ── Last saved item's carry-over options (global across all rooms) ──────────
  // We track this at the app level so it persists even if you switch rooms.
  // It stores the extracted carry fields from the most recently saved item.
  const [lastOptions,setLastOptions]=useState(null)
  // ── Photo lightbox ──────────────────────────────────────────────────────────
  const [lightboxSrc,setLightboxSrc]=useState(null)
  // ── Track original photo URLs so we don't re-upload them in final measurement ──
  const [originalPhotoUrls,setOriginalPhotoUrls]=useState(new Set())

  // ── Final Measurement mode ─────────────────────────────────────────────────
  const [isFinalMeasurement,setIsFinalMeasurement]=useState(false)
  const [prevEstimateDate,setPrevEstimateDate]=useState(null)
  const [loadingPrevious,setLoadingPrevious]=useState(false)
  const [loadPreviousError,setLoadPreviousError]=useState(null)

  // ── Brian's schedule ────────────────────────────────────────────────────────
  const [schedule,setSchedule]=useState([])
  const [scheduleLoading,setScheduleLoading]=useState(true)
  const [scheduleError,setScheduleError]=useState(null)
  useEffect(()=>{
    fetch('/api/schedule')
      .then(r=>r.json())
      .then(d=>{if(d.error)throw new Error(d.error);setSchedule(d.tasks||[])})
      .catch(e=>setScheduleError(e.message))
      .finally(()=>setScheduleLoading(false))
  },[])

  const allItems=rooms.flatMap(r=>r.items)
  const setJob=(k,v)=>setJobInfo(f=>({...f,[k]:v}))
  const handleJobSelect=async s=>{
    setJobInfo(f=>({...f,customerName:s.customerName,jobId:s.jobId,jobName:s.jobName,address:s.address}))
    // Try to load previous estimate data for this job
    if(!s.jobId)return
    setLoadingPrevious(true)
    setLoadPreviousError(null)
    setIsFinalMeasurement(false)
    setPrevEstimateDate(null)
    try{
      const res=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'loadEstimateData',jobId:s.jobId})})
      const d=await res.json()
      if(d.error)throw new Error(d.error)
      if(d.estimateData){
        // Store the previous data — estimator can choose to load it
        setJobInfo(f=>({...f,_previousEstimate:d.estimateData,_previousEstimateDate:d.createdAt}))
        setPrevEstimateDate(d.createdAt)
        // Collect all original photo URLs so we don't re-upload them in final measurement
        const origPhotos=new Set()
        ;(d.estimateData.rooms||[]).forEach(r=>(r.items||[]).forEach(it=>(it.photos||[]).forEach(p=>origPhotos.add(p))))
        setOriginalPhotoUrls(origPhotos)
      }
    }catch(e){setLoadPreviousError(e.message)}
    finally{setLoadingPrevious(false)}
  }
  const jobValid=jobInfo.customerName.trim().length>0

  const updateRoom=(id,key,val)=>setRooms(rs=>rs.map(r=>r.id===id?{...r,[key]:val}:r))
  const deleteRoom=id=>setRooms(rs=>rs.filter(r=>r.id!==id))

  const saveItem=item=>{
    // Extract carry-over options from the saved item
    const fields = item.itemType==='door' ? DOOR_CARRY_FIELDS : WINDOW_CARRY_FIELDS
    setLastOptions(extractCarryFields(item, fields))

    if(editInfo){
      setRooms(rs=>rs.map(r=>r.id===editInfo.roomId?{...r,items:r.items.map((it,i)=>i===editInfo.itemIndex?item:it)}:r))
      setEditInfo(null)
    } else {
      setRooms(rs=>rs.map(r=>r.id===addForm.roomId?{...r,items:[...r.items,item]}:r))
      setAddForm(null)
    }
  }
  const removeItem=(roomId,idx)=>setRooms(rs=>rs.map(r=>r.id===roomId?{...r,items:r.items.filter((_,i)=>i!==idx)}:r))

  const handleDownloadPDF=()=>{const origRooms=isFinalMeasurement?(jobInfo._previousEstimate?.rooms||null):null;const doc=generatePDF(jobInfo,rooms,isFinalMeasurement,origRooms);const prefix=isFinalMeasurement?'Fettig-FinalMeasurement':'Fettig-Estimate';doc.save(`${prefix}-${jobInfo.customerName.replace(/\s+/g,'-')||'Draft'}-${Date.now()}.pdf`)}

  const compressPhoto=async(dataUrl,maxPx=1200,quality=0.75)=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>{
      const scale=Math.min(1,maxPx/Math.max(img.width,img.height))
      const canvas=document.createElement('canvas')
      canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale)
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
      resolve(canvas.toDataURL('image/jpeg',quality))
    };img.src=dataUrl
  })

  const handleSubmitToJobTread=async()=>{
    setSubmitting(true)
    try{
      // Upload directly to GCS — bypasses the 4.5MB serverless body limit entirely
      const uploadDirect=async(blob,fn,mt,folder)=>{
        // Step 1: get a signed GCS URL, passing size+mimeType so JobTread can create the slot
        const urlRes=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'getUploadUrl',jobId:jobInfo.jobId,fileName:fn,fileSize:blob.size,fileMimeType:mt,folder})})
        if(!urlRes.ok){const e=await urlRes.json().catch(()=>({}));throw new Error(e.error||`Failed to get upload URL for ${fn}`)}
        const {uploadRequestId,uploadUrl,uploadHeaders={}}=await urlRes.json()
        // Step 2: PUT file directly to GCS — include all required signed headers
        const gcsRes=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':mt,...uploadHeaders},body:blob})
        if(!gcsRes.ok){const t=await gcsRes.text().catch(()=>'');throw new Error(`GCS upload failed for ${fn}: ${gcsRes.status} ${t.slice(0,200)}`)}
        // Step 3: register the uploaded file with JobTread
        const regRes=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'registerFile',jobId:jobInfo.jobId,uploadRequestId,fileName:fn,targetFolder:folder})})
        if(!regRes.ok){const e=await regRes.json().catch(()=>({}));throw new Error(e.error||`Failed to register ${fn}`)}
      }
      const sanitize=n=>n.replace(/[/\\:*?"<>|]/g,'_').trim()
      const pdfName=isFinalMeasurement?'Final Measurement.pdf':'Estimate Notes.pdf'
      const origRooms=isFinalMeasurement?(jobInfo._previousEstimate?.rooms||null):null
      const doc=generatePDF(jobInfo,rooms,isFinalMeasurement,origRooms)
      // Generate PDF as a Blob for direct upload — no base64 encoding overhead
      const pdfBlob=doc.output('blob')
      await uploadDirect(pdfBlob,pdfName,'application/pdf','Fettig Estimator')
      // Save estimate data as JSON for future final measurements
      // Strip photo data (base64) from rooms — photos are already uploaded to JobTread separately
      // and including them would make the JSON too large (Vercel 4.5MB limit)
      if(!isFinalMeasurement){
        try{
          // Compress photos to tiny thumbnails (120px) for the JSON — just enough
          // to identify each window visually. Full photos are already on JobTread.
          const compressThumb=async(dataUrl)=>new Promise(resolve=>{
            const img=new Image();img.onload=()=>{
              // 600px at 85% quality — large enough to see details in lightbox (~30-60KB each)
              const maxPx=600,scale=Math.min(1,maxPx/Math.max(img.width,img.height))
              const c=document.createElement('canvas')
              c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale)
              c.getContext('2d').drawImage(img,0,0,c.width,c.height)
              resolve(c.toDataURL('image/jpeg',0.85))
            };img.onerror=()=>resolve(null);img.src=dataUrl
          })
          const roomsWithThumbs=await Promise.all(rooms.map(async r=>({
            ...r,
            items:await Promise.all(r.items.map(async it=>({
              ...it,
              photos:await Promise.all((it.photos||[]).map(p=>compressThumb(p))).then(ts=>ts.filter(Boolean))
            })))
          })))
          const estimateData={
            jobInfo:{...jobInfo,_previousEstimate:undefined,_previousEstimateDate:undefined},
            rooms:roomsWithThumbs,
            savedAt:new Date().toISOString()
          }
          const saveRes=await fetch('/api/submit',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({action:'saveEstimateData',jobId:jobInfo.jobId,estimateData})
          })
          if(!saveRes.ok){
            const saveErr=await saveRes.json().catch(()=>({}))
            console.error('Failed to save estimate data:',saveErr.error||saveRes.status)
            // Don't alert — PDF already uploaded successfully, this is secondary
          }
        }catch(e){console.error('Could not save estimate data:',e.message)}
      }
      const rc={}
      const photoErrors=[]
      for(const room of rooms){
        for(const item of room.items){
          for(const rawUrl of(item.photos||[])){
            // Skip photos that were in the original estimate — no re-uploading duplicates
            if(isFinalMeasurement&&originalPhotoUrls.has(rawUrl))continue
            const rn=sanitize(room.name||'Unknown Room')
            rc[rn]=(rc[rn]||0)+1
            const cnt=rc[rn]
            try{
              const dataUrl=await compressPhoto(rawUrl)
              // Convert base64 to Blob for direct GCS upload
              const byteStr=atob(dataUrl.split(',')[1])
              const arr=new Uint8Array(byteStr.length)
              for(let i=0;i<byteStr.length;i++)arr[i]=byteStr.charCodeAt(i)
              const photoBlob=new Blob([arr],{type:'image/jpeg'})
              await uploadDirect(photoBlob,`${rn}${cnt>1?` ${cnt}`:''}.jpg`,'image/jpeg','Estimate/Measurement Photos')
            }catch(err){photoErrors.push(`${rn} photo ${cnt}: ${err.message}`)}
          }
        }
      }
      setSubmitted(true)
      if(photoErrors.length>0)alert(`PDF uploaded successfully, but ${photoErrors.length} photo(s) failed:\n• ${photoErrors.join('\n• ')}`)
    }catch(err){alert('JobTread error: '+err.message)}finally{setSubmitting(false)}
  }

  // Determine what prevOptions to pass to the currently open form.
  // Only pass if there's a last item AND we're adding (not editing).
  const getPrevOptions = () => {
    if (editInfo) return null   // editing an existing item — no carry-over prompt
    if (!lastOptions) return null // first item ever
    return lastOptions
  }

  let gNum=1

  return(<>
    <div style={{maxWidth:900,margin:'0 auto',padding:'0 0 80px 0',background:'var(--bg)',minHeight:'100vh'}}>
      <div style={{background:'var(--surface)',borderBottom:'3px solid var(--orange)',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',padding:'18px 20px',position:'sticky',top:0,zIndex:100}}>
        <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:18,letterSpacing:'0.06em',color:'var(--charcoal)'}}>FETTIG MILLWORK & WINDOWS</div>
        <div style={{display:'flex',gap:6,marginTop:12}}>
          {[['job','1','Job Info'],['windows','2','Windows & Doors'],['review','3','Review & Submit']].map(([s,n,label])=>(
            <button key={s} className={step===s?'btn-gold':'btn-outline'} onClick={()=>{if(s==='windows'&&!jobValid)return;setStep(s)}} style={{flex:1,fontSize:12,padding:'7px 8px',opacity:(s==='windows'&&!jobValid)?0.4:1}}>{n}. {label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'20px 20px 0'}}>

        {step==='job'&&(
          <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>

            {/* ── Left: Brian's Schedule Panel ── */}
            <div style={{flex:'0 0 340px',minWidth:280,maxHeight:'calc(100vh - 140px)',overflowY:'auto',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',position:'sticky',top:80}}>
              <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',background:'rgba(232,98,42,0.05)'}}>
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,letterSpacing:'0.07em',color:'#e8622a',textTransform:'uppercase'}}>Brian's Estimates</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Tap a job to select it</div>
              </div>
              {scheduleLoading&&<div style={{padding:'24px 14px',textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>Loading schedule…</div>}
              {scheduleError&&<div style={{padding:'14px',fontSize:12,color:'#e74c3c',background:'#fff5f5',margin:10,borderRadius:6,border:'1px solid #fed7d7'}}>⚠️ {scheduleError}</div>}
              {!scheduleLoading&&!scheduleError&&schedule.length===0&&(
                <div style={{padding:'24px 14px',textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>No upcoming window or patio door estimates found.</div>
              )}
              {schedule.map(task=>{
                const isSelected=jobInfo.jobId&&jobInfo.jobId===task.jobId
                const isClickable=!!task.jobId
                return(
                  <div key={task.taskId}
                    onClick={()=>{
                      if(!isClickable)return
                      handleJobSelect({customerName:task.customerName||'',jobId:task.jobId,jobName:task.jobName||'',address:task.address||''})
                    }}
                    style={{
                      padding:'12px 14px',
                      borderBottom:'1px solid var(--border)',
                      cursor:isClickable?'pointer':'default',
                      background:isSelected?'rgba(232,98,42,0.08)':'transparent',
                      borderLeft:isSelected?'3px solid #e8622a':'3px solid transparent',
                      transition:'background 0.12s',
                      opacity:isClickable?1:0.55,
                    }}
                    onMouseEnter={e=>{if(isClickable&&!isSelected)e.currentTarget.style.background='rgba(232,98,42,0.04)'}}
                    onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background='transparent'}}
                  >
                    {/* Date + time row */}
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                      <span style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:12,color:'#e8622a',letterSpacing:'0.04em'}}>{task.dateLabel||'No date'}</span>
                      {task.timeLabel&&<span style={{fontSize:11,color:'var(--text-muted)'}}>· {task.timeLabel}</span>}
                      {!task.jobId&&<span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',background:'var(--border)',padding:'1px 5px',borderRadius:3}}>No Job</span>}
                      {isSelected&&<span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:'#e8622a',textTransform:'uppercase',letterSpacing:'0.06em'}}>✓ Selected</span>}
                    </div>
                    {/* Customer name */}
                    {task.customerName&&<div style={{fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:2,lineHeight:1.3}}>{task.customerName}</div>}
                    {/* Job name */}
                    {task.jobName&&<div style={{fontSize:12,color:'#4a90d9',fontWeight:600,marginBottom:4}}>{task.jobName}</div>}
                    {/* Address + phone */}
                    {(task.address||task.phone)&&(
                      <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.6,marginBottom:5}}>
                        {task.address&&<div>📍 {task.address}</div>}
                        {task.phone&&<div>📞 {task.phone}</div>}
                      </div>
                    )}
                    {/* Divider */}
                    <div style={{borderTop:'1px solid var(--border)',paddingTop:5,marginTop:2}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text)',marginBottom:task.taskDescription?2:0}}>{task.taskName}</div>
                      {task.taskDescription&&<div style={{fontSize:11,color:'var(--text-muted)',fontStyle:'italic',lineHeight:1.4}}>{task.taskDescription}</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Right: Job Info Form ── */}
            <div style={{flex:'1 1 300px',minWidth:260}}>
              <div style={{marginBottom:20}}>
                <div style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:700,letterSpacing:'0.04em',marginBottom:4,color:'var(--text)'}}>Job Information</div>
                <div style={{color:'var(--text-muted)',fontSize:13}}>Select from Brian's schedule or search below.</div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Search Customer</label>
                <CustomerJobSearch onSelect={handleJobSelect}/>
              </div>
              {loadingPrevious&&<div style={{marginBottom:12,padding:'10px 14px',background:'rgba(74,144,217,0.06)',border:'1px solid rgba(74,144,217,0.2)',borderRadius:8,fontSize:12,color:'var(--text-muted)'}}>🔍 Checking for previous estimate…</div>}
              {loadPreviousError&&<div style={{marginBottom:12,padding:'10px 14px',background:'#fff5f5',border:'1px solid #fed7d7',borderRadius:8,fontSize:12,color:'#e74c3c'}}>⚠️ Could not load previous estimate: {loadPreviousError}</div>}
              {prevEstimateDate&&!loadingPrevious&&!isFinalMeasurement&&(
                <div style={{marginBottom:14,borderRadius:10,overflow:'hidden',border:'1.5px solid rgba(232,98,42,0.4)',boxShadow:'0 2px 8px rgba(232,98,42,0.08)'}}>
                  <div style={{padding:'10px 14px',background:'linear-gradient(135deg,rgba(232,98,42,0.10),rgba(232,98,42,0.03))',borderBottom:'1px solid rgba(232,98,42,0.18)',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:16}}>📋</span>
                    <div>
                      <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:12,color:'#e8622a',letterSpacing:'0.08em',textTransform:'uppercase'}}>Previous Estimate Found</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>Submitted {new Date(prevEstimateDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                    </div>
                  </div>
                  <div style={{padding:'10px 14px',background:'rgba(0,0,0,0.02)',display:'flex',gap:8}}>
                    <button type="button" onClick={()=>{
                      const prev=jobInfo._previousEstimate
                      if(!prev)return
                      setRooms(prev.rooms||[newRoom()])
                      setIsFinalMeasurement(true)
                    }} style={{flex:1,padding:'9px 14px',borderRadius:6,border:'1.5px solid #e8622a',background:'#e8622a',color:'#fff',fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,cursor:'pointer',transition:'opacity 0.12s'}}
                      onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      📐 Load for Final Measurement
                    </button>
                    <button type="button" onClick={()=>{setPrevEstimateDate(null)}} style={{padding:'9px 14px',borderRadius:6,border:'1.5px solid var(--border)',background:'transparent',color:'var(--text-muted)',fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                      Start Fresh
                    </button>
                  </div>
                </div>
              )}
              {isFinalMeasurement&&(
                <div style={{marginBottom:14,padding:'10px 14px',background:'rgba(74,144,217,0.08)',border:'1.5px solid rgba(74,144,217,0.35)',borderRadius:8,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:18}}>📐</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:12,color:'#4a90d9',letterSpacing:'0.08em',textTransform:'uppercase'}}>Final Measurement Mode</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>Loaded from estimate — update measurements as needed</div>
                  </div>
                  <button type="button" onClick={()=>{setIsFinalMeasurement(false);setRooms([newRoom()])}} style={{padding:'5px 10px',borderRadius:5,border:'1px solid rgba(74,144,217,0.4)',background:'transparent',color:'#4a90d9',fontSize:11,fontWeight:700,cursor:'pointer'}}>✕ Cancel</button>
                </div>
              )}
              {jobInfo.customerName&&(
                <div style={{background:'rgba(232,98,42,0.08)',border:'1.5px solid #e8622a',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
                  <div style={{fontSize:11,color:'#e8622a',fontWeight:700,letterSpacing:'0.08em',marginBottom:6}}>SELECTED JOB</div>
                  <div style={{fontWeight:700,fontSize:15}}>{jobInfo.customerName}</div>
                  {jobInfo.jobName&&<div style={{fontSize:13,color:'var(--text-muted)',marginTop:3}}>📋 {jobInfo.jobName}</div>}
                  {jobInfo.address&&<div style={{fontSize:13,color:'var(--text-muted)',marginTop:2}}>📍 {jobInfo.address}</div>}
                  <button className="btn-outline" style={{marginTop:10,padding:'5px 12px',fontSize:12}} onClick={()=>setJobInfo({customerName:'',jobId:'',jobName:'',address:'',estimator:jobInfo.estimator,notes:jobInfo.notes})}>✕ Clear & search again</button>
                </div>
              )}
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>Estimator Name</label>
                <input placeholder="Your name" value={jobInfo.estimator} onChange={e=>setJob('estimator',e.target.value)}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>General Job Notes</label>
                <textarea rows={3} placeholder="Any general notes about this job..." value={jobInfo.notes} onChange={e=>setJob('notes',e.target.value)} style={{resize:'vertical'}}/>
              </div>
              <button className="btn-gold" style={{width:'100%',fontSize:16,padding:14,opacity:jobValid?1:0.5}} onClick={()=>jobValid&&setStep('windows')}>{isFinalMeasurement?'Next: Review Measurements →':'Next: Add Windows & Doors →'}</button>
            </div>

          </div>
        )}

        {step==='windows'&&(
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:700,letterSpacing:'0.04em',marginBottom:4,color:'var(--text)'}}>Windows & Doors</div>
              <div style={{color:'var(--text-muted)',fontSize:13}}>Organize by room for <span style={{color:'var(--red)'}}>{jobInfo.customerName}</span>.</div>
            </div>
            {rooms.map((room,ri)=>(
              <div key={room.id} style={{background:'var(--surface)',border:'1.5px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{background:'var(--red)',color:'var(--bg)',borderRadius:4,padding:'3px 10px',fontFamily:'var(--font-head)',fontWeight:700,fontSize:12,letterSpacing:'0.06em',flexShrink:0}}>ROOM {ri+1}</div>
                  <input placeholder="Room name (e.g. Living Room, Master Bedroom...)" value={room.name} onChange={e=>updateRoom(room.id,'name',e.target.value)} style={{flex:1,margin:0}}/>
                  {rooms.length>1&&<button className="btn-danger" onClick={()=>deleteRoom(room.id)} style={{flexShrink:0}}>✕</button>}
                </div>
                {room.items.map((item,idx)=>{
                  const num=gNum++
                  const isEditing=editInfo?.roomId===room.id&&editInfo?.itemIndex===idx
                  if(isEditing) return item.itemType==='door'
                    ?<DoorForm key={idx} initial={item} onSave={saveItem} onCancel={()=>setEditInfo(null)} prevOptions={null}/>
                    :<WindowForm key={idx} initial={item} onSave={saveItem} onCancel={()=>setEditInfo(null)} prevOptions={null}/>
                  return item.itemType==='door'
                    ?<DoorCard key={idx} door={item} index={num-1} onEdit={()=>{setAddForm(null);setEditInfo({roomId:room.id,itemIndex:idx})}} onRemove={()=>removeItem(room.id,idx)} onPhotoClick={isFinalMeasurement?setLightboxSrc:undefined} finalMode={isFinalMeasurement}/>
                    :<WindowCard key={idx} win={item} index={num-1} onEdit={()=>{setAddForm(null);setEditInfo({roomId:room.id,itemIndex:idx})}} onRemove={()=>removeItem(room.id,idx)} onPhotoClick={isFinalMeasurement?setLightboxSrc:undefined} finalMode={isFinalMeasurement}/>
                })}
                {addForm?.roomId===room.id&&!editInfo&&(
                  addForm.type==='door'
                    ?<DoorForm onSave={saveItem} onCancel={()=>setAddForm(null)} prevOptions={getPrevOptions()}/>
                    :<WindowForm onSave={saveItem} onCancel={()=>setAddForm(null)} prevOptions={getPrevOptions()}/>
                )}
                {(!addForm||addForm.roomId!==room.id)&&!editInfo&&(
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn-outline" style={{flex:1,padding:12,fontSize:14,borderStyle:'dashed'}} onClick={()=>{setAddForm({roomId:room.id,type:'window'});setEditInfo(null)}}>+ Add Window</button>
                    <button style={{flex:1,padding:12,fontSize:14,cursor:'pointer',borderRadius:6,background:'transparent',border:'1.5px dashed rgba(74,144,217,0.5)',color:'var(--blue)',fontFamily:'var(--font-head)',fontWeight:600,transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='rgba(74,144,217,0.05)'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(74,144,217,0.5)';e.currentTarget.style.background='transparent'}}
                      onClick={()=>{setAddForm({roomId:room.id,type:'door'});setEditInfo(null)}}>+ Add Patio Door</button>
                  </div>
                )}
              </div>
            ))}
            <button className="btn-outline" style={{width:'100%',padding:12,fontSize:14,marginBottom:16}} onClick={()=>setRooms(rs=>[...rs,newRoom()])}>+ Add Another Room</button>
            {allItems.length>0&&<button className="btn-gold" style={{width:'100%',fontSize:16,padding:14}} onClick={()=>setStep('review')}>{isFinalMeasurement?'Review Final Measurement':'Review Estimate'} ({allItems.length} item{allItems.length!==1?'s':''}) →</button>}
          </div>
        )}

        {step==='review'&&(
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:700,letterSpacing:'0.04em',marginBottom:4,color:'var(--text)'}}>{isFinalMeasurement?'Review Final Measurement':'Review & Submit'}</div>
              <div style={{color:'var(--text-muted)',fontSize:13}}>{isFinalMeasurement?'Review updated measurements, then submit to JobTread.':'Review everything, then send straight to JobTread.'}</div>
            </div>
            <div style={{background:'var(--surface)',border:'1.5px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderRadius:10,padding:'16px 18px',marginBottom:20}}>
              <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:15,color:'var(--red)',letterSpacing:'0.06em',marginBottom:10}}>{isFinalMeasurement?'FINAL MEASUREMENT SUMMARY':'ESTIMATE SUMMARY'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 16px',fontSize:13}}>
                <div><span style={{color:'var(--text-muted)'}}>Customer:</span> <strong>{jobInfo.customerName}</strong></div>
                {jobInfo.jobName&&<div><span style={{color:'var(--text-muted)'}}>Job:</span> {jobInfo.jobName}</div>}
                {jobInfo.address&&<div style={{gridColumn:'1/-1'}}><span style={{color:'var(--text-muted)'}}>Address:</span> {jobInfo.address}</div>}
                {jobInfo.estimator&&<div><span style={{color:'var(--text-muted)'}}>Estimator:</span> {jobInfo.estimator}</div>}
                <div><span style={{color:'var(--text-muted)'}}>Rooms:</span> <strong>{rooms.filter(r=>r.items.length>0).length}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Windows:</span> <strong>{allItems.filter(i=>i.itemType!=='door').length}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Patio Doors:</span> <strong>{allItems.filter(i=>i.itemType==='door').length}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Total Units:</span> <strong>{allItems.reduce((s,i)=>s+parseInt(i.qty||1),0)}</strong></div>
              </div>
            </div>
            {(()=>{let n=1;return rooms.filter(r=>r.items.length>0).map(room=>(
              <div key={room.id} style={{marginBottom:16}}>
                <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:13,color:'var(--red)',letterSpacing:'0.08em',marginBottom:8,textTransform:'uppercase'}}>{room.name||'Unnamed Room'}</div>
                {room.items.map((item,idx)=>{const num=n++;return item.itemType==='door'
                  ?<DoorCard key={idx} door={item} index={num-1} onEdit={()=>{setStep('windows');setTimeout(()=>setEditInfo({roomId:room.id,itemIndex:idx}),50)}} onRemove={()=>removeItem(room.id,idx)} onPhotoClick={isFinalMeasurement?setLightboxSrc:undefined} finalMode={isFinalMeasurement}/>
                  :<WindowCard key={idx} win={item} index={num-1} onEdit={()=>{setStep('windows');setTimeout(()=>setEditInfo({roomId:room.id,itemIndex:idx}),50)}} onRemove={()=>removeItem(room.id,idx)} onPhotoClick={isFinalMeasurement?setLightboxSrc:undefined} finalMode={isFinalMeasurement}/>})}
              </div>
            ))})()}
            <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:8}}>
              <button className="btn-outline" style={{width:'100%',fontSize:16,padding:14}} onClick={handleDownloadPDF}>📄 Download PDF</button>
              {!submitted?(
                <button className="btn-gold" style={{width:'100%',fontSize:16,padding:14}} onClick={handleSubmitToJobTread} disabled={submitting}>
                  {submitting?'⏳ Posting to JobTread...':`🔗 ${isFinalMeasurement?'Submit Final Measurement':'Post Estimate'} to ${jobInfo.jobName||'JobTread Job'}`}
                </button>
              ):(
                <div style={{background:'#f0fff4',border:'1.5px solid var(--green)',borderRadius:8,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:24,marginBottom:6}}>✅</div>
                  <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:16}}>Sent to JobTread!</div>
                  <div style={{color:'var(--text-muted)',fontSize:13,marginTop:4}}>{isFinalMeasurement?'Final Measurement.pdf':'Estimate Notes.pdf'} uploaded to <strong>{jobInfo.jobName}</strong>.</div>
                </div>
              )}
              <button className="btn-outline" style={{width:'100%',fontSize:14,padding:12}} onClick={()=>{setStep('job');setJobInfo({customerName:'',jobId:'',jobName:'',address:'',estimator:'',notes:''});setRooms([newRoom()]);setSubmitted(false);setLastOptions(null);setIsFinalMeasurement(false);setPrevEstimateDate(null);setLoadPreviousError(null);setOriginalPhotoUrls(new Set())}}>Start New Estimate</button>
            </div>
          </div>
        )}
      </div>
    </div>
    {/* ── Photo Lightbox Overlay ── */}
    {lightboxSrc&&(
      <div onClick={()=>setLightboxSrc(null)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
        <img src={lightboxSrc} alt="" style={{maxWidth:'94vw',maxHeight:'92vh',objectFit:'contain',borderRadius:8,boxShadow:'0 8px 48px rgba(0,0,0,0.8)'}}/>
        <div style={{position:'absolute',top:16,right:20,color:'#fff',fontSize:28,fontWeight:700,cursor:'pointer',lineHeight:1}} onClick={()=>setLightboxSrc(null)}>✕</div>
      </div>
    )}
  </>)
}
