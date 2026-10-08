import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx, fmtMXN } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { useStore } from '../lib/store'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.kpi{font-family:'Archivo',sans-serif;font-size:28px;font-weight:600}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.track{height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden}
.srv-row{cursor:pointer}
.srv-row:hover td{background:#FAFBFC}
`

type Tab = 'all' | 'Por evento' | 'Dedicado' | 'Monitoreo'
type Row = { id: string; client: string; type: string; route: string; cust: string; mon: string; fee: string; status: string; nuevo?: boolean }
type LogItem = { t: string; text: string; src: string; dot: string }

const ST: Record<string, string> = { 'En tránsito': 'pill p-info', 'Con incidente': 'pill p-bad', 'Confirmado': 'pill p-ok', 'Cotizado': 'pill p-mute', 'Entregado': 'pill p-ok', 'Cerrado': 'pill p-mute', 'Activo': 'pill p-info' }

const ALL: Row[] = ([
  ['SRV-24817', 'Alpura', 'Por evento', 'Cuautitlán → El Salto, Jal.', '2', 'L. Herrera', '$38,500', 'Con incidente'],
  ['SRV-24803', 'Marsh', 'Por evento', 'Tultitlán → Pachuca (Arco Norte)', '2', 'L. Herrera', '$24,900', 'En tránsito'],
  ['SRV-24822', 'Farmacéutica Orión', 'Por evento', 'Toluca → Monterrey', '3', 'P. Ruiz', '$71,200', 'En tránsito'],
  ['DED-0412', 'Electrónica del Bajío', 'Dedicado', '2 custodios · indefinido', '2', '—', '$96,000/mes', 'Activo'],
  ['MON-0087', 'Logística Pacífico Norte', 'Monitoreo', '48 unidades · SLA 5 min', '—', 'S. Campos', '$43,200/mes', 'Activo'],
  ['SRV-24830', 'Bebidas del Golfo', 'Por evento', 'Veracruz → Puebla', '1', 'A. Domínguez', '$18,700', 'Confirmado'],
  ['DED-0419', 'Autopartes Saltillo', 'Dedicado', '4 custodios · 12 meses', '4', '—', '$188,000/mes', 'Activo'],
  ['SRV-24791', 'Alpura', 'Por evento', 'Cuautitlán → Querétaro', '1', 'P. Ruiz', '$14,300', 'Entregado'],
  ['SRV-24836', 'Grupo Textil Arrayán', 'Por evento', 'Puebla → Lázaro Cárdenas', '2', '—', '$52,800', 'Cotizado'],
  ['MON-0091', 'Marsh', 'Monitoreo', '22 unidades · 24/7', '—', 'S. Campos', '$19,800/mes', 'Activo'],
] as const).map(([id, client, type, route, cust, mon, fee, status]) => ({ id, client, type, route, cust, mon, fee, status }))

const TABS: [Tab, string][] = [['all', 'Todos'], ['Por evento', 'Por evento'], ['Dedicado', 'Dedicados'], ['Monitoreo', 'Monitoreo']]
const COUNT: Record<Tab, number> = { all: 86, 'Por evento': 34, Dedicado: 41, Monitoreo: 11 }

const dot = (c: string) => 'width:10px;height:10px;border-radius:50%;margin-top:5px;background:' + c

const LOG_24817: LogItem[] = [
  { t: '08:12', text: 'Check-in en CEDIS Cuautitlán, sellos verificados', src: 'Custodio R. Medina · foto adjunta', dot: dot('#4CC38A') },
  { t: '10:47', text: 'Parada autorizada · caseta Palmillas', src: 'Samsara · geocerca', dot: dot('#3FA7C9') },
  { t: '13:05', text: 'Frenado brusco · km 118', src: 'Samsara · evento de conductor', dot: dot('#F2A93B') },
  { t: '14:30', text: 'Desvío de ruta 1.6 km fuera de geocerca', src: 'Samsara · alerta automática', dot: dot('#F0605D') },
  { t: '14:31', text: 'Llamada a custodio sin respuesta; se marca incidente', src: 'Monitorista L. Herrera', dot: dot('#F0605D') },
]

const MONS = ([['L. Herrera', 17, '2 alertas abiertas'], ['P. Ruiz', 15, '1 alerta abierta'], ['S. Campos', 70, 'Monitoreo como servicio · 70 unidades'], ['A. Domínguez', 12, 'Sin alertas'], ['M. Quintal', 14, 'Sin alertas'], ['J. Pech', 13, '1 alerta abierta']] as const)
  .map(([name, n, alerts]) => ({ name, n, alerts, bar: 'height:100%;width:' + Math.min(100, Math.round(n / (name === 'S. Campos' ? 80 : 18) * 100)) + '%;background:' + (n >= 16 && name !== 'S. Campos' ? '#F0605D' : '#3FA7C9') }))

/** Detalle del servicio: SRV-24817 usa los datos exactos del diseño; el resto se deriva de la fila. */
function detalle(r: Row) {
  if (r.id === 'SRV-24817') {
    return {
      dl: [['Carga', 'Lácteos refrigerados · $2.4M', false], ['Tráiler', 'TR-88213', true], ['Operador cliente', 'Martín Ochoa', false], ['Custodios', 'R. Medina · E. Villa', false], ['Unidad custodia', 'AU-3321', true], ['Tarifa', '$38,500', true]] as [string, string, boolean][],
      log: LOG_24817,
    }
  }
  const evento = r.type === 'Por evento'
  const dl: [string, string, boolean][] = evento
    ? [['Ruta', r.route, false], ['Custodios', r.cust, false], ['Monitorista', r.mon, false], ['Estatus', r.status, false], ['Folio', r.id, true], ['Tarifa', r.fee, true]]
    : [['Alcance', r.route, false], ['Custodios', r.cust, false], ['Monitorista', r.mon, false], ['Modalidad', r.type === 'Dedicado' ? 'Custodia dedicada' : 'Monitoreo como servicio', false], ['Folio', r.id, true], ['Tarifa', r.fee, true]]
  const log: LogItem[] = []
  if (r.nuevo) {
    log.push({ t: 'hoy', text: 'Servicio creado desde cotización aceptada', src: 'Cotizador · sin recaptura', dot: dot('#3FA7C9') })
    log.push({ t: '—', text: 'Pendiente de asignar custodios y unidad', src: 'Asignación IA', dot: dot('#F2A93B') })
  } else if (r.status === 'Cotizado') {
    log.push({ t: '09:20', text: 'Cotización enviada al cliente', src: 'Comercial', dot: dot('#AEB8C4') })
  } else if (r.status === 'Activo') {
    log.push({ t: '07:00', text: 'Inicio de turno, cobertura completa', src: r.mon !== '—' ? 'Monitorista ' + r.mon : 'Coordinación de custodios', dot: dot('#4CC38A') })
    log.push({ t: '12:15', text: 'Reporte de estatus enviado al cliente', src: 'Automático · cada 6 h', dot: dot('#3FA7C9') })
  } else {
    log.push({ t: '07:40', text: 'Check-in en origen, sellos verificados', src: 'Custodio · foto adjunta', dot: dot('#4CC38A') })
    if (r.status !== 'Confirmado') log.push({ t: '10:05', text: 'Salida a ruta · ' + r.route, src: 'Samsara · geocerca', dot: dot('#3FA7C9') })
    if (r.id === 'SRV-24822') log.push({ t: '13:50', text: 'Retraso de 40 min por tráfico en Querétaro', src: 'IA · riesgo de retraso', dot: dot('#F2A93B') })
    if (r.status === 'Entregado') log.push({ t: '13:30', text: 'Entrega confirmada en destino', src: 'Custodio · firma de recibido', dot: dot('#4CC38A') })
  }
  return { dl, log }
}

function etapas(r: Row) {
  const flujo = r.status === 'Activo' ? ['Cotizado', 'Confirmado', 'Activo', 'Cerrado'] : ['Cotizado', 'Confirmado', 'En tránsito', 'Con incidente', 'Entregado', 'Cerrado']
  const cur = flujo.indexOf(r.status)
  return flujo.map((s, i) => {
    if (s === 'Con incidente' && r.status !== 'Con incidente') return { s, cls: 'pill p-mute' }
    if (i < cur) return { s, cls: 'pill p-ok' }
    if (i === cur) return { s, cls: r.status === 'Con incidente' ? 'pill p-bad' : r.status === 'Cotizado' ? 'pill p-warn' : 'pill p-info' }
    return { s, cls: 'pill p-mute' }
  })
}

export default function Servicios() {
  const creados = useStore(s => s.servicios)
  const [tab, setTab] = useState<Tab>('all')
  const [sel, setSel] = useState('SRV-24817')
  const [avisado, setAvisado] = useState(false)
  const [notas, setNotas] = useState<Record<string, LogItem[]>>({})
  const [evid, setEvid] = useState<Record<string, number>>({})
  const [nota, setNota] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const nuevos: Row[] = creados.map(s => ({
    id: s.id, client: s.cliente, type: s.tipo, route: s.ruta, cust: '—', mon: '—',
    fee: fmtMXN(s.precio) + (s.tipo === 'Por evento' ? '' : '/mes'), status: 'Confirmado', nuevo: true,
  }))
  const all = [...nuevos, ...ALL]
  const rows = tab === 'all' ? all : all.filter(r => r.type === tab)
  const count = (k: Tab) => COUNT[k] + (k === 'all' ? nuevos.length : nuevos.filter(n => n.type === k).length)
  const r = all.find(x => x.id === sel) ?? ALL[0]
  const d = detalle(r)
  const log = [...d.log, ...(notas[r.id] ?? [])]
  const nEvid = evid[r.id] ?? 0

  const agregarNota = () => {
    const t = nota.trim()
    if (!t) return
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    setNotas(n => ({ ...n, [r.id]: [...(n[r.id] ?? []), { t: hh, text: t, src: 'Comentario del monitorista', dot: dot('#AEB8C4') }] }))
    setNota('')
  }

  return (
    <Shell active="servicios" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Operación</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Servicios</h1>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <Link className="btn" to={ROUTES.Cotizador}>Desde cotización</Link>
          <Link className="btn btn-pri" to={ROUTES.AsignacionIA}>Nuevo servicio</Link>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · servicios en riesgo de retraso</span><span style={sx('font-size:14px;color:#3E4A59')}>SRV-24822 (Farmacéutica Orión) va 40 min atrás de su ETA por tráfico en Querétaro. Avisar al cliente ahora mantiene el SLA de puntualidad, que va en 96.4%.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Puntualidad mensual de abril a septiembre: 94.1, 94.8, 95.2, 95.0, 95.9 y 96.4 por ciento" style={sx('display:block')}><path d="M10 60H210" stroke="#E4E8ED"></path><polyline points="10,47.8 50,38.2 90,32.7 130,35.4 170,23.1 210,16.2" fill="none" stroke="#D08A1C" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline><circle cx="210" cy="16.2" r="4" fill="#D08A1C"></circle><text x="168" y="10" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#8A5300">96.4%</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Puntualidad de entregas · abr a sep</figcaption>
        </figure>
        <button type="button" className="btn" onClick={() => setAvisado(true)} disabled={avisado} style={sx(avisado ? 'background:#E3F6EC;border-color:#9ED9BC;color:#17784A;cursor:default' : '')}>{avisado ? 'Cliente avisado' : 'Avisar al cliente'}</button>
      </section>

      <div role="tablist" aria-label="Tipo de servicio" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={k === tab} className="btn" style={sx(k === tab ? 'background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : '')} onClick={() => { setTab(k); const vis = k === 'all' ? all : all.filter(x => x.type === k); if (vis.length && !vis.some(x => x.id === sel)) setSel(vis[0].id) }}>{label} <span className="mono" style={sx('font-size:12px;opacity:.8')}>{count(k)}</span></button>
        ))}
      </div>

      <section className="card" style={sx('padding:8px 8px 0')}>
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr><th>Servicio</th><th>Cliente</th><th>Tipo</th><th>Ruta / alcance</th><th>Custodios</th><th>Monitorista</th><th>Tarifa</th><th>Estatus</th></tr></thead>
            <tbody>
              {rows.map(x => (
                <tr key={x.id} className="srv-row" aria-selected={x.id === r.id} tabIndex={0}
                  onClick={() => setSel(x.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(x.id) } }}
                  style={sx(x.id === r.id ? (x.status === 'Con incidente' ? 'background:#FFF5F5' : 'background:#FFF8EC') : x.status === 'Con incidente' ? 'background:#FFF5F5' : '')}>
                  <td className="mono">{x.id}</td><td>{x.client}{x.nuevo && <span className="pill p-warn" style={sx('margin-left:8px')}>Nuevo</span>}</td><td><span className="pill p-mute">{x.type}</span></td><td>{x.route}</td><td>{x.cust}</td><td>{x.mon}</td><td className="mono">{x.fee}</td><td><span className={ST[x.status]}>{x.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:18px')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span className="lbl">{r.id} · {r.type}</span>
              <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:22px;font-weight:600")}>{r.client} · {r.route}</h2>
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
              onChange={e => { const n = e.target.files?.length ?? 0; if (n) setEvid(v => ({ ...v, [r.id]: (v[r.id] ?? 0) + n })); e.target.value = '' }} />
            {nEvid > 0 && <span className="pill p-ok">{nEvid} {nEvid === 1 ? 'evidencia adjunta' : 'evidencias adjuntas'}</span>}
          </div>
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Bitácora del servicio</h2>
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
            <textarea rows={2} placeholder="Agregar nota a la bitácora" value={nota} onChange={e => setNota(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregarNota() } }}
              style={sx("background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:10px 12px;font:400 14px 'IBM Plex Sans',sans-serif;resize:vertical")}></textarea>
          </label>
        </div>
      </section>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Consola de monitoristas</h2>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Turno vespertino · 6 monitoristas · 86 servicios activos</span>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px')}>
          {MONS.map(m => (
            <div key={m.name} style={sx('background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px')}><span style={sx('font-weight:500')}>{m.name}</span><span className="mono" style={sx('font-size:13px')}>{m.n} srv</span></div>
              <div className="track"><div style={sx(m.bar)}></div></div>
              <span style={sx('font-size:12px;color:#5F6B7A')}>{m.alerts}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  )
}
