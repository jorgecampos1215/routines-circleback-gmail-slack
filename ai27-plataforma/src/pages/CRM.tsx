import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { Nota, PageHeader, Section } from '../components/Page'
import { ROUTES } from '../lib/routes'
import { actions, useStore, type Lead } from '../lib/store'
import { sx, fmtMXN } from '../lib/sx'
import { AUTOPARTES, clientesCRM, fmtM, incidentesDe, serviciosDe, todosLosClientes, type ClienteCRM } from '../data/crm'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
.k{font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600}
.crm-row{cursor:pointer}.crm-row:hover td{background:#FAFBFC}
.crm-row.sel td{background:#F0F3FD}
button.pill{border:0;cursor:pointer;font-family:'Montserrat',sans-serif}
.crm-deal{cursor:pointer}.crm-deal:hover{outline:1px solid #D5DBE3}
.crm-th{cursor:pointer;user-select:none}.crm-th:hover{color:#0D1D41}
.mv{width:24px;height:24px;border-radius:6px;border:1px solid #D5DBE3;background:#FFFFFF;color:#3E4A59;font-size:13px;cursor:pointer;padding:0;line-height:1}
.mv:disabled{opacity:.35;cursor:default}
.field select,.field input,.field textarea{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif;width:100%;box-sizing:border-box}
.cli{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:52px;padding:6px 12px;border-radius:8px;border:0;cursor:pointer;font:400 14px 'Montserrat',sans-serif;text-align:left;background:transparent;color:#0D1D41}
.cli:hover{background:#F3F5F8}
.cli[aria-pressed="true"]{background:#E9EDFB}
.kpi{background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px}
`

/** Clientes de la lista lateral del diseño (en ese orden). */
const LATERAL = ['Alpura', 'Marsh', 'Farmacéutica Orión', 'Autopartes Saltillo', 'Electrónica del Bajío', 'Logística Pacífico Norte', 'Bebidas del Golfo']

type Etapa = Lead['etapa']
const ETAPAS: Etapa[] = ['Prospecto', 'Diagnóstico', 'Cotizado', 'Negociación', 'Ganado']
type Deal = { id: string; name: string; what: string; amt: string; next: string; cls: string; etapa: Etapa; store?: boolean }
const D = (id: string, etapa: Etapa, name: string, what: string, amt: string, next: string, cls: string): Deal => ({ id, etapa, name, what, amt, next, cls: 'pill ' + cls })
const DEALS0: Deal[] = [
  D('d1', 'Prospecto', 'Grupo Textil Arrayán', 'Eventos Puebla–Pacífico', '$420K', 'Llamar 9 oct', 'p-mute'),
  D('d2', 'Prospecto', 'Cementos del Centro', 'Monitoreo 60 unidades', '$780K', 'Correo hoy', 'p-warn'),
  D('d3', 'Diagnóstico', 'Distribuidora Peninsular', 'Dedicado 4 custodios', '$560K', 'Visita 10 oct', 'p-info'),
  D('d4', 'Cotizado', 'Marsh', 'Méx–SLP nocturno', '$190K/evento', 'Seguimiento 8 oct', 'p-warn'),
  D('d5', 'Cotizado', 'Agroexport Sinaloa', 'Eventos Culiacán–Nogales', '$1.4M', 'Vencido 2 días', 'p-bad'),
  D('d6', 'Negociación', 'Farmacéutica Orión', 'Ampliar a Monterrey dedicado', '$1.6M', 'Junta 14 oct', 'p-info'),
  D('d7', 'Ganado', 'Autopartes Saltillo', 'Renovación 12 meses', '$188K/mes', 'Firmado', 'p-ok'),
]
/** Totales por etapa del diseño; al mover deals se ajustan con la diferencia. */
const TOTAL0: Record<Etapa, number> = { Prospecto: 1.2e6, Diagnóstico: 0.9e6, Cotizado: 2.1e6, Negociación: 1.6e6, Ganado: 0.7e6 }
const monto = (s: string) => { const m = /\$?([\d.]+)\s*([KM])?/i.exec(s); if (!m) return 0; const n = parseFloat(m[1]); return m[2]?.toUpperCase() === 'M' ? n * 1e6 : m[2]?.toUpperCase() === 'K' ? n * 1e3 : n }

type Actividad = { cliente: string; tipo: string; nota: string; fecha: string }
type SortKey = 'nombre' | 'modelo' | 'activos' | 'trimestre' | 'margen' | 'diasCobro' | 'ultimo'

const TH = 'text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED'
const TH_R = TH + ';text-align:right'
const PILL_ON = 'background:#E9EDFB;color:#0D1D41'
const td = 'padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap'
const hoy = () => new Date().toISOString().slice(0, 10)

export default function CRM() {
  const toast = useToast()
  const nuevos = useStore(s => s.clientesNuevos ?? [])
  const leadsStore = useStore(s => s.leads ?? [])
  const todos = useMemo(() => [...todosLosClientes(nuevos), AUTOPARTES], [nuevos])
  const tabla = useMemo(() => todosLosClientes(nuevos), [nuevos]) // los 25 de seed + altas
  const lateral = [...LATERAL.map(n => todos.find(c => c.nombre === n)!).filter(Boolean), ...nuevos.map(n => todos.find(c => c.nombre === n.nombre)!).filter(Boolean)]

  const [selName, setSelName] = useState('Alpura')
  const [filtro, setFiltro] = useState<'todos' | 'portal' | 'vencidos'>('todos')
  const [busca, setBusca] = useState('')
  const [buscaLat, setBuscaLat] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: 'trimestre', d: -1 })
  const [desdeTabla, setDesdeTabla] = useState(false)
  const [deals, setDeals] = useState<Deal[]>(DEALS0)
  const [acts, setActs] = useState<Actividad[]>([
    { cliente: 'Alpura', tipo: 'Llamada', nota: 'Confirmó 3 eventos nocturnos para la semana del 13 oct.', fecha: '2026-10-06' },
    { cliente: 'Marsh', tipo: 'Correo', nota: 'Enviada cotización COT-1182 Méx–SLP.', fecha: '2026-10-07' },
  ])
  // modales
  const [altaOpen, setAltaOpen] = useState(false)
  const [alta, setAlta] = useState({ nombre: '', sector: 'Alimentos y bebidas', contacto: '', correo: '', telefono: '', tipo: 'Por evento' as ClienteCRM['modelo'], tarifa: '' })
  const [leadOpen, setLeadOpen] = useState(false)
  const [lead, setLead] = useState({ empresa: '', que: '', monto: '', siguiente: 'Llamar mañana' })
  const [actOpen, setActOpen] = useState(false)
  const [act, setAct] = useState({ tipo: 'Llamada', nota: '' })
  const [propOpen, setPropOpen] = useState(false)
  const [prop, setProp] = useState({ para: '', asunto: '', msg: '' })

  const sel = todos.find(c => c.nombre === selName) ?? clientesCRM[0]
  const svSel = useMemo(() => serviciosDe(sel.nombre), [sel.nombre])
  const incSel = useMemo(() => incidentesDe(sel.nombre), [sel.nombre])
  const actsSel = acts.filter(a => a.cliente === sel.nombre)
  const vista = useRef<HTMLDivElement>(null)
  const pick = (name: string, scroll = true) => {
    if (!todos.some(c => c.nombre === name)) return
    setSelName(name)
    if (scroll) vista.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Lista lateral: los principales del diseño + altas; si se busca, cualquiera de los 25.
  const ql = buscaLat.trim().toLowerCase()
  const lateralView = ql ? todos.filter(c => c.nombre.toLowerCase().includes(ql) || c.sector.toLowerCase().includes(ql)) : lateral

  // Tabla: filtro + búsqueda + orden + paginación
  const q = busca.trim().toLowerCase()
  const rows = useMemo(() => {
    let r = tabla
    if (filtro === 'portal') r = r.filter(c => c.portal)
    if (filtro === 'vencidos') r = r.filter(c => c.cobranza !== 'Al corriente')
    if (q) r = r.filter(c => c.nombre.toLowerCase().includes(q) || c.modelo.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q))
    const ultimoN = (s: string) => s === 'hoy' ? 0 : s === 'ayer' ? 1 : s === 'continuo' ? -1 : s === '—' ? 999 : parseInt(s.replace(/\D/g, '')) || 0
    return [...r].sort((a, b) => {
      const k = sort.k
      const va = k === 'ultimo' ? ultimoN(a.ultimo) : a[k], vb = k === 'ultimo' ? ultimoN(b.ultimo) : b[k]
      return (typeof va === 'string' ? String(va).localeCompare(String(vb), 'es') : (va as number) - (vb as number)) * sort.d
    })
  }, [tabla, filtro, q, sort])
  const pg = usePagination(rows.length, 25)
  const toggleSort = (k: SortKey) => setSort(s => (s.k === k ? { k, d: s.d === 1 ? -1 : 1 } : { k, d: k === 'nombre' || k === 'modelo' ? 1 : -1 }))
  const arrow = (k: SortKey) => (sort.k === k ? (sort.d === 1 ? ' ▲' : ' ▼') : '')

  // Pipeline: deals del diseño (estado local) + leads del store
  const allDeals: Deal[] = [...deals, ...leadsStore.map(l => D(l.id, l.etapa, l.empresa, l.que, l.monto || '—', l.siguiente, 'p-mute')).map(d => ({ ...d, store: true }))]
  const totalEtapa = (e: Etapa) => {
    const base = TOTAL0[e] - DEALS0.filter(d => d.etapa === e).reduce((a, d) => a + monto(d.amt), 0)
    return Math.max(0, base + allDeals.filter(d => d.etapa === e).reduce((a, d) => a + monto(d.amt), 0))
  }
  const mover = (d: Deal, dir: 1 | -1) => {
    const i = ETAPAS.indexOf(d.etapa) + dir
    if (i < 0 || i >= ETAPAS.length) return
    const etapa = ETAPAS[i]
    if (d.store) actions.moverLead(d.id, etapa)
    else setDeals(ds => ds.map(x => (x.id === d.id ? { ...x, etapa, cls: etapa === 'Ganado' ? 'pill p-ok' : x.cls, next: etapa === 'Ganado' ? 'Firmado' : x.next } : x)))
    toast(`${d.name} movido a ${etapa}`, 'info')
  }

  // Acciones
  function guardarAlta() {
    if (!alta.nombre.trim()) { toast('Escribe el nombre del cliente', 'warn'); return }
    const nombre = alta.nombre.trim()
    actions.crearCliente({ ...alta, nombre, contacto: alta.contacto.trim() || 'Por asignar', correo: alta.correo.trim() || `logistica@${nombre.toLowerCase().replace(/[^a-z]/g, '')}.com.mx`, telefono: alta.telefono.trim() || '55 0000 0000' })
    setAltaOpen(false)
    setSelName(nombre)
    setDesdeTabla(true)
    setAlta({ nombre: '', sector: 'Alimentos y bebidas', contacto: '', correo: '', telefono: '', tipo: 'Por evento', tarifa: '' })
    toast(`Cliente ${nombre} dado de alta (${tabla.length + 1} clientes)`)
  }
  function guardarLead() {
    if (!lead.empresa.trim()) { toast('Escribe la empresa de la oportunidad', 'warn'); return }
    actions.crearLead({ empresa: lead.empresa.trim(), que: lead.que.trim() || 'Por calificar', monto: lead.monto.trim(), siguiente: lead.siguiente })
    setLeadOpen(false)
    setLead({ empresa: '', que: '', monto: '', siguiente: 'Llamar mañana' })
    toast(`Oportunidad ${lead.empresa.trim()} agregada a Prospecto`)
  }
  function guardarActividad() {
    if (!act.nota.trim()) { toast('Escribe una nota de la actividad', 'warn'); return }
    setActs(a => [{ cliente: sel.nombre, tipo: act.tipo, nota: act.nota.trim(), fecha: hoy() }, ...a])
    setActOpen(false)
    setAct({ tipo: 'Llamada', nota: '' })
    toast(`${act.tipo} registrada para ${sel.nombre}`)
  }
  function abrirPropuesta() {
    setProp({ para: sel.correo, asunto: `Propuesta de servicio AI27 · ${sel.nombre}`, msg: `Estimado/a ${sel.contacto.split(' · ').pop()}:\n\nAdjunto la propuesta de ${sel.modelo.toLowerCase()} con tarifa ${sel.tarifa}. Quedo atento a sus comentarios.\n\nAI27 · Comercial` })
    setPropOpen(true)
  }
  function enviarPropuesta() {
    setPropOpen(false)
    setActs(a => [{ cliente: sel.nombre, tipo: 'Correo', nota: `Propuesta enviada: ${prop.asunto}`, fecha: hoy() }, ...a])
    toast(`Propuesta enviada a ${sel.nombre} (${prop.para})`)
  }

  const leadsAbiertos = 18 + leadsStore.filter(l => l.etapa !== 'Ganado').length
  const portalCount = tabla.filter(c => c.portal).length
  const vencidosCount = tabla.filter(c => c.cobranza !== 'Al corriente').length
  const pipelineTotal = ETAPAS.filter(e => e !== 'Ganado').reduce((a, e) => a + totalEtapa(e), 0)

  return (
    <Shell active="crm" css={CSS}>
      <PageHeader seccion="Comercial" titulo="Clientes"
        descripcion={`A quién le damos servicio y cómo va cada cuenta: ${tabla.length} clientes activos y ${leadsAbiertos} oportunidades abiertas. Elige un cliente para ver su resumen, contactos y servicios recientes.`}
        accion={{ label: 'Alta de cliente', onClick: () => setAltaOpen(true) }}
        secundarias={<Link className="btn" to={ROUTES.Cotizador + '?cliente=' + encodeURIComponent(sel.nombre)}>Cotizar a {sel.nombre}</Link>} />

      <section aria-label="Sugerencia de la IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#F0F3FD;border:1px solid #C7D0F2;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3448A8" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>Sugerencia de la IA: llamar hoy a Agroexport Sinaloa</span><span style={sx('font-size:14px;color:#3E4A59')}>Su cotización venció hace 2 días y abrió el PDF 4 veces. Si se le llama hoy, la probabilidad de cierre estimada es 64%. Farmacéutica Orión es la oportunidad con más probabilidad (85%).</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Probabilidad de cierre por oportunidad: Orión 85, Peninsular 71, Agroexport 64, Marsh 52, Cementos 38" style={sx('display:block')}><g fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#3E4A59"><rect x="4" y="9.2" width="30" height="51" rx="2" fill="#2B9A66"></rect><rect x="48" y="17.4" width="30" height="42.6" rx="2" fill="#475CC7"></rect><rect x="92" y="21.6" width="30" height="38.4" rx="2" fill="#3448A8"></rect><rect x="136" y="28.8" width="30" height="31.2" rx="2" fill="#475CC7"></rect><rect x="180" y="37.2" width="30" height="22.8" rx="2" fill="#AEB8C4"></rect><text x="8" y="6">85%</text><text x="96" y="18">64%</text></g></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Probabilidad de cierre por oportunidad</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <nav aria-label="Clientes" className="card" style={sx('flex:1 1 260px;padding:10px;display:flex;flex-direction:column;gap:4px')}>
          <input type="search" value={buscaLat} onChange={e => setBuscaLat(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente en la lista" style={sx(inputStyle + ';min-height:38px;margin-bottom:4px')} />
          <span className="lbl" style={sx('padding:4px 12px')}>{ql ? `${lateralView.length} resultados` : 'Clientes principales · ingreso mensual'}</span>
          {lateralView.map(c => (
            <button key={c.nombre} type="button" className="cli" aria-pressed={c.nombre === sel.nombre} onClick={() => { setSelName(c.nombre); setDesdeTabla(false) }}>
              <span style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:2px')}><span style={sx('font-weight:500')}>{c.nombre}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{c.modelo}{c.nuevo ? ' · nuevo' : ''}</span></span>
              <span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{c.nuevo ? '—' : fmtM(c.ingresosMes)}</span>
            </button>
          ))}
          {lateralView.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A;padding:8px 12px')}>Sin clientes con ese nombre. Prueba con otra palabra.</span>}
          {!ql && <Nota>Los demás clientes están en “Todos los clientes”, más abajo, o búscalos aquí arriba.</Nota>}
        </nav>

        <section ref={vista} aria-label="Resumen del cliente" style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
            <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start')}>
              <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Resumen del cliente</span><h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600")}>{sel.nombre}</h2><span style={sx('font-size:14px;color:#5F6B7A')}>{sel.modelo} · {sel.sector} · cliente desde {sel.desde}</span></div>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
                <span className={sel.nuevo ? 'pill p-info' : sel.cobranza === 'Al corriente' ? 'pill p-ok' : 'pill p-warn'}>{sel.nuevo ? 'Alta reciente' : sel.cobranza === 'Al corriente' ? 'Contrato vigente · al corriente' : `Cobranza ${sel.cobranza}`}</span>
                <button type="button" className="btn btn-sm" onClick={() => setActOpen(true)}>Registrar llamada o visita</button>
                <button type="button" className="btn btn-sm" onClick={abrirPropuesta}>Enviar propuesta</button>
              </div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:12px')}>
              <div className="kpi"><span className="lbl">Servicios activos</span><span className="k">{sel.activos}</span><span style={sx('font-size:12px;color:#5F6B7A')}>en curso hoy</span></div>
              <div className="kpi"><span className="lbl">Facturado trimestre</span><span className="k">{sel.trimestre ? fmtM(sel.trimestre) : '—'}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{sel.nuevo ? 'sin facturar aún' : fmtM(sel.ingresosMes) + ' al mes'}</span></div>
              <div className="kpi"><span className="lbl">Margen</span><span className="k" style={sx('color:' + (sel.margen < 28 ? '#9A5B00' : '#17784A'))}>{sel.margen}%</span><span style={sx('font-size:12px;color:#5F6B7A')}>{sel.margen < 28 ? 'bajo el objetivo de 28%' : 'sobre el objetivo de 28%'}</span></div>
              <div className="kpi"><span className="lbl">Incidentes</span><span className="k" style={sel.incidentes ? sx('color:#B42318') : undefined}>{sel.incidentes}</span><span style={sx('font-size:12px;color:#5F6B7A')}>en el trimestre</span></div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:20px;font-size:14px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}>
                <span className="lbl">Contactos</span>
                <span>{sel.contacto}</span>
                {sel.contacto2 && <span>{sel.contacto2}</span>}
                <span style={sx('color:#5F6B7A;font-size:13px')}><a href={'mailto:' + sel.correo}>{sel.correo}</a> · {sel.telefono}</span>
              </div>
              <div style={sx('display:flex;flex-direction:column;gap:6px')}>
                <span className="lbl">Servicios recientes · {svSel.length} en el trimestre</span>
                {svSel.length === 0 && <span style={sx('color:#5F6B7A;font-size:13px')}>Sin servicios registrados todavía.</span>}
                {svSel.slice(0, 5).map(s => (
                  <Link key={s.id} to={ROUTES.Servicios} style={sx('display:flex;justify-content:space-between;gap:8px;text-decoration:none;color:#0D1D41;font-size:13px')}><span><span className="mono" style={sx('color:#3E4A59')}>{s.id}</span> · {s.ruta}</span><span className={'pill ' + (s.estatus === 'En tránsito' ? 'p-info' : s.estatus === 'Con incidente' ? 'p-bad' : s.estatus === 'Confirmado' ? 'p-warn' : 'p-mute')}>{s.estatus}</span></Link>
                ))}
              </div>
            </div>
            <Nota>Margen: lo que queda del ingreso después del costo directo (custodios, combustible, casetas). El objetivo de la empresa es 28%.</Nota>
          </div>

          <Section titulo="Más detalle del cliente" ayuda="Rutas frecuentes, tarifa pactada, requisitos, incidentes y actividad comercial." plegable abierto={false}>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:20px;font-size:14px')}>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Rutas frecuentes</span><span>{sel.rutas}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Tarifa pactada</span><span className="mono">{sel.tarifa}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Requisitos especiales</span><span>{sel.requisitos}</span></div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:20px;font-size:13px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <div style={sx('display:flex;flex-direction:column;gap:6px')}>
                <span className="lbl">Incidentes · {incSel.length}</span>
                {incSel.length === 0 && <span style={sx('color:#5F6B7A')}>Sin incidentes en el trimestre</span>}
                {incSel.slice(0, 4).map(i => (
                  <Link key={i.id} to={ROUTES.Reaccion} style={sx('display:flex;justify-content:space-between;gap:8px;text-decoration:none;color:#0D1D41')}><span><span className="mono" style={sx('color:#3E4A59')}>{i.id}</span> · {i.tipo} · {i.carretera}</span><span className={'pill ' + (i.resultado === 'Pérdida' ? 'p-bad' : i.resultado === 'Recuperación parcial' ? 'p-warn' : 'p-ok')}>{i.resultado}</span></Link>
                ))}
              </div>
              <div style={sx('display:flex;flex-direction:column;gap:6px')}>
                <span className="lbl">Actividad comercial · {actsSel.length}</span>
                {actsSel.length === 0 && <span style={sx('color:#5F6B7A')}>Sin actividad registrada. Usa “Registrar llamada o visita”.</span>}
                {actsSel.slice(0, 4).map((a, i) => (
                  <span key={i}><span className="mono" style={sx('color:#3E4A59')}>{a.fecha}</span> · <b style={sx('font-weight:500')}>{a.tipo}</b>: {a.nota}</span>
                ))}
              </div>
            </div>
          </Section>
        </section>
      </div>

      <Section titulo="Oportunidades en curso" ayuda={`${allDeals.filter(d => d.etapa !== 'Ganado').length} oportunidades por ${fmtM(pipelineTotal)} al mes en negociación. Usa ‹ › para avanzar o regresar de etapa; haz clic en una para ver al cliente.`} plegable abierto={false}
        acciones={<button type="button" className="btn btn-sm" onClick={() => setLeadOpen(true)}>Nueva oportunidad</button>}>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:repeat(5,minmax(210px,1fr));gap:12px;min-width:1080px')}>
            {ETAPAS.map((e, ei) => (
              <div key={e} style={sx('background:#F3F5F8;border:1px solid #E4E8ED;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px')}>
                <div style={sx('display:flex;justify-content:space-between;gap:8px')}><span style={sx('font-weight:600;font-size:14px')}>{ei + 1}. {e}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{fmtM(totalEtapa(e))}</span></div>
                {allDeals.filter(d => d.etapa === e).map(d => (
                  <div key={d.id} className={todos.some(c => c.nombre === d.name) ? 'crm-deal' : undefined} onClick={() => pick(d.name)} style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px')}>
                    <div style={sx('display:flex;justify-content:space-between;gap:6px;align-items:flex-start')}>
                      <span style={sx('font-weight:500;font-size:14px')}>{d.name}</span>
                      <span style={sx('display:flex;gap:4px;flex:none')} onClick={ev => ev.stopPropagation()}>
                        <button type="button" className="mv" aria-label="Etapa anterior" title="Regresar a la etapa anterior" disabled={ei === 0} onClick={() => mover(d, -1)}>‹</button>
                        <button type="button" className="mv" aria-label="Siguiente etapa" title="Avanzar a la siguiente etapa" disabled={ei === ETAPAS.length - 1} onClick={() => mover(d, 1)}>›</button>
                      </span>
                    </div>
                    <span style={sx('font-size:12px;color:#5F6B7A')}>{d.what}</span>
                    <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center')}><span className="mono" style={sx('font-size:13px')}>{d.amt}</span><span className={d.cls}>{d.next}</span></div>
                  </div>
                ))}
                {allDeals.filter(d => d.etapa === e).length === 0 && <span style={sx('font-size:12px;color:#5F6B7A')}>Sin oportunidades en esta etapa</span>}
              </div>
            ))}
          </div>
        </div>
        <Nota>Valor mensual estimado en MXN. Las etapas van de izquierda a derecha: 1 Prospecto → 5 Ganado.</Nota>
      </Section>

      <Section titulo="Todos los clientes" ayuda={`Los ${tabla.length} clientes activos con su facturación, margen y cobranza. Haz clic en una fila para ver su resumen arriba.`} plegable abierto={false} style="padding:20px 8px 12px"
        acciones={<><input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" style={sx(inputStyle + ';width:180px;min-height:34px')} />
          <button type="button" aria-pressed={filtro === 'todos'} className="pill p-mute" style={sx(filtro === 'todos' ? PILL_ON : '')} onClick={() => setFiltro('todos')}>{tabla.length} activos</button>
          <button type="button" aria-pressed={filtro === 'portal'} className="pill p-mute" style={sx(filtro === 'portal' ? PILL_ON : '')} onClick={() => setFiltro(f => (f === 'portal' ? 'todos' : 'portal'))}>{portalCount} con portal en vivo</button>
          <button type="button" aria-pressed={filtro === 'vencidos'} className="pill p-mute" style={sx(filtro === 'vencidos' ? PILL_ON : '')} onClick={() => setFiltro(f => (f === 'vencidos' ? 'todos' : 'vencidos'))}>{vencidosCount} con cobranza vencida</button></>}>
        <div style={sx('overflow-x:auto')}>
          <table style={sx('width:100%;border-collapse:collapse;font-size:14px')}>
            <thead><tr>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('nombre')}>Cliente{arrow('nombre')}</th>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('modelo')}>Tipo de servicio{arrow('modelo')}</th>
              <th className="crm-th" style={sx(TH_R)} onClick={() => toggleSort('activos')}>Servicios activos{arrow('activos')}</th>
              <th className="crm-th" style={sx(TH_R)} onClick={() => toggleSort('trimestre')}>Facturado trimestre{arrow('trimestre')}</th>
              <th className="crm-th" style={sx(TH + ';min-width:160px')} onClick={() => toggleSort('margen')}>Margen{arrow('margen')}</th>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('diasCobro')}>Cobranza{arrow('diasCobro')}</th>
              <th className="crm-th" style={sx(TH)} onClick={() => toggleSort('ultimo')}>Último servicio{arrow('ultimo')}</th>
            </tr></thead>
            <tbody>
              {rows.slice(pg.from, pg.to).map(c => {
                const cls = c.cobranza === 'Al corriente' ? 'pill p-ok' : (parseInt(c.cobranza) > 60 ? 'pill p-bad' : 'pill p-warn')
                const bar = 'height:100%;width:' + Math.min(100, Math.round(c.margen / 45 * 100)) + '%;background:' + (c.margen < 28 ? '#3448A8' : '#2B9A66')
                return (
                  <tr key={c.nombre} className={'crm-row' + (desdeTabla && c.nombre === sel.nombre ? ' sel' : '')} onClick={() => { pick(c.nombre); setDesdeTabla(true) }} title="Ver resumen del cliente">
                    <td style={sx(td + ';font-weight:500')}>{c.nombre}{c.nuevo ? <span className="pill p-info" style={sx('margin-left:8px')}>nuevo</span> : null}</td>
                    <td style={sx(td)}>{c.modelo}</td>
                    <td className="mono" style={sx(td + ';text-align:right')}>{c.activos}</td>
                    <td className="mono" style={sx(td + ';text-align:right')}>{c.trimestre ? fmtM(c.trimestre) : '—'}</td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4')}><div style={sx('display:flex;align-items:center;gap:8px')}><div style={sx('flex:1;height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(bar)}></div></div><span className="mono" style={sx('font-size:13px')}>{c.margen + '%'}</span></div></td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4')}><span className={cls}>{c.cobranza}</span></td>
                    <td style={sx(td + ';color:#3E4A59')}>{c.ultimo}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={7} style={sx('padding:20px 12px;color:#5F6B7A;text-align:center')}>Ningún cliente coincide con el filtro. Prueba con otro nombre o quita el filtro.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={sx('padding:0 12px')}><Pager {...pg} /></div>
      </Section>

      <Modal open={altaOpen} onClose={() => setAltaOpen(false)} title="Alta de cliente" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setAltaOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAlta}>Dar de alta</button></>}>
        <Field label="Nombre o razón social"><input style={sx(inputStyle)} value={alta.nombre} onChange={e => setAlta({ ...alta, nombre: e.target.value })} placeholder="Ej. Cementos del Centro" autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Sector"><select style={sx(inputStyle)} value={alta.sector} onChange={e => setAlta({ ...alta, sector: e.target.value })}>{['Alimentos y bebidas', 'Farmacéutica', 'Electrónica', 'Retail', 'Aseguradora', 'Textil', 'Química', 'Logística 3PL', 'Construcción', 'Automotriz'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Tipo de servicio"><select style={sx(inputStyle)} value={alta.tipo} onChange={e => setAlta({ ...alta, tipo: e.target.value as ClienteCRM['modelo'] })}>{['Por evento', 'Dedicado', 'Monitoreo', 'Evento + monitoreo'].map(s => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Contacto principal"><input style={sx(inputStyle)} value={alta.contacto} onChange={e => setAlta({ ...alta, contacto: e.target.value })} placeholder="Nombre y puesto" /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Correo"><input type="email" style={sx(inputStyle)} value={alta.correo} onChange={e => setAlta({ ...alta, correo: e.target.value })} placeholder="logistica@empresa.com.mx" /></Field>
          <Field label="Teléfono"><input style={sx(inputStyle)} value={alta.telefono} onChange={e => setAlta({ ...alta, telefono: e.target.value })} placeholder="55 0000 0000" /></Field>
        </div>
        <Field label="Tarifa pactada"><input style={sx(inputStyle)} value={alta.tarifa} onChange={e => setAlta({ ...alta, tarifa: e.target.value })} placeholder={alta.tipo === 'Dedicado' ? '$46,000/mes por custodio' : alta.tipo === 'Monitoreo' ? '$880/unidad/mes' : '$29.00/km'} /></Field>
        <Nota>El cliente nuevo aparece en la lista y en “Todos los clientes”; después puedes cotizarle desde el botón del encabezado.</Nota>
      </Modal>

      <Modal open={leadOpen} onClose={() => setLeadOpen(false)} title="Nueva oportunidad" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setLeadOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarLead}>Agregar a Prospecto</button></>}>
        <Field label="Empresa"><input style={sx(inputStyle)} value={lead.empresa} onChange={e => setLead({ ...lead, empresa: e.target.value })} placeholder="Ej. Agroindustrias del Bajío" autoFocus /></Field>
        <Field label="Qué necesita"><input style={sx(inputStyle)} value={lead.que} onChange={e => setLead({ ...lead, que: e.target.value })} placeholder="Ej. Eventos Qro–Mty nocturnos" /></Field>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          <Field label="Valor mensual estimado"><input style={sx(inputStyle)} value={lead.monto} onChange={e => setLead({ ...lead, monto: e.target.value })} placeholder="$350K" /></Field>
          <Field label="Siguiente paso"><select style={sx(inputStyle)} value={lead.siguiente} onChange={e => setLead({ ...lead, siguiente: e.target.value })}>{['Llamar mañana', 'Correo hoy', 'Visita esta semana', 'Enviar cotización', 'Calificar hoy'].map(s => <option key={s}>{s}</option>)}</select></Field>
        </div>
      </Modal>

      <Modal open={actOpen} onClose={() => setActOpen(false)} title={`Registrar llamada o visita · ${sel.nombre}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setActOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarActividad}>Guardar</button></>}>
        <Field label="Tipo"><select style={sx(inputStyle)} value={act.tipo} onChange={e => setAct({ ...act, tipo: e.target.value })}>{['Llamada', 'Correo', 'Visita', 'Reunión', 'WhatsApp'].map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Nota"><textarea rows={4} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={act.nota} onChange={e => setAct({ ...act, nota: e.target.value })} placeholder="Qué se acordó y siguiente paso" autoFocus /></Field>
      </Modal>

      <Modal open={propOpen} onClose={() => setPropOpen(false)} title={`Enviar propuesta · ${sel.nombre}`} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setPropOpen(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={enviarPropuesta}>Enviar</button></>}>
        <Field label="Para"><input style={sx(inputStyle)} value={prop.para} onChange={e => setProp({ ...prop, para: e.target.value })} /></Field>
        <Field label="Asunto"><input style={sx(inputStyle)} value={prop.asunto} onChange={e => setProp({ ...prop, asunto: e.target.value })} /></Field>
        <Field label="Mensaje"><textarea rows={6} style={sx(inputStyle + ';padding:10px 12px;resize:vertical')} value={prop.msg} onChange={e => setProp({ ...prop, msg: e.target.value })} /></Field>
        <Nota>Adjunto: Propuesta_AI27_{sel.nombre.replace(/\s+/g, '_')}.pdf · tarifa {sel.tarifa} · facturación {fmtMXN(sel.ingresosMes)}/mes</Nota>
      </Modal>
    </Shell>
  )
}
