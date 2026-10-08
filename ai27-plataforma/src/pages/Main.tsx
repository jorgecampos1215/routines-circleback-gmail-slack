import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'

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
`

const Q = [
  { text: '¿Qué cliente nos dejó más margen en septiembre?', a: 'Alpura: $1.92M de margen en septiembre (38% sobre $5.05M facturados) con 46 servicios por evento en Méx–Qro–Gdl sin incidentes. Le siguen Marsh ($1.31M, 34%) y Farmacéutica Orión ($0.88M, 29%).' },
  { text: '¿Dónde subieron los incidentes?', a: 'Arco Norte (Edomex–Hidalgo): 7 incidentes este trimestre contra 3 el anterior, 5 de ellos entre 22:00 y 04:00. Sugiero subir el factor de riesgo de la ruta de 1.2 a 1.4 en el cotizador y exigir 2 custodios en horario nocturno.' },
  { text: '¿Cuántos custodios faltan mañana en Bajío?', a: 'Mañana hay 18 servicios agendados en Bajío y 12 custodios disponibles. Puedes cubrir el hueco moviendo 4 custodios de Centro (Querétaro a 2 h) y 2 de Occidente.' },
]

const zones = ([['Centro', 21, 118], ['Bajío', 4, 74], ['Occidente', 12, 61], ['Noreste', 9, 58], ['Golfo', 8, 41], ['Sureste', 6, 26], ['Noroeste', 5, 22]] as [string, number, number][]).map(([name, avail, total]) => ({
  name, avail, total,
  bar: 'height:100%;width:' + Math.round(avail / total * 100 * 3) + '%;max-width:100%;background:' + (avail / total < 0.08 ? '#F0605D' : '#3FA7C9'),
}))
const px = (v: number) => Math.round(v / 14.8 * 140)
const months = ([['Jul', 5.6, 5.1, 2.2], ['Ago', 5.9, 5.3, 2.4], ['Sep', 6.1, 5.4, 2.6], ['Oct*', 6.4, 5.6, 2.8]] as [string, number, number, number][]).map(([name, e, d, m]) => ({
  name, total: '$' + (e + d + m).toFixed(1) + 'M',
  evt: 'height:' + px(e) + 'px;background:#F2A93B',
  ded: 'height:' + px(d) + 'px;background:#3FA7C9',
  mon: 'height:' + px(m) + 'px;background:#1F5A73',
}))
const alerts = [
  { level: 'Crítica', cls: 'pill p-bad', title: 'Desvío de ruta · SRV-24817 · Alpura', detail: 'Méx–Qro km 142 · 1.6 km fuera de geocerca · Samsara', when: 'hace 2 min' },
  { level: 'Alta', cls: 'pill p-bad', title: 'Separación custodio–tráiler 1.8 km', detail: 'SRV-24803 · Marsh · Arco Norte', when: 'hace 6 min' },
  { level: 'Alta', cls: 'pill p-warn', title: 'Pérdida de señal GPS 9 min', detail: 'Unidad C-214 · Puebla–Orizaba · Ruptela', when: 'hace 9 min' },
  { level: 'Media', cls: 'pill p-warn', title: 'Hueco de cobertura en Bajío', detail: 'Mañana: 18 servicios, 12 custodios disponibles', when: 'IA' },
  { level: 'Media', cls: 'pill p-mute', title: '14 documentos vencen en 7 días', detail: 'Portación, licencia federal y evaluación de confianza', when: 'hoy' },
]
const roads = [{ name: 'Arco Norte', n: 7 }, { name: 'Méx–Puebla–Orizaba', n: 6 }, { name: 'Méx–Querétaro', n: 5 }, { name: 'Querétaro–SLP', n: 4 }]

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

export default function Main() {
  const [q, setQ] = useState(0)
  const [free, setFree] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const ask = () => {
    if (!input.trim()) return
    setQ(closest(input))
    setFree(input.trim())
    setInput('')
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
          <label className="field">Periodo<select><option>Octubre 2026</option><option>Q3 2026</option></select></label>
          <label className="field">Zona<select><option>Todas las zonas</option><option>Centro</option><option>Bajío</option></select></label>
          <label className="field">Cliente<select><option>Todos los clientes</option><option>Alpura</option><option>Marsh</option></select></label>
          <label className="field">Tipo de servicio<select><option>Todos</option><option>Por evento</option><option>Dedicado</option><option>Monitoreo</option></select></label>
          <button type="button" className="btn" onClick={() => window.print()}>Exportar</button>
          <Link className="btn btn-pri" to={ROUTES.Cotizador}>Nueva cotización</Link>
        </form>
      </header>

      <section aria-label="KPIs principales" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
          <span className="lbl">Servicios activos</span>
          <span className="kpi">86</span>
          <span style={sx('font-size:13px;color:#5F6B7A')}>34 evento · 41 dedicado · 11 monitoreo</span>
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
          <span className="lbl">Utilización custodios</span>
          <span className="kpi">78%</span>
          <div className="track"><div style={sx('width:78%;height:100%;background:#F2A93B')}></div></div>
          <span style={sx('font-size:13px;color:#5F6B7A')}>312 de 400 en servicio</span>
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
          <span className="lbl">Entregas sin incidente</span>
          <span className="kpi">98.6%</span>
          <span style={sx('font-size:13px;color:#17784A')}>+0.4 pts vs septiembre</span>
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
          <span className="lbl">Incidentes / 100 servicios</span>
          <span className="kpi">1.4</span>
          <span style={sx('font-size:13px;color:#B42318')}>+0.3 vs trimestre anterior</span>
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
          <span className="lbl">Unidades operando</span>
          <span className="kpi">91%</span>
          <span style={sx('font-size:13px;color:#5F6B7A')}>546 de 600 · 31 en taller</span>
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
          <span className="lbl">Ingresos del mes</span>
          <span className="kpi">$14.8M</span>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Margen 31% · proyección MXN</span>
        </div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Alertas priorizadas</h2>
            <Link to={ROUTES.Monitoreo} style={sx('font-size:14px')}>Abrir monitoreo</Link>
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={sx('display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid #EEF1F4')}>
              <span className={a.cls} style={sx('min-width:64px;justify-content:center')}>{a.level}</span>
              <div style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;flex:1')}>
                <span style={sx('font-weight:500')}>{a.title}</span>
                <span style={sx('font-size:13px;color:#5F6B7A')}>{a.detail}</span>
              </div>
              <span className="mono" style={sx('font-size:12px;color:#5F6B7A;white-space:nowrap')}>{a.when}</span>
            </div>
          ))}
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Custodios disponibles por zona</h2>
            <span className="pill p-warn">Hueco: Bajío mañana −6</span>
          </div>
          {zones.map(z => (
            <div key={z.name} style={sx('display:grid;grid-template-columns:110px minmax(0,1fr) 92px;gap:12px;align-items:center;font-size:14px')}>
              <span>{z.name}</span>
              <div className="track" style={sx('height:10px')}><div style={sx(z.bar)}></div></div>
              <span className="mono" style={sx('text-align:right;color:#3E4A59')}>{z.avail} / {z.total}</span>
            </div>
          ))}
          <span style={sx('font-size:13px;color:#5F6B7A')}>Disponibles ahora / plantilla de la zona. 23 en descanso, vacaciones o incapacidad.</span>
        </div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Ingresos por tipo de servicio</h2>
          <div style={sx('display:flex;gap:20px;align-items:flex-end;height:180px;padding-top:8px')}>
            {months.map(m => (
              <div key={m.name} style={sx('flex:1;display:flex;flex-direction:column;align-items:center;gap:8px')}>
                <span className="mono" style={sx('font-size:12px;color:#3E4A59')}>{m.total}</span>
                <div style={sx('width:100%;max-width:48px;display:flex;flex-direction:column;border-radius:4px;overflow:hidden')}>
                  <div style={sx(m.mon)}></div>
                  <div style={sx(m.ded)}></div>
                  <div style={sx(m.evt)}></div>
                </div>
                <span style={sx('font-size:12px;color:#5F6B7A')}>{m.name}</span>
              </div>
            ))}
          </div>
          <div style={sx('display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#3E4A59')}>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#F2A93B')}></span>Por evento</span>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#3FA7C9')}></span>Dedicado</span>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#1F5A73')}></span>Monitoreo</span>
          </div>
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Seguridad y reacción</h2>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Tiempo de reacción</span><span className="kpi" style={sx('font-size:24px')}>18 min</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">% recuperación</span><span className="kpi" style={sx('font-size:24px')}>72%</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Recuperado</span><span className="kpi" style={sx('font-size:24px;color:#17784A')}>$8.4M</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Perdido</span><span className="kpi" style={sx('font-size:24px;color:#B42318')}>$3.2M</span></div>
          </div>
          <span className="lbl" style={sx('margin-top:4px')}>Incidentes por carretera · trimestre</span>
          {roads.map(r => (
            <div key={r.name} style={sx('display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4')}><span>{r.name}</span><span className="mono">{r.n}</span></div>
          ))}
        </div>

        <div className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Comercial y RH</h2>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Cierre cotizaciones</span><span className="kpi" style={sx('font-size:24px')}>42%</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Clientes activos</span><span className="kpi" style={sx('font-size:24px')}>25</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Top 5 concentración</span><span className="kpi" style={sx('font-size:24px')}>47%</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Días de cobro</span><span className="kpi" style={sx('font-size:24px')}>38</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Vacantes abiertas</span><span className="kpi" style={sx('font-size:24px')}>23</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Rotación mensual</span><span className="kpi" style={sx('font-size:24px')}>3.1%</span></div>
          </div>
          <Link to={ROUTES.Finanzas} style={sx('font-size:14px')}>Ver rentabilidad por cliente</Link>
        </div>
      </section>

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
        </div>
      </section>
    </Shell>
  )
}
