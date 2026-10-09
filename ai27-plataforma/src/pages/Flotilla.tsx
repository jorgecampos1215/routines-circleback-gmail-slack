import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { sx, fmtMXN } from '../lib/sx'
import { ZONAS, cargasCombustible as SEED_CARGAS, incidentes, ordenesTaller as SEED_OT, unidades, type CargaCombustible, type EstatusUnidad, type OrdenTaller, type Unidad, type Zona } from '../data/seed'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap;cursor:pointer;user-select:none}
.tbl th:hover{color:#0D1D41}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.tbl tr.sel td{background:#F0F3FD}
.tbl tbody tr{cursor:pointer}
.tbl tbody tr:hover td{background:#FAFBFC}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.k{font-family:'Montserrat',sans-serif;font-size:26px;font-weight:600}
.kpi{cursor:pointer;text-align:left;font-family:inherit;color:#0D1D41}
.kpi:hover{border-color:#475CC7}
.venc{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px;background:none;border-left:0;border-right:0;border-bottom:0;width:100%;cursor:pointer;font-family:inherit;color:#0D1D41;text-align:left}
.venc:hover{color:#0D1D41}
`

const ST: Record<string, string> = { 'Operando': 'pill p-info', 'Disponible': 'pill p-ok', 'En taller': 'pill p-warn', 'Siniestrada': 'pill p-bad', 'Baja': 'pill p-mute', 'Abierta': 'pill p-warn', 'Cerrada': 'pill p-ok', 'En aseguradora': 'pill p-info', 'Normal': 'pill p-ok', 'Anómalo': 'pill p-bad' }
type Tab = 'u' | 't' | 'c'
const TABS: [Tab, string][] = [['u', 'Unidades'], ['t', 'Taller'], ['c', 'Combustible']]
type Venc = 'none' | 'poliza' | 'verif' | 'km' | 'anomalo'
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (iso: string) => `${iso.slice(8, 10)} ${MESES[parseInt(iso.slice(5, 7)) - 1]}`
const HOY = '2026-10-08'
const EN_30 = '2026-11-07'
const ESTATUS_U: EstatusUnidad[] = ['Operando', 'Disponible', 'En taller', 'Siniestrada', 'Baja']
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Carga = CargaCombustible & { origen: 'Tarjeta' | 'Manual' }
const cargasSeed: Carga[] = SEED_CARGAS.map((c, i) => ({ ...c, origen: i % 9 === 4 ? 'Manual' : 'Tarjeta' }))

// Criterios de vencimiento (calculados desde seed)
const vencePoliza = (u: Unidad) => u.poliza.startsWith('vence') && u.polizaVence <= EN_30
const venceVerif = (u: Unidad) => u.verificacion.startsWith('vence')
const venceKm = (u: Unidad) => u.km % 10000 >= 9000
const anomalas = new Set(SEED_CARGAS.filter(c => c.anomalo).map(c => c.unidad))
const CRITERIO: Record<Venc, (u: Unidad) => boolean> = { none: () => true, poliza: vencePoliza, verif: venceVerif, km: venceKm, anomalo: u => anomalas.has(u.id) }

/** Costo del trimestre por unidad. AU-3321 conserva las cifras del diseño; el resto se deriva de seed (cargas, órdenes de taller y costo mensual). */
function costoTrimestre(u: Unidad, ordenes: OrdenTaller[], cargas: Carga[]) {
  if (u.id === 'AU-3321') return { comb: 41200, mant: 18300, seg: 12400, km: 18600 }
  const cg = cargas.filter(c => c.unidad === u.id)
  const ot = ordenes.filter(o => o.unidad === u.id && o.estatus !== 'En aseguradora')
  const comb = cg.length ? cg.reduce((a, c) => a + c.costo, 0) * Math.max(1, Math.round(12 / cg.length)) : Math.round(u.costoMes * 0.57 * 3)
  const mant = ot.length ? ot.reduce((a, o) => a + o.costo, 0) : Math.round(u.costoMes * 0.26 * 3)
  const seg = Math.round(u.costoMes * 0.17 * 3)
  const km = cg.length ? cg.reduce((a, c) => a + c.kmGps, 0) * Math.max(1, Math.round(12 / cg.length)) : Math.round(comb / 24.2 * u.rendimiento)
  return { comb, mant, seg, km }
}

export default function Flotilla() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('u')
  const [ordenes, setOrdenes] = useState<OrdenTaller[]>(SEED_OT)
  const [cargas, setCargas] = useState<Carga[]>(cargasSeed)
  const [selU, setSelU] = useState('AU-3321')
  const [q, setQ] = useState('')
  const [fEst, setFEst] = useState<'Todos' | EstatusUnidad>('Todos')
  const [fZona, setFZona] = useState<'Todas' | Zona>('Todas')
  const [fVenc, setFVenc] = useState<Venc>('none')
  const [fOT, setFOT] = useState<'Todas' | OrdenTaller['estatus']>('Todas')
  const [fCarga, setFCarga] = useState<'Todas' | 'Normal' | 'Anómalo'>('Todas')
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null)
  const [mOrden, setMOrden] = useState(false)
  const [mImport, setMImport] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fo, setFo] = useState({ unidad: 'AU-1450', tipo: 'Correctivo' as OrdenTaller['tipo'], falla: '', proveedor: 'Taller AI27 Cuautitlán', costo: '', dias: '3' })

  // KPIs desde seed
  const kpi = useMemo(() => {
    const operando = unidades.filter(u => u.estatus === 'Operando').length
    const diasProm = ordenes.reduce((a, o) => a + o.diasFuera, 0) / ordenes.length
    const unidadesConCarga = new Set(cargas.map(c => c.unidad)).size
    const kmCargas = cargas.reduce((a, c) => a + c.kmGps, 0)
    const kmMes = Math.round(kmCargas / cargas.length * operando * 6) // km promedio por carga × ~6 cargas al mes por unidad operando
    const rend = cargas.reduce((a, c) => a + c.rendimiento, 0) / cargas.length
    const costoMes = unidades.filter(u => u.estatus === 'Operando').reduce((a, u) => a + u.costoMes, 0)
    const siniestros = incidentes.filter(i => i.tipo === 'Accidente').length
    return { operando, total: unidades.length, pct: Math.round(operando / unidades.length * 100), diasProm, kmMes, rend, costoKm: costoMes / kmMes, siniestros }
  }, [ordenes, cargas])

  const venc = useMemo(() => ({ poliza: unidades.filter(vencePoliza).length, verif: unidades.filter(venceVerif).length, km: unidades.filter(venceKm).length, anomalo: anomalas.size }), [])

  const nq = norm(q.trim())
  const sortBy = <T,>(arr: T[], get: (x: T, k: string) => string | number) => !sort ? arr : [...arr].sort((a, b) => { const x = get(a, sort.k), y = get(b, sort.k); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * sort.dir })

  const rowsU = useMemo(() => sortBy(unidades.filter(u => (fEst === 'Todos' || u.estatus === fEst) && (fZona === 'Todas' || u.zona === fZona) && CRITERIO[fVenc](u) && (!nq || norm(u.id + ' ' + u.vehiculo + ' ' + u.placas + ' ' + u.custodio + ' ' + u.servicio).includes(nq))), (u, k) => (u as unknown as Record<string, string | number>)[k]), [fEst, fZona, fVenc, nq, sort])
  const rowsT = useMemo(() => sortBy(ordenes.filter(o => (fOT === 'Todas' || o.estatus === fOT) && (!nq || norm(o.id + ' ' + o.unidad + ' ' + o.falla + ' ' + o.proveedor).includes(nq))), (o, k) => (o as unknown as Record<string, string | number>)[k]), [ordenes, fOT, nq, sort])
  const rowsC = useMemo(() => sortBy(cargas.filter(c => (fCarga === 'Todas' || (fCarga === 'Anómalo') === c.anomalo) && (!nq || norm(c.unidad + ' ' + c.origen).includes(nq))), (c, k) => k === 'consumo' ? (c.anomalo ? 1 : 0) : (c as unknown as Record<string, string | number>)[k]), [cargas, fCarga, nq, sort])
  const total = tab === 'u' ? rowsU.length : tab === 't' ? rowsT.length : rowsC.length
  const pg = usePagination(total, 25)

  const sel = unidades.find(u => u.id === selU) ?? unidades[0]
  const costo = costoTrimestre(sel, ordenes, cargas)
  const costoTotal = costo.comb + costo.mant + costo.seg
  const maxCosto = Math.max(costo.comb, costo.mant, costo.seg)

  const cambiarTab = (k: Tab) => { setTab(k); setSort(null); pg.setPage(0) }
  const ordenar = (k: string) => { setSort(s => (s && s.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 })); pg.setPage(0) }
  const th = (k: string, label: string) => <th key={k} aria-sort={sort?.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} onClick={() => ordenar(k)}>{label}{sort?.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</th>
  const verUnidades = (est: 'Todos' | EstatusUnidad, v: Venc = 'none') => { setTab('u'); setFEst(est); setFVenc(v); setFZona('Todas'); setQ(''); setSort(null); pg.setPage(0) }
  const verTaller = (est: 'Todas' | OrdenTaller['estatus']) => { setTab('t'); setFOT(est); setQ(''); setSort(null); pg.setPage(0) }

  const guardarOrden = () => {
    if (!fo.falla.trim()) { toast('Describe la falla o el servicio', 'warn'); return }
    const costoN = parseInt(fo.costo.replace(/\D/g, '')) || (fo.tipo === 'Preventivo' ? 4500 : 12000)
    const id = 'OT-' + (1180 + ordenes.length + 1)
    const nueva: OrdenTaller = { id, unidad: fo.unidad, tipo: fo.tipo, falla: fo.falla.trim(), proveedor: fo.proveedor, costo: costoN, diasFuera: parseInt(fo.dias) || 1, estatus: 'Abierta', fecha: HOY }
    setOrdenes(o => [nueva, ...o])
    setMOrden(false); setFo({ ...fo, falla: '', costo: '' })
    verTaller('Todas')
    toast(`Orden ${id} abierta para ${fo.unidad} · ${fo.proveedor}`)
  }
  const cerrarOrden = (id: string) => { setOrdenes(o => o.map(x => (x.id === id ? { ...x, estatus: 'Cerrada' } : x))); toast(`Orden ${id} cerrada`) }

  const importar = () => {
    const n = archivo ? Math.min(60, Math.max(8, Math.round(archivo.size / 1200))) : 24
    const ops = unidades.filter(u => u.estatus === 'Operando')
    const nuevas: Carga[] = Array.from({ length: n }, (_, i) => {
      const u = ops[(i * 37 + n) % ops.length]
      const litros = 40 + ((i * 13) % 30)
      const km = 320 + ((i * 71) % 380)
      const rend = Math.round((km / litros) * 10) / 10
      return { unidad: u.id, fecha: `2026-10-${String(1 + (i % 7)).padStart(2, '0')}`, litros, costo: Math.round(litros * 24.2), kmGps: km, rendimiento: rend, anomalo: rend < 6.5, origen: 'Tarjeta' }
    })
    setCargas(c => [...nuevas, ...c])
    setMImport(false); setArchivo(null)
    setTab('c'); setFCarga('Todas'); setQ(''); setSort(null); pg.setPage(0)
    toast(`${n} cargas importadas${archivo ? ' de ' + archivo.name : ''} · ${nuevas.filter(x => x.anomalo).length} con consumo anómalo`)
  }
  const exportar = () => {
    const data: (string | number)[][] = tab === 'u' ? [['Unidad', 'Vehículo', 'Placas', 'Zona', 'Custodio', 'Servicio', 'GPS', 'Póliza', 'Estatus', 'Km'], ...rowsU.map(u => [u.id, u.vehiculo, u.placas, u.zona, u.custodio, u.servicio, u.gps, u.poliza, u.estatus, u.km])]
      : tab === 't' ? [['Orden', 'Unidad', 'Tipo', 'Falla', 'Proveedor', 'Costo', 'Días fuera', 'Estatus', 'Fecha'], ...rowsT.map(o => [o.id, o.unidad, o.tipo, o.falla, o.proveedor, o.costo, o.diasFuera, o.estatus, o.fecha])]
      : [['Fecha', 'Unidad', 'Origen', 'Litros', 'Costo', 'Km GPS', 'km/l', 'Consumo'], ...rowsC.map(c => [c.fecha, c.unidad, c.origen, c.litros, c.costo, c.kmGps, c.rendimiento, c.anomalo ? 'Anómalo' : 'Normal'])]
    const csv = data.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `flotilla-${TABS.find(t => t[0] === tab)![1].toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast(`Exportadas ${total} filas a CSV`)
  }

  const selectSt = inputStyle + ';width:auto;min-height:36px'
  const KPI = ({ label, v, sub, onClick }: { label: string; v: string; sub: string; onClick: () => void }) => (
    <button type="button" className="card kpi" onClick={onClick} style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">{label}</span><span className="k">{v}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{sub}</span></button>
  )

  return (
    <Shell active="flotilla" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Recursos</span>
          <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:32px;font-weight:600")}>Flotilla y taller</h1>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <button type="button" className="btn" onClick={() => setMImport(true)}>Importar cargas de tarjeta</button>
          <button type="button" className="btn btn-pri" onClick={() => setMOrden(true)}>Nueva orden de taller</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · mantenimiento predictivo y combustible</span><span style={sx('font-size:14px;color:#3E4A59')}>AU-1876 y AU-1688 rinden 35% menos que la flotilla y sus km de GPS no cuadran con las cargas: posible fuga o uso no autorizado. <button type="button" onClick={() => { setSelU('AU-1450'); verUnidades('Todos'); setQ('AU-1450') }} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>AU-1450</button> tiene 82% de probabilidad de falla de suspensión en los próximos 2,000 km.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Rendimiento en km por litro: AU-3321 10.3, AU-1876 6.8, AU-2214 10.2, AU-2087 10.2, AU-1688 6.9, AU-1450 9.9" style={sx('display:block')}><g><rect x="4" y="11.8" width="28" height="48.2" rx="2" fill="#475CC7"></rect><rect x="40" y="28.2" width="28" height="31.8" rx="2" fill="#D9534F"></rect><rect x="76" y="12.3" width="28" height="47.7" rx="2" fill="#475CC7"></rect><rect x="112" y="12.3" width="28" height="47.7" rx="2" fill="#475CC7"></rect><rect x="148" y="27.7" width="28" height="32.3" rx="2" fill="#D9534F"></rect><rect x="184" y="13.7" width="28" height="46.3" rx="2" fill="#475CC7"></rect></g></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>km/l por unidad · rojo: consumo anómalo</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:12px')}>
        <KPI label="Operando" v={kpi.pct + '%'} sub={`${kpi.operando} de ${kpi.total}`} onClick={() => verUnidades('Operando')} />
        <KPI label="Días en taller" v={kpi.diasProm.toFixed(1)} sub={`promedio · ${ordenes.length} órdenes`} onClick={() => verTaller('Todas')} />
        <KPI label="Km recorridos" v={(kpi.kmMes / 1e6).toFixed(2) + 'M'} sub="septiembre · GPS" onClick={() => { setTab('c'); setFCarga('Todas'); pg.setPage(0) }} />
        <KPI label="Rendimiento" v={kpi.rend.toFixed(1) + ' km/l'} sub="meta 10.5" onClick={() => { setTab('c'); setFCarga('Anómalo'); pg.setPage(0) }} />
        <KPI label="Costo por km" v={'$' + kpi.costoKm.toFixed(2)} sub="comb. + taller + seguro" onClick={() => document.getElementById('costo-unidad')?.scrollIntoView({ behavior: 'smooth' })} />
        <KPI label="Siniestros" v={String(kpi.siniestros)} sub="en el trimestre" onClick={() => verUnidades('Siniestrada')} />
      </section>

      <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between')}>
        <div role="tablist" aria-label="Sección" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={k === tab} className="btn" style={sx(k === tab ? 'background:#E9EDFB;border-color:#475CC7;color:#0D1D41' : '')} onClick={() => cambiarTab(k)}>{label} <span className="mono" style={sx('font-size:12px;opacity:.8')}>{k === 'u' ? unidades.length : k === 't' ? ordenes.length : cargas.length}</span></button>
          ))}
        </div>
        <div style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:center')}>
          {tab === 'u' && <>
            <select aria-label="Estatus" value={fEst} onChange={e => { setFEst(e.target.value as 'Todos' | EstatusUnidad); pg.setPage(0) }} style={sx(selectSt)}><option value="Todos">Todos los estatus</option>{ESTATUS_U.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select aria-label="Zona" value={fZona} onChange={e => { setFZona(e.target.value as 'Todas' | Zona); pg.setPage(0) }} style={sx(selectSt)}><option value="Todas">Todas las zonas</option>{ZONAS.map(z => <option key={z} value={z}>{z}</option>)}</select>
            {fVenc !== 'none' && <button type="button" className="pill p-warn" style={sx('border:0;cursor:pointer;font-family:inherit')} onClick={() => { setFVenc('none'); pg.setPage(0) }}>Filtro: {fVenc === 'poliza' ? 'póliza por vencer' : fVenc === 'verif' ? 'verificación' : fVenc === 'km' ? 'servicio por km' : 'consumo anómalo'} ×</button>}
          </>}
          {tab === 't' && <select aria-label="Estatus de orden" value={fOT} onChange={e => { setFOT(e.target.value as 'Todas' | OrdenTaller['estatus']); pg.setPage(0) }} style={sx(selectSt)}><option value="Todas">Todas las órdenes</option><option>Abierta</option><option>Cerrada</option><option>En aseguradora</option></select>}
          {tab === 'c' && <select aria-label="Consumo" value={fCarga} onChange={e => { setFCarga(e.target.value as 'Todas' | 'Normal' | 'Anómalo'); pg.setPage(0) }} style={sx(selectSt)}><option value="Todas">Todo el consumo</option><option>Normal</option><option>Anómalo</option></select>}
          <input type="search" aria-label="Buscar" placeholder={tab === 'u' ? 'Buscar unidad, placas, custodio' : tab === 't' ? 'Buscar orden, unidad, falla' : 'Buscar unidad'} value={q} onChange={e => { setQ(e.target.value); pg.setPage(0) }} style={sx(selectSt + ';min-width:220px')} />
          <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={exportar}>Exportar CSV</button>
        </div>
      </div>

      <section className="card" role="tabpanel" aria-label={TABS.find(t => t[0] === tab)![1]} style={sx('padding:8px 8px 8px')}>
        <div style={sx('overflow-x:auto')}>
          {tab === 'u' && (
            <table className="tbl">
              <thead><tr>{th('id', 'Unidad')}{th('vehiculo', 'Vehículo')}{th('placas', 'Placas')}{th('custodio', 'Custodio')}{th('servicio', 'Cliente / servicio')}{th('gps', 'GPS')}{th('poliza', 'Póliza')}{th('estatus', 'Estatus')}</tr></thead>
              <tbody>
                {rowsU.slice(pg.from, pg.to).map(u => (
                  <tr key={u.id} className={u.id === sel.id ? 'sel' : ''} aria-selected={u.id === sel.id} onClick={() => setSelU(u.id)} title="Ver costo de la unidad">
                    <td className="mono">{u.id}</td><td>{u.vehiculo}</td><td>{u.placas}</td><td>{u.custodio}</td><td>{u.servicio}</td><td>{u.gps}</td><td><span className={u.poliza.startsWith('vence') ? 'pill p-warn' : u.poliza === 'en trámite' ? 'pill p-mute' : ''}>{u.poliza}</span></td><td><span className={ST[u.estatus]}>{u.estatus}</span></td>
                  </tr>
                ))}
                {rowsU.length === 0 && <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin unidades que coincidan con los filtros.</td></tr>}
              </tbody>
            </table>
          )}
          {tab === 't' && (
            <table className="tbl">
              <thead><tr>{th('id', 'Orden')}{th('unidad', 'Unidad')}{th('tipo', 'Tipo')}{th('falla', 'Falla reportada')}{th('proveedor', 'Proveedor')}{th('costo', 'Costo')}{th('diasFuera', 'Días fuera')}{th('estatus', 'Estatus')}<th style={sx('cursor:default')}></th></tr></thead>
              <tbody>
                {rowsT.slice(pg.from, pg.to).map(o => (
                  <tr key={o.id} className={o.unidad === sel.id ? 'sel' : ''} onClick={() => setSelU(o.unidad)} title="Ver costo de la unidad">
                    <td className="mono">{o.id}</td><td className="mono">{o.unidad}</td><td>{o.tipo}</td><td>{o.falla}</td><td>{o.proveedor}</td><td className="mono">{o.estatus === 'En aseguradora' ? '—' : fmtMXN(o.costo)}</td><td className="mono">{o.diasFuera}</td><td><span className={ST[o.estatus]}>{o.estatus}</span></td>
                    <td>{o.estatus === 'Abierta' && <button type="button" className="btn" style={sx('min-height:32px;padding:0 10px')} onClick={e => { e.stopPropagation(); cerrarOrden(o.id) }}>Cerrar</button>}</td>
                  </tr>
                ))}
                {rowsT.length === 0 && <tr><td colSpan={9} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin órdenes que coincidan con los filtros.</td></tr>}
              </tbody>
            </table>
          )}
          {tab === 'c' && (
            <table className="tbl">
              <thead><tr>{th('fecha', 'Fecha')}{th('unidad', 'Unidad')}{th('origen', 'Origen')}{th('litros', 'Litros')}{th('costo', 'Costo')}{th('kmGps', 'Km GPS')}{th('rendimiento', 'km/l')}{th('consumo', 'Consumo')}</tr></thead>
              <tbody>
                {rowsC.slice(pg.from, pg.to).map((c, i) => (
                  <tr key={c.unidad + c.fecha + i} className={c.unidad === sel.id ? 'sel' : ''} onClick={() => setSelU(c.unidad)} title="Ver costo de la unidad">
                    <td>{fmtFecha(c.fecha)}</td><td className="mono">{c.unidad}</td><td>{c.origen}</td><td className="mono">{c.litros.toFixed(1)}</td><td className="mono">{fmtMXN(c.costo)}</td><td className="mono">{c.kmGps}</td><td className="mono">{c.rendimiento.toFixed(1)}</td><td><span className={ST[c.anomalo ? 'Anómalo' : 'Normal']}>{c.anomalo ? 'Anómalo' : 'Normal'}</span></td>
                  </tr>
                ))}
                {rowsC.length === 0 && <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin cargas que coincidan con los filtros.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div style={sx('padding:0 4px')}><Pager {...pg} /></div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:10px')}>
          <h2 style={sx("margin:0 0 6px;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Vencimientos próximos</h2>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'poliza')}><span>Pólizas de seguro · 30 días</span><span className="pill p-warn">{venc.poliza} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'verif')}><span>Verificación vehicular · 2° semestre</span><span className="pill p-bad">{venc.verif} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'km')}><span>Servicio por kilometraje · &lt; 1,000 km</span><span className="pill p-warn">{venc.km} unidades</span></button>
          <button type="button" className="venc" onClick={() => verUnidades('Todos', 'anomalo')}><span>Consumo anómalo vs km GPS</span><span className="pill p-bad">{venc.anomalo} unidades</span></button>
        </div>
        <div id="costo-unidad" className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 6px')}>
            <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Costo total · {sel.id} · trimestre</h2>
            <select aria-label="Unidad" value={sel.id} onChange={e => setSelU(e.target.value)} style={sx(selectSt)}>{unidades.map(u => <option key={u.id} value={u.id}>{u.id} · {u.vehiculo}</option>)}</select>
          </div>
          {([['Combustible', costo.comb], ['Mantenimiento', costo.mant], ['Seguro', costo.seg]] as [string, number][]).map(([k, v]) => (
            <div key={k} style={sx('display:grid;grid-template-columns:120px minmax(0,1fr) 90px;gap:12px;align-items:center;font-size:14px')}>
              <span>{k}</span>
              <div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.round(v / maxCosto * 100) + '%;background:#3FA7C9')}></div></div>
              <span className="mono" style={sx('text-align:right')}>{fmtMXN(v)}</span>
            </div>
          ))}
          <div style={sx('display:flex;justify-content:space-between;border-top:1px solid #E4E8ED;padding-top:10px;font-weight:600')}><span>Total</span><span className="mono">{fmtMXN(costoTotal)} · ${(costoTotal / costo.km).toFixed(2)}/km</span></div>
          <span style={sx('font-size:12px;color:#5F6B7A')}>{sel.vehiculo} · {sel.placas} · {sel.km.toLocaleString('es-MX')} km · {sel.custodio !== '—' ? sel.custodio + ' · ' + sel.servicio : sel.estatus}</span>
        </div>
      </section>

      <Modal open={mOrden} onClose={() => setMOrden(false)} title="Nueva orden de taller" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMOrden(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarOrden}>Abrir orden</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Unidad"><select value={fo.unidad} onChange={e => setFo({ ...fo, unidad: e.target.value })} style={sx(inputStyle)}>{unidades.map(u => <option key={u.id} value={u.id}>{u.id} · {u.vehiculo}</option>)}</select></Field>
          <Field label="Tipo"><select value={fo.tipo} onChange={e => setFo({ ...fo, tipo: e.target.value as OrdenTaller['tipo'] })} style={sx(inputStyle)}><option>Correctivo</option><option>Preventivo</option></select></Field>
        </div>
        <Field label="Falla reportada / servicio"><input value={fo.falla} onChange={e => setFo({ ...fo, falla: e.target.value })} placeholder="p. ej. Ruido en suspensión delantera" style={sx(inputStyle)} autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
          <Field label="Proveedor"><select value={fo.proveedor} onChange={e => setFo({ ...fo, proveedor: e.target.value })} style={sx(inputStyle)}>{['Taller AI27 Cuautitlán', 'Nissan Satélite', 'Toyota Querétaro', 'Servicio Express Bajío', 'Frenos y Clutch MTY', 'Taller convenio aseguradora'].map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Costo estimado (MXN)"><input inputMode="numeric" value={fo.costo} onChange={e => setFo({ ...fo, costo: e.target.value })} placeholder="12,000" style={sx(inputStyle)} /></Field>
          <Field label="Días fuera estimados"><input inputMode="numeric" value={fo.dias} onChange={e => setFo({ ...fo, dias: e.target.value })} style={sx(inputStyle)} /></Field>
        </div>
      </Modal>

      <Modal open={mImport} onClose={() => setMImport(false)} title="Importar cargas de tarjeta" width={520} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setMImport(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={importar}>Importar</button></>}>
        <span style={sx('font-size:14px;color:#3E4A59')}>Sube el estado de cuenta de la tarjeta de combustible (CSV o XLSX). Cada carga se cruza con los km del GPS para detectar consumo anómalo.</span>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={sx('display:none')} onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
        <button type="button" style={sx(btnStyle + ';justify-content:flex-start')} onClick={() => fileRef.current?.click()}>{archivo ? `${archivo.name} · ${(archivo.size / 1024).toFixed(1)} KB` : 'Elegir archivo…'}</button>
        <Field label="Proveedor de tarjeta"><select defaultValue="Edenred" style={sx(inputStyle)}><option>Edenred</option><option>Sodexo</option><option>Toka</option><option>Si Vale</option></select></Field>
        <span style={sx('font-size:12px;color:#5F6B7A')}>{archivo ? 'Listo para importar.' : 'Sin archivo se importan las cargas de prueba del periodo (24 registros).'}</span>
      </Modal>
    </Shell>
  )
}
