import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { useToast } from '../components/ui'
import { CLIENTES, ZONAS } from '../data/seed'
import { FILTROS_DEFAULT, PERIODOS, TIPOS, kpis, custodiosPorZona, alertas, seguridad, comercial, csvDashboard, descargarCSV, fmtM, type Filtros } from '../data/dashboard'
import { usePins, togglePin } from '../data/asistente'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.kpi{font-family:'Archivo',sans-serif;font-size:32px;font-weight:600;letter-spacing:-.01em}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif}
.track{height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden}
.kpi-link{color:inherit;text-decoration:none;cursor:pointer}.kpi-link:hover{border-color:#F2A93B;color:inherit}
.alert-row{cursor:pointer;background:transparent;border:0;border-top:1px solid #EEF1F4;text-align:left;font:inherit;color:inherit;width:100%}.alert-row:hover{background:#FAFBFC}
.lnk{background:none;border:0;padding:0;font:inherit;color:#B36B00;cursor:pointer;text-decoration:underline}.lnk:hover{color:#8A5300}
`

const Q = [
  { text: '¿Qué cliente nos dejó más margen en septiembre?', a: 'Alpura: $1.92M de margen en septiembre (38% sobre $5.05M facturados) con 46 servicios por evento en Méx–Qro–Gdl sin incidentes. Le siguen Marsh ($1.31M, 34%) y Farmacéutica Orión ($0.88M, 29%).' },
  { text: '¿Dónde subieron los incidentes?', a: 'Arco Norte (Edomex–Hidalgo): 7 incidentes este trimestre contra 3 el anterior, 5 de ellos entre 22:00 y 04:00. Sugiero subir el factor de riesgo de la ruta de 1.2 a 1.4 en el cotizador y exigir 2 custodios en horario nocturno.' },
  { text: '¿Cuántos custodios faltan mañana en Bajío?', a: 'Mañana hay 18 servicios agendados en Bajío y 12 custodios disponibles. Puedes cubrir el hueco moviendo 4 custodios de Centro (Querétaro a 2 h) y 2 de Occidente.' },
]

const px = (v: number, total: number) => Math.round(v / Math.max(total, 0.1) * 140)
const ZONA_OPCIONES = ['Todas', ...ZONAS] as const

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
const KEYS = [
  ['cliente', 'margen', 'septiembre', 'rentable', 'alpura', 'utilidad', 'ganancia'],
  ['incidente', 'incidentes', 'subieron', 'robo', 'carretera', 'arco', 'riesgo', 'ruta'],
  ['custodios', 'custodio', 'faltan', 'bajio', 'manana', 'cobertura', 'hueco'],
]
function closest(text: string): number {
  const words = norm(text).split(/\s+/).filter(w => w.length > 2)
  let best = 0, bestScore = -1
  KEYS.forEach((ks, i) => {
    const qWords = norm(Q[i].text).split(/\s+/)
    const score = words.reduce((acc, w) => acc + (ks.some(k => k.startsWith(w) || w.startsWith(k)) ? 2 : 0) + (qWords.includes(w) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = i }
  })
  return best
}

const Kpi = ({ to, label, children }: { to: string; label: string; children: ReactNode }) => (
  <Link to={to} className="card kpi-link" title={'Abrir ' + label.toLowerCase()} style={sx('display:flex;flex-direction:column;gap:8px')}>
    <span className="lbl">{label}</span>
    {children}
  </Link>
)

export default function Main() {
  const navigate = useNavigate()
  const toast = useToast()
  const pins = usePins()
  const [f, setF] = useState<Filtros>(FILTROS_DEFAULT)
  const [masAlertas, setMasAlertas] = useState(false)
  const [q, setQ] = useState(0)
  const [free, setFree] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const ask = () => {
    if (!input.trim()) return
    setQ(closest(input))
    setFree(input.trim())
    setInput('')
  }
  const upd = (k: keyof Filtros) => (e: ChangeEvent<HTMLSelectElement>) => setF(prev => ({ ...prev, [k]: e.target.value }))

  const k = useMemo(() => kpis(f), [f])
  const zonas = useMemo(() => custodiosPorZona(f), [f])
  const al = useMemo(() => alertas(f), [f])
  const seg = useMemo(() => seguridad(f), [f])
  const com = useMemo(() => comercial(f), [f])
  const zones = zonas.filas.map(z => ({ ...z, bar: 'height:100%;width:' + Math.round(z.avail / z.total * 100 * 3) + '%;max-width:100%;background:' + (z.avail / z.total < 0.08 ? '#F0605D' : '#3FA7C9') }))
  const maxMes = Math.max(...k.meses.map(m => m.total), 0.1)
  const months = k.meses.map(m => ({ name: m.name, enPeriodo: m.enPeriodo, total: fmtM(m.total), evt: 'height:' + px(m.evt, maxMes) + 'px;background:#F2A93B', ded: 'height:' + px(m.ded, maxMes) + 'px;background:#3FA7C9', mon: 'height:' + px(m.mon, maxMes) + 'px;background:#1F5A73' }))
  const alertasVisibles = masAlertas ? al : al.slice(0, 5)
  const hueco = zones.find(z => z.name === 'Bajío')
  const filtrado = f.periodo !== 'Octubre 2026' || f.zona !== 'Todas' || f.cliente !== 'Todos' || f.tipo !== 'Todos'

  const exportar = () => {
    descargarCSV(`dashboard-${f.periodo.replace(/\s/g, '-').toLowerCase()}.csv`, csvDashboard(f))
    toast(`Dashboard exportado a CSV · ${f.periodo} · ${f.zona === 'Todas' ? 'todas las zonas' : f.zona}`)
  }

  return (
    <Shell active="dashboard" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Dirección</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Operación hoy</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>Miércoles 7 oct 2026 · 14:32 · telemetría Samsara + Ruptela normalizada</span>
        </div>
        <form style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end')} onSubmit={e => e.preventDefault()}>
          <label className="field">Periodo<select value={f.periodo} onChange={upd('periodo')}>{PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className="field">Zona<select value={f.zona} onChange={upd('zona')}>{ZONA_OPCIONES.map(z => <option key={z} value={z}>{z === 'Todas' ? 'Todas las zonas' : z}</option>)}</select></label>
          <label className="field">Cliente<select value={f.cliente} onChange={upd('cliente')}><option value="Todos">Todos los clientes</option>{CLIENTES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="field">Tipo de servicio<select value={f.tipo} onChange={upd('tipo')}><option value="Todos">Todos</option>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
          {filtrado && <button type="button" className="btn" onClick={() => setF(FILTROS_DEFAULT)} title="Quitar filtros">Limpiar</button>}
          <button type="button" className="btn" onClick={exportar}>Exportar</button>
          <Link className="btn btn-pri" to={ROUTES.Cotizador}>Nueva cotización</Link>
        </form>
      </header>

      <section aria-label="KPIs principales" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:16px')}>
        <Kpi to={ROUTES.Servicios} label={k.esOct ? 'Servicios activos' : 'Servicios del periodo'}>
          <span className="kpi">{k.activos}</span>
          <span style={sx('font-size:13px;color:#5F6B7A')}>{k.evento} evento · {k.dedicado} dedicado · {k.monitoreo} monitoreo</span>
        </Kpi>
        <Kpi to={ROUTES.Custodios} label="Utilización custodios">
          <span className="kpi">{k.utilizacion}%</span>
          <div className="track"><div style={sx(`width:${k.utilizacion}%;height:100%;background:#F2A93B`)}></div></div>
          <span style={sx('font-size:13px;color:#5F6B7A')}>{k.enServicio} de {k.plantilla} en servicio</span>
        </Kpi>
        <Kpi to={ROUTES.Reportes} label="Entregas sin incidente">
          <span className="kpi">{k.sinIncidente}%</span>
          <span style={sx('font-size:13px;color:#17784A')}>+0.4 pts vs septiembre</span>
        </Kpi>
        <Kpi to={ROUTES.Reaccion} label="Incidentes / 100 servicios">
          <span className="kpi">{k.incPor100}</span>
          <span style={sx('font-size:13px;color:#B42318')}>+0.3 vs trimestre anterior</span>
        </Kpi>
        <Kpi to={ROUTES.Flotilla} label="Unidades operando">
          <span className="kpi">{k.pctOperando}%</span>
          <span style={sx('font-size:13px;color:#5F6B7A')}>{k.operando} de {k.uniTotal} · {k.taller} en taller</span>
        </Kpi>
        <Kpi to={ROUTES.Finanzas} label={k.esOct ? 'Ingresos del mes' : 'Ingresos del periodo'}>
          <span className="kpi">{fmtM(k.ingresos)}</span>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Margen {k.margen}% · proyección MXN</span>
        </Kpi>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Alertas priorizadas</h2>
            <Link to={ROUTES.Monitoreo} style={sx('font-size:14px')}>Abrir monitoreo</Link>
          </div>
          {alertasVisibles.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:12px 0;border-top:1px solid #EEF1F4')}>Sin alertas para estos filtros.</span>}
          {alertasVisibles.map((a, i) => (
            <button key={i} type="button" className="alert-row" title={'Abrir ' + a.title} onClick={() => navigate(a.to)} style={sx('display:flex;gap:12px;align-items:flex-start;padding:12px 0')}>
              <span className={a.cls} style={sx('min-width:64px;justify-content:center')}>{a.level}</span>
              <div style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;flex:1')}>
                <span style={sx('font-weight:500')}>{a.title}</span>
                <span style={sx('font-size:13px;color:#5F6B7A')}>{a.detail}</span>
              </div>
              <span className="mono" style={sx('font-size:12px;color:#5F6B7A;white-space:nowrap')}>{a.when}</span>
            </button>
          ))}
          {al.length > 5 && (
            <button type="button" className="lnk" style={sx('align-self:flex-start;font-size:13px')} onClick={() => setMasAlertas(v => !v)}>{masAlertas ? 'Ver menos' : `Ver ${al.length - 5} alertas más`}</button>
          )}
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Custodios disponibles por zona</h2>
            {hueco && <Link to={ROUTES.AsignacionIA} className="pill p-warn" style={sx('text-decoration:none')} title="Ver detección de huecos">Hueco: Bajío mañana −6</Link>}
          </div>
          {zones.map(z => (
            <Link key={z.name} to={ROUTES.Custodios} title={`Ver custodios de ${z.name}`} style={sx('display:grid;grid-template-columns:110px minmax(0,1fr) 92px;gap:12px;align-items:center;font-size:14px;color:inherit;text-decoration:none')}>
              <span>{z.name}</span>
              <div className="track" style={sx('height:10px')}><div style={sx(z.bar)}></div></div>
              <span className="mono" style={sx('text-align:right;color:#3E4A59')}>{z.avail} / {z.total}</span>
            </Link>
          ))}
          <span style={sx('font-size:13px;color:#5F6B7A')}>Disponibles ahora / plantilla de la zona. {zonas.fuera} en descanso, vacaciones o incapacidad.</span>
        </div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Ingresos por tipo de servicio</h2>
          <div style={sx('display:flex;gap:20px;align-items:flex-end;height:180px;padding-top:8px')}>
            {months.map(m => (
              <Link to={ROUTES.Finanzas} key={m.name} title={`Ver finanzas de ${m.name}`} style={sx('flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;text-decoration:none;color:inherit' + (m.enPeriodo || f.periodo === 'Octubre 2026' ? '' : ';opacity:.45'))}>
                <span className="mono" style={sx('font-size:12px;color:#3E4A59')}>{m.total}</span>
                <div style={sx('width:100%;max-width:48px;display:flex;flex-direction:column;border-radius:4px;overflow:hidden')}>
                  <div style={sx(m.mon)}></div>
                  <div style={sx(m.ded)}></div>
                  <div style={sx(m.evt)}></div>
                </div>
                <span style={sx('font-size:12px;color:#5F6B7A')}>{m.name}</span>
              </Link>
            ))}
          </div>
          <div style={sx('display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#3E4A59')}>
            {([['Por evento', '#F2A93B'], ['Dedicado', '#3FA7C9'], ['Monitoreo', '#1F5A73']] as const).map(([t, c]) => (
              <button key={t} type="button" title={`Filtrar por ${t}`} onClick={() => setF(prev => ({ ...prev, tipo: prev.tipo === t ? 'Todos' : t }))} style={sx('display:flex;gap:6px;align-items:center;background:none;border:0;padding:0;font-family:inherit;font-size:inherit;color:inherit;cursor:pointer;' + (f.tipo === t ? 'font-weight:600' : f.tipo !== 'Todos' ? 'opacity:.5' : 'font-weight:400'))}><span style={sx(`width:10px;height:10px;border-radius:2px;background:${c}`)}></span>{t}</button>
            ))}
          </div>
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Seguridad y reacción</h2>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <Link to={ROUTES.Reaccion} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Tiempo de reacción</span><span className="kpi" style={sx('font-size:24px')}>{seg.reaccion} min</span></Link>
            <Link to={ROUTES.Reaccion} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">% recuperación</span><span className="kpi" style={sx('font-size:24px')}>{seg.recuperacion}%</span></Link>
            <Link to={ROUTES.Reportes} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Recuperado</span><span className="kpi" style={sx('font-size:24px;color:#17784A')}>{fmtM(seg.recuperado)}</span></Link>
            <Link to={ROUTES.Reportes} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Perdido</span><span className="kpi" style={sx('font-size:24px;color:#B42318')}>{fmtM(seg.perdido)}</span></Link>
          </div>
          <span className="lbl" style={sx('margin-top:4px')}>Incidentes por carretera · {f.periodo === 'Q3 2026' ? 'Q3' : f.periodo === 'Septiembre 2026' ? 'septiembre' : 'trimestre'}</span>
          {seg.carreteras.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:6px 0;border-top:1px solid #EEF1F4')}>Sin incidentes con estos filtros.</span>}
          {seg.carreteras.map(r => (
            <Link to={ROUTES.Reaccion} key={r.name} title={`Ver incidentes en ${r.name}`} style={sx('display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4;color:inherit;text-decoration:none')}><span>{r.name}</span><span className="mono">{r.n}</span></Link>
          ))}
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Comercial y RH</h2>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <Link to={ROUTES.Cotizador} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Cierre cotizaciones</span><span className="kpi" style={sx('font-size:24px')}>{com.cierre}%</span></Link>
            <Link to={ROUTES.CRM} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Clientes activos</span><span className="kpi" style={sx('font-size:24px')}>{com.clientesActivos}</span></Link>
            <Link to={ROUTES.Finanzas} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Top 5 concentración</span><span className="kpi" style={sx('font-size:24px')}>{com.top5}%</span></Link>
            <Link to={ROUTES.Finanzas} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Días de cobro</span><span className="kpi" style={sx('font-size:24px')}>{com.diasCobro}</span></Link>
            <Link to={ROUTES.RH} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Vacantes abiertas</span><span className="kpi" style={sx('font-size:24px')}>{com.vacantes}</span></Link>
            <Link to={ROUTES.RH} className="kpi-link" style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Rotación mensual</span><span className="kpi" style={sx('font-size:24px')}>{com.rotacion}%</span></Link>
          </div>
          <Link to={ROUTES.Finanzas} style={sx('font-size:14px')}>Ver rentabilidad por cliente</Link>
        </div>
      </section>

      {pins.length > 0 && (
        <section className="card" aria-label="Insights del asistente" style={sx('display:flex;flex-direction:column;gap:12px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Fijado desde el asistente</h2>
            <Link to={ROUTES.AsistenteIA} style={sx('font-size:14px')}>Abrir asistente</Link>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:12px')}>
            {pins.map(p => (
              <div key={p.key} style={sx('background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:6px')}>
                <span className="lbl">{p.q}</span>
                <span style={sx('font-size:14px;line-height:1.5')}>{p.a}</span>
                <div style={sx('display:flex;gap:12px;font-size:13px')}>
                  <Link to={p.to}>Abrir</Link>
                  <button type="button" className="lnk" onClick={() => { togglePin(p); toast('Insight quitado del dashboard', 'info') }}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card" aria-label="Asistente de IA" style={sx('display:flex;flex-direction:column;gap:16px;border-color:#F3D9A8')}>
        <div style={sx('display:flex;gap:10px;align-items:center')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2A93B" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600;flex:1")}>Pregúntale a la operación</h2>
          <Link to={ROUTES.AsistenteIA} style={sx('font-size:14px')}>Abrir asistente completo con gráficas</Link>
        </div>
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          {Q.map((qq, i) => (
            <button key={i} type="button" className="btn" style={sx(i === q && free === null ? 'border-color:#F2A93B;color:#8A5300' : '')} onClick={() => { setQ(i); setFree(null) }}>{qq.text}</button>
          ))}
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <label style={sx('flex:1 1 320px;display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Pregunta</span><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }} placeholder="Escribe una pregunta sobre clientes, rutas, custodios o finanzas" style={sx("flex:1;min-height:44px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 14px;font:400 14px 'IBM Plex Sans',sans-serif")} /></label>
          <button type="button" className="btn btn-pri" style={sx('min-height:44px')} onClick={ask}>Preguntar</button>
        </div>
        <div style={sx('background:#F3F5F8;border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">{free ?? Q[q].text}</span>
          <p style={sx('margin:0;font-size:15px;line-height:1.55;text-wrap:pretty')}>{Q[q].a}</p>
          <Link to={ROUTES.AsistenteIA} style={sx('font-size:13px')}>Ver con gráficas en el asistente</Link>
        </div>
      </section>
    </Shell>
  )
}
