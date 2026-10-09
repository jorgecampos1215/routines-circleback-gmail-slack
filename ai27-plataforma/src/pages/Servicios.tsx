import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { sx, fmtMXN } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { actions, useStore } from '../lib/store'
import { CLIENTES, custodios, unidades, type TipoServicio } from '../data/seed'
import { MONITORISTAS, filasServicios, type FilaServicio } from '../data/servicios'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.kpi{font-family:'Montserrat',sans-serif;font-size:28px;font-weight:600}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap;cursor:pointer;user-select:none}
.tbl th:hover{color:#0D1D41}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.track{height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden}
.srv-row{cursor:pointer}
.srv-row:hover td{background:#FAFBFC}
.mon{background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;border:1px solid transparent;cursor:pointer;font-family:inherit;color:#0D1D41;text-align:left}
.mon:hover,.mon[aria-pressed=true]{border-color:#475CC7}
`

type Tab = 'all' | TipoServicio
type Vista = 'Activos' | 'Todos' | 'Entregado' | 'Cerrado' | 'Con incidente'
type LogItem = { t: string; text: string; src: string; dot: string }

const ST: Record<string, string> = { 'En tránsito': 'pill p-info', 'Con incidente': 'pill p-bad', 'Confirmado': 'pill p-ok', 'Cotizado': 'pill p-mute', 'Entregado': 'pill p-ok', 'Cerrado': 'pill p-mute', 'Activo': 'pill p-info' }
const TABS: [Tab, string][] = [['all', 'Todos'], ['Por evento', 'Por evento'], ['Dedicado', 'Dedicados'], ['Monitoreo', 'Monitoreo']]
const VISTAS: [Vista, string][] = [['Activos', 'Activos'], ['Todos', 'Todo el trimestre'], ['Entregado', 'Entregados'], ['Cerrado', 'Cerrados'], ['Con incidente', 'Con incidente']]
const COLS: [keyof FilaServicio, string][] = [['id', 'Servicio'], ['client', 'Cliente'], ['type', 'Tipo'], ['route', 'Ruta / alcance'], ['cust', 'Custodios'], ['mon', 'Monitorista'], ['monto', 'Tarifa'], ['status', 'Estatus']]
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const dot = (c: string) => 'width:10px;height:10px;border-radius:50%;margin-top:5px;background:' + c
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtInicio = (iso: string) => `${parseInt(iso.slice(8, 10))} ${MESES[parseInt(iso.slice(5, 7)) - 1]} · ${iso.slice(11, 16)}`
const hhmm = (iso: string, plusMin: number) => { const d = new Date(iso); d.setMinutes(d.getMinutes() + plusMin); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

const LOG_24817: LogItem[] = [
  { t: '08:12', text: 'Check-in en CEDIS Cuautitlán, sellos verificados', src: 'Custodio R. Medina · foto adjunta', dot: dot('#4CC38A') },
  { t: '10:47', text: 'Parada autorizada · caseta Palmillas', src: 'Samsara · geocerca', dot: dot('#3FA7C9') },
  { t: '13:05', text: 'Frenado brusco · km 118', src: 'Samsara · evento de conductor', dot: dot('#475CC7') },
  { t: '14:30', text: 'Desvío de ruta 1.6 km fuera de geocerca', src: 'Samsara · alerta automática', dot: dot('#F0605D') },
  { t: '14:31', text: 'Llamada a custodio sin respuesta; se marca incidente', src: 'Monitorista L. Herrera', dot: dot('#F0605D') },
]

/** Detalle del servicio: SRV-24817 usa los datos exactos del diseño; el resto se arma desde los datos de la fila. */
function detalle(r: FilaServicio) {
  if (r.id === 'SRV-24817') {
    return {
      dl: [['Carga', 'Lácteos refrigerados · $2.4M', false], ['Tráiler', 'TR-88213', true], ['Operador cliente', 'Martín Ochoa', false], ['Custodios', 'R. Medina · E. Villa', false], ['Unidad custodia', 'AU-3321', true], ['Tarifa', '$38,500', true]] as [string, string, boolean][],
      log: LOG_24817,
    }
  }
  const evento = r.type === 'Por evento'
  const dl: [string, string, boolean][] = evento
    ? [['Ruta', r.route, false], ['Custodios', r.custNombres, false], ['Monitorista', r.mon, false], ['Inicio', fmtInicio(r.inicio), false], ['Unidad custodia', r.unidad, true], ['Tarifa', r.fee, true]]
    : [['Alcance', r.route, false], ['Custodios', r.custNombres, false], ['Monitorista', r.mon, false], ['Modalidad', r.type === 'Dedicado' ? 'Custodia dedicada' : 'Monitoreo como servicio', false], ['Zona · telemetría', `${r.zona} · ${r.fuente}`, false], ['Tarifa', r.fee, true]]
  const log: LogItem[] = []
  const t = (m: number) => hhmm(r.inicio, m)
  if (r.nuevo) {
    log.push({ t: 'hoy', text: 'Servicio creado y confirmado', src: 'Servicios · alta manual', dot: dot('#3FA7C9') })
    log.push({ t: '—', text: r.custNombres === 'por asignar' ? 'Pendiente de asignar custodios y unidad' : `Custodios asignados: ${r.custNombres} · unidad ${r.unidad}`, src: r.custNombres === 'por asignar' ? 'Asignación IA' : 'Coordinación de operaciones', dot: dot(r.custNombres === 'por asignar' ? '#475CC7' : '#4CC38A') })
  } else if (r.status === 'Cotizado') {
    log.push({ t: '09:20', text: 'Cotización enviada al cliente', src: 'Comercial', dot: dot('#AEB8C4') })
  } else if (r.status === 'Activo') {
    log.push({ t: '07:00', text: 'Inicio de turno, cobertura completa', src: r.mon !== '—' ? 'Monitorista ' + r.mon : 'Coordinación de custodios', dot: dot('#4CC38A') })
    log.push({ t: '12:15', text: 'Reporte de estatus enviado al cliente', src: 'Automático · cada 6 h', dot: dot('#3FA7C9') })
  } else {
    log.push({ t: t(-25), text: 'Check-in en origen, sellos verificados', src: `Custodio ${r.custNombres.split(', ')[0]} · foto adjunta`, dot: dot('#4CC38A') })
    if (r.status !== 'Confirmado') log.push({ t: t(0), text: 'Salida a ruta · ' + r.route, src: `${r.fuente} · geocerca`, dot: dot('#3FA7C9') })
    if (r.id === 'SRV-24822') log.push({ t: '13:50', text: 'Retraso de 40 min por tráfico en Querétaro', src: 'IA · riesgo de retraso', dot: dot('#475CC7') })
    if (r.status === 'En tránsito') log.push({ t: t(140), text: `Parada autorizada · caseta ${r.zona}`, src: `${r.fuente} · geocerca`, dot: dot('#3FA7C9') })
    if (r.status === 'Con incidente') { log.push({ t: t(190), text: 'Desvío de ruta fuera de geocerca', src: `${r.fuente} · alerta automática`, dot: dot('#F0605D') }); log.push({ t: t(192), text: 'Se marca incidente y se escala a Reacción', src: 'Monitorista ' + r.mon, dot: dot('#F0605D') }) }
    if (r.status === 'Entregado' || r.status === 'Cerrado') log.push({ t: t(380), text: 'Entrega confirmada en destino', src: 'Custodio · firma de recibido', dot: dot('#4CC38A') })
    if (r.status === 'Cerrado') log.push({ t: t(420), text: 'Servicio cerrado y facturado · ' + r.fee, src: 'Finanzas · CFDI timbrado', dot: dot('#AEB8C4') })
  }
  return { dl, log }
}

function etapas(r: FilaServicio) {
  const flujo = r.status === 'Activo' ? ['Cotizado', 'Confirmado', 'Activo', 'Cerrado'] : ['Cotizado', 'Confirmado', 'En tránsito', 'Con incidente', 'Entregado', 'Cerrado']
  const cur = flujo.indexOf(r.status)
  return flujo.map((s, i) => {
    if (s === 'Con incidente' && r.status !== 'Con incidente') return { s, cls: 'pill p-mute' }
    if (i < cur) return { s, cls: 'pill p-ok' }
    if (i === cur) return { s, cls: r.status === 'Con incidente' ? 'pill p-bad' : r.status === 'Cotizado' ? 'pill p-warn' : 'pill p-info' }
    return { s, cls: 'pill p-mute' }
  })
}

const FORM0 = { cliente: 'Alpura', tipo: 'Por evento' as TipoServicio, origen: '', destino: '', alcance: '', fecha: '2026-10-09', hora: '08:00', custodios: [] as string[], unidad: '', monitorista: 'L. Herrera', monto: '' }

export default function Servicios() {
  const toast = useToast()
  const creados = useStore(s => s.servicios)
  const clientesNuevos = useStore(s => s.clientesNuevos ?? [])
  const [tab, setTab] = useState<Tab>('all')
  const [vista, setVista] = useState<Vista>('Activos')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: keyof FilaServicio; dir: 1 | -1 } | null>(null)
  const [fMon, setFMon] = useState<string | null>(null)
  const [sel, setSel] = useState('SRV-24817')
  const [avisado, setAvisado] = useState(false)
  const [notas, setNotas] = useState<Record<string, LogItem[]>>({})
  const [evid, setEvid] = useState<Record<string, number>>({})
  const [nota, setNota] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(FORM0)
  const fileRef = useRef<HTMLInputElement>(null)

  const nuevos: FilaServicio[] = creados.map(s => ({
    id: s.id, client: s.cliente, type: s.tipo, route: s.ruta, cust: s.custodios ? String(s.custodios.split(', ').length) : (s.tipo === 'Monitoreo' ? '—' : '0'), custNombres: s.custodios || 'por asignar', mon: s.monitorista ?? '—',
    fee: fmtMXN(s.precio) + (s.tipo === 'Por evento' ? '' : '/mes'), monto: s.precio, status: 'Confirmado', activo: true, inicio: (s.fecha ?? s.creado.slice(0, 10)) + 'T08:00:00', zona: 'Centro', unidad: s.unidad || '—', fuente: 'Samsara', nuevo: true,
  }))
  const all = useMemo(() => [...nuevos, ...filasServicios], [creados]) // eslint-disable-line react-hooks/exhaustive-deps
  const enVista = useMemo(() => all.filter(r => vista === 'Activos' ? r.activo : vista === 'Todos' ? true : r.status === vista).filter(r => !fMon || r.mon === fMon), [all, vista, fMon])
  const nq = norm(q.trim())
  const rows = useMemo(() => {
    const r = enVista.filter(x => tab === 'all' || x.type === tab).filter(x => !nq || norm(x.id + ' ' + x.client + ' ' + x.route + ' ' + x.custNombres + ' ' + x.mon + ' ' + x.status).includes(nq))
    if (!sort) return r
    return [...r].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * sort.dir })
  }, [enVista, tab, nq, sort])
  const pg = usePagination(rows.length, 25)
  const count = (k: Tab) => (k === 'all' ? enVista : enVista.filter(x => x.type === k)).length
  const r = all.find(x => x.id === sel) ?? all[0]
  const d = detalle(r)
  const log = [...d.log, ...(notas[r.id] ?? [])]
  const nEvid = evid[r.id] ?? 0

  // Consola de monitoristas: carga calculada desde los servicios activos
  const activos = all.filter(x => x.activo)
  const mons = MONITORISTAS.map(name => {
    const mios = activos.filter(x => x.mon === name)
    const unidadesMon = mios.filter(x => x.type === 'Monitoreo').reduce((a, x) => a + (parseInt(x.route) || 0), 0)
    const alertas = mios.filter(x => x.status === 'Con incidente').length + (name === 'P. Ruiz' || name === 'J. Pech' ? 1 : 0)
    const n = name === 'S. Campos' ? unidadesMon : mios.length
    const texto = name === 'S. Campos' ? `Monitoreo como servicio · ${unidadesMon} unidades` : alertas === 0 ? 'Sin alertas' : `${alertas} alerta${alertas === 1 ? '' : 's'} abierta${alertas === 1 ? '' : 's'}`
    return { name, n, srv: mios.length, texto, bar: 'height:100%;width:' + Math.min(100, Math.round(n / (name === 'S. Campos' ? Math.max(80, unidadesMon) : 18) * 100)) + '%;background:' + (n >= 16 && name !== 'S. Campos' ? '#F0605D' : '#3FA7C9') }
  })

  const seleccionar = (id: string) => setSel(id)
  const cambiarTab = (k: Tab) => { setTab(k); pg.setPage(0); const vis = k === 'all' ? enVista : enVista.filter(x => x.type === k); if (vis.length && !vis.some(x => x.id === sel)) setSel(vis[0].id) }
  const cambiarVista = (v: Vista) => { setVista(v); pg.setPage(0); const vis = all.filter(x => v === 'Activos' ? x.activo : v === 'Todos' ? true : x.status === v); if (vis.length && !vis.some(x => x.id === sel)) setSel(vis[0].id) }
  const ordenar = (k: keyof FilaServicio) => { setSort(s => (s && s.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 })); pg.setPage(0) }

  const agregarNota = () => {
    const t = nota.trim()
    if (!t) return
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    setNotas(n => ({ ...n, [r.id]: [...(n[r.id] ?? []), { t: hh, text: t, src: 'Comentario del monitorista', dot: dot('#AEB8C4') }] }))
    setNota('')
    toast('Nota agregada a la bitácora de ' + r.id)
  }
  const avisar = () => { setAvisado(true); toast('Aviso de retraso enviado a Farmacéutica Orión · SRV-24822') }

  const clientesLista = useMemo(() => Array.from(new Set([...clientesNuevos.map(c => c.nombre), ...CLIENTES])), [clientesNuevos])
  const disponibles = useMemo(() => custodios.filter(c => c.estatus === 'Disponible'), [])
  const unidadesLibres = useMemo(() => unidades.filter(u => u.estatus === 'Disponible' || u.estatus === 'Operando').slice(0, 80), [])
  const abrirNuevo = () => { setForm({ ...FORM0, cliente: clientesLista[0] ?? 'Alpura' }); setOpen(true) }
  const crear = () => {
    const evento = form.tipo === 'Por evento'
    const ruta = evento ? `${form.origen.trim()} → ${form.destino.trim()}` : form.alcance.trim()
    if (evento ? !form.origen.trim() || !form.destino.trim() : !ruta) { toast(evento ? 'Indica origen y destino' : 'Describe el alcance del servicio', 'warn'); return }
    const monto = parseInt(form.monto.replace(/\D/g, '')) || (evento ? 24500 : form.tipo === 'Dedicado' ? 96000 : 43200)
    const nombres = form.custodios.map(id => { const c = custodios.find(x => x.id === id)!; const p = c.nombre.split(' '); return `${p[0][0]}. ${p[1]}` })
    const id = actions.crearServicio({ cliente: form.cliente, tipo: form.tipo, ruta, precio: monto, fecha: form.fecha, custodios: form.tipo === 'Monitoreo' ? undefined : nombres.join(', ') || undefined, unidad: form.tipo === 'Monitoreo' ? undefined : form.unidad || undefined, monitorista: form.monitorista })
    setOpen(false); setVista('Activos'); setTab('all'); setQ(''); setFMon(null); pg.setPage(0); setSel(id)
    toast(`Servicio ${id} creado para ${form.cliente} · ${fmtMXN(monto)}${evento ? '' : '/mes'}`)
  }
  const exportar = () => {
    const csv = [['Servicio', 'Cliente', 'Tipo', 'Ruta', 'Custodios', 'Monitorista', 'Tarifa', 'Estatus', 'Inicio'], ...rows.map(x => [x.id, x.client, x.type, x.route, x.custNombres, x.mon, x.monto, x.status, x.inicio])].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `servicios-${vista.toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast(`Exportados ${rows.length} servicios a CSV`)
  }
  const selectSt = inputStyle + ';width:auto;min-height:36px'

  return (
    <Shell active="servicios" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Operación</span>
          <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:32px;font-weight:600")}>Servicios</h1>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <Link className="btn" to={ROUTES.Cotizador}>Desde cotización</Link>
          <button type="button" className="btn btn-pri" onClick={abrirNuevo}>Nuevo servicio</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · servicios en riesgo de retraso</span><span style={sx('font-size:14px;color:#3E4A59')}><button type="button" onClick={() => { cambiarVista('Activos'); setSel('SRV-24822') }} style={sx('background:none;border:0;padding:0;font:inherit;color:#3448A8;cursor:pointer;text-decoration:underline')}>SRV-24822</button> (Farmacéutica Orión) va 40 min atrás de su ETA por tráfico en Querétaro. Avisar al cliente ahora mantiene el SLA de puntualidad, que va en 96.4%.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Puntualidad mensual de abril a septiembre: 94.1, 94.8, 95.2, 95.0, 95.9 y 96.4 por ciento" style={sx('display:block')}><path d="M10 60H210" stroke="#E4E8ED"></path><polyline points="10,47.8 50,38.2 90,32.7 130,35.4 170,23.1 210,16.2" fill="none" stroke="#3448A8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline><circle cx="210" cy="16.2" r="4" fill="#3448A8"></circle><text x="168" y="10" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#0D1D41">96.4%</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Puntualidad de entregas · abr a sep</figcaption>
        </figure>
        <button type="button" className="btn" onClick={avisar} disabled={avisado} style={sx(avisado ? 'background:#E3F6EC;border-color:#9ED9BC;color:#17784A;cursor:default' : '')}>{avisado ? 'Cliente avisado' : 'Avisar al cliente'}</button>
      </section>

      <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between')}>
        <div role="tablist" aria-label="Tipo de servicio" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={k === tab} className="btn" style={sx(k === tab ? 'background:#E9EDFB;border-color:#475CC7;color:#0D1D41' : '')} onClick={() => cambiarTab(k)}>{label} <span className="mono" style={sx('font-size:12px;opacity:.8')}>{count(k)}</span></button>
          ))}
        </div>
        <div style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:center')}>
          <select aria-label="Vista" value={vista} onChange={e => cambiarVista(e.target.value as Vista)} style={sx(selectSt)}>{VISTAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {fMon && <button type="button" className="pill p-warn" style={sx('border:0;cursor:pointer;font-family:inherit')} onClick={() => { setFMon(null); pg.setPage(0) }}>Monitorista: {fMon} ×</button>}
          <input type="search" aria-label="Buscar servicio" placeholder="Buscar folio, cliente, ruta" value={q} onChange={e => { setQ(e.target.value); pg.setPage(0) }} style={sx(selectSt + ';min-width:220px')} />
          <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={exportar}>Exportar CSV</button>
        </div>
      </div>

      <section className="card" style={sx('padding:8px 8px 8px')}>
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr>{COLS.map(([k, label]) => <th key={k} aria-sort={sort?.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} onClick={() => ordenar(k)}>{label}{sort?.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</th>)}</tr></thead>
            <tbody>
              {rows.slice(pg.from, pg.to).map(x => (
                <tr key={x.id} className="srv-row" aria-selected={x.id === r.id} tabIndex={0}
                  onClick={() => seleccionar(x.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(x.id) } }}
                  style={sx(x.id === r.id ? (x.status === 'Con incidente' ? 'background:#FFF5F5' : 'background:#F0F3FD') : x.status === 'Con incidente' ? 'background:#FFF5F5' : '')}>
                  <td className="mono">{x.id}</td><td>{x.client}{x.nuevo && <span className="pill p-warn" style={sx('margin-left:8px')}>Nuevo</span>}</td><td><span className="pill p-mute">{x.type}</span></td><td>{x.route}</td><td>{x.cust}</td><td>{x.mon}</td><td className="mono">{x.fee}</td><td><span className={ST[x.status]}>{x.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin servicios que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={sx('padding:0 4px')}><Pager {...pg} /></div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:18px')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span className="lbl">{r.id} · {r.type}</span>
              <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:22px;font-weight:600")}>{r.client} · {r.route}</h2>
            </div>
            <span className={ST[r.status]}>{r.status}</span>
          </div>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr));gap:14px 20px;font-size:14px')}>
            {d.dl.map(([k, v, mono]) => (
              <div key={k}><dt className="lbl">{k}</dt><dd className={mono ? 'mono' : undefined} style={sx('margin:4px 0 0')}>{v}</dd></div>
            ))}
          </dl>
          <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>
            {etapas(r).map(e => <span key={e.s} className={e.cls}>{e.s}</span>)}
          </div>
          <div style={sx('display:flex;gap:12px;flex-wrap:wrap;align-items:center')}>
            <Link className="btn btn-pri" to={ROUTES.Reaccion}>Escalar a Reacción</Link>
            <Link className="btn" to={ROUTES.Monitoreo}>Ver en mapa</Link>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Adjuntar evidencia</button>
            <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" style={sx('display:none')}
              onChange={e => { const n = e.target.files?.length ?? 0; if (n) { setEvid(v => ({ ...v, [r.id]: (v[r.id] ?? 0) + n })); toast(`${n} evidencia${n === 1 ? '' : 's'} adjunta${n === 1 ? '' : 's'} a ${r.id}`) } e.target.value = '' }} />
            {nEvid > 0 && <span className="pill p-ok">{nEvid} {nEvid === 1 ? 'evidencia adjunta' : 'evidencias adjuntas'}</span>}
          </div>
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Bitácora del servicio</h2>
          <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column')}>
            {log.map((l, i) => (
              <li key={i} style={sx('display:grid;grid-template-columns:56px 14px minmax(0,1fr);gap:12px;padding:8px 0')}>
                <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{l.t}</span>
                <span style={sx(l.dot)}></span>
                <span style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('font-size:14px')}>{l.text}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{l.src}</span></span>
              </li>
            ))}
          </ol>
          <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Comentario del monitorista
            <textarea rows={2} placeholder="Agregar nota a la bitácora (Enter para guardar)" value={nota} onChange={e => setNota(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregarNota() } }}
              style={sx("background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:10px 12px;font:400 14px 'Montserrat',sans-serif;resize:vertical")}></textarea>
          </label>
        </div>
      </section>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Consola de monitoristas</h2>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Turno vespertino · {MONITORISTAS.length} monitoristas · {activos.length} servicios activos</span>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
          {mons.map(m => (
            <button key={m.name} type="button" className="mon" aria-pressed={fMon === m.name} title="Filtrar la tabla por este monitorista" onClick={() => { setFMon(f => (f === m.name ? null : m.name)); setVista('Activos'); setTab('all'); pg.setPage(0) }}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px')}><span style={sx('font-weight:500')}>{m.name}</span><span className="mono" style={sx('font-size:13px')}>{m.n} srv</span></div>
              <div className="track"><div style={sx(m.bar)}></div></div>
              <span style={sx('font-size:12px;color:#5F6B7A')}>{m.texto}</span>
            </button>
          ))}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo servicio" width={640} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={crear}>Crear servicio</button></>}>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Cliente"><select value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} style={sx(inputStyle)}>{clientesLista.map(c => <option key={c} value={c}>{c}{clientesNuevos.some(x => x.nombre === c) ? ' · nuevo' : ''}</option>)}</select></Field>
          <Field label="Tipo de servicio"><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoServicio })} style={sx(inputStyle)}><option>Por evento</option><option>Dedicado</option><option>Monitoreo</option></select></Field>
        </div>
        {form.tipo === 'Por evento' ? (
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <Field label="Origen"><input value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} placeholder="CEDIS Cuautitlán" style={sx(inputStyle)} autoFocus /></Field>
            <Field label="Destino"><input value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} placeholder="Querétaro" style={sx(inputStyle)} /></Field>
          </div>
        ) : (
          <Field label="Alcance"><input value={form.alcance} onChange={e => setForm({ ...form, alcance: e.target.value })} placeholder={form.tipo === 'Dedicado' ? '2 custodios · Planta León · 12 meses' : '30 unidades · SLA 5 min · 24/7'} style={sx(inputStyle)} autoFocus /></Field>
        )}
        <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
          <Field label="Fecha de inicio"><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={sx(inputStyle)} /></Field>
          <Field label="Hora"><input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} style={sx(inputStyle)} /></Field>
          <Field label={form.tipo === 'Por evento' ? 'Monto (MXN)' : 'Monto mensual (MXN)'}><input inputMode="numeric" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder={form.tipo === 'Por evento' ? '24,500' : form.tipo === 'Dedicado' ? '96,000' : '43,200'} style={sx(inputStyle)} /></Field>
        </div>
        {form.tipo !== 'Monitoreo' && (
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <Field label={`Custodios disponibles (${disponibles.length}) · Ctrl/Cmd para varios`}>
              <select multiple size={5} value={form.custodios} onChange={e => setForm({ ...form, custodios: Array.from(e.target.selectedOptions).map(o => o.value) })} style={sx(inputStyle + ';min-height:120px;padding:6px')}>{disponibles.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.zona} · {c.id}</option>)}</select>
            </Field>
            <div style={sx('display:flex;flex-direction:column;gap:12px')}>
              <Field label="Unidad"><select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} style={sx(inputStyle)}><option value="">Por asignar</option>{unidadesLibres.map(u => <option key={u.id} value={u.id}>{u.id} · {u.vehiculo}{u.estatus === 'Disponible' ? ' · libre' : ''}</option>)}</select></Field>
              <Field label="Monitorista"><select value={form.monitorista} onChange={e => setForm({ ...form, monitorista: e.target.value })} style={sx(inputStyle)}>{MONITORISTAS.map(m => <option key={m}>{m}</option>)}</select></Field>
            </div>
          </div>
        )}
        {form.tipo === 'Monitoreo' && <Field label="Monitorista"><select value={form.monitorista} onChange={e => setForm({ ...form, monitorista: e.target.value })} style={sx(inputStyle)}>{MONITORISTAS.map(m => <option key={m}>{m}</option>)}</select></Field>}
        <span style={sx('font-size:12px;color:#5F6B7A')}>{form.custodios.length ? `${form.custodios.length} custodio${form.custodios.length === 1 ? '' : 's'} seleccionado${form.custodios.length === 1 ? '' : 's'}. ` : ''}El servicio se crea como Confirmado y aparece al inicio de la tabla y en los contadores.</span>
      </Modal>
    </Shell>
  )
}
