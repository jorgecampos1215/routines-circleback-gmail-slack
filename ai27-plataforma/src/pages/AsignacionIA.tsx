import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { actions, useStore, type DecisionIA } from '../lib/store'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif}
.track{height:6px;border-radius:3px;background:#EBEEF2;overflow:hidden}
`

const SERVICIO = 'SRV-24841'
type Dec = 'Asignado' | 'Descartado'

const LIST = [
  { id: 'C-1102', name: 'Hugo Salazar', base: 'Cuautitlán', score: 94, why: 'A 14 km del origen, libre desde ayer 18:00 (28 h de descanso). 22 servicios Marsh sin incidentes; 9 viajes previos a SLP. Portación y confianza vigentes.', f: [92, 100, 96, 88] },
  { id: 'C-0877', name: 'Iván Cetina', base: 'Tepotzotlán', score: 91, why: 'A 3 km del origen. Experto en ruta nocturna Qro–SLP (14 viajes). Desempeño 4.8/5. Lleva 38 h esta semana, dentro del límite.', f: [99, 90, 94, 82] },
  { id: 'C-1240', name: 'Óscar Bautista', base: 'Querétaro', score: 83, why: 'Podría unirse en Querétaro. Sin servicios previos con Marsh; evaluación de confianza vence en 21 días.', f: [64, 85, 70, 90] },
  { id: 'C-0931', name: 'Rafael Uc', base: 'Tultitlán', score: 77, why: 'Disponible, pero terminó servicio hace 9 h: descanso por debajo del mínimo recomendado de 12 h.', f: [88, 45, 80, 78] },
]
const KEYS = ['Cercanía', 'Descanso', 'Experiencia ruta', 'Desempeño']
const bar = (v: number) => 'height:100%;width:' + v + '%;background:' + (v >= 80 ? '#4CC38A' : v >= 60 ? '#3FA7C9' : '#F2A93B')

const GAPS = [
  { zone: 'Bajío · mañana', delta: '−6', cls: 'pill p-bad', text: '18 servicios agendados, 12 custodios disponibles. Sugerencia: mover 4 de Centro y 2 de Occidente.' },
  { zone: 'Golfo · viernes', delta: '−2', cls: 'pill p-warn', text: 'Pico de Bebidas del Golfo (9 eventos). 2 custodios con vacaciones aprobadas.' },
  { zone: 'Noreste · mañana', delta: '+3', cls: 'pill p-ok', text: 'Cobertura completa con 3 custodios de reserva.' },
  { zone: 'Centro · mañana', delta: '+9', cls: 'pill p-ok', text: 'Excedente disponible para apoyar a Bajío.' },
]

/** Última decisión registrada por custodio para este servicio (el store guarda la más reciente primero). */
function desdeStore(decs: DecisionIA[]): Record<string, Dec> {
  const out: Record<string, Dec> = {}
  for (const d of decs) {
    if (d.servicio !== SERVICIO) continue
    const c = LIST.find(x => x.name === d.custodio)
    if (c && !out[c.id]) out[c.id] = d.decision === 'aceptada' ? 'Asignado' : 'Descartado'
  }
  return out
}

export default function AsignacionIA() {
  const decisiones = useStore(s => s.decisiones)
  const [dec, setDec] = useState<Record<string, Dec>>(() => desdeStore(decisiones))

  const set = (c: (typeof LIST)[number], v: Dec) => {
    if (dec[c.id] === v) return
    setDec(d => ({ ...d, [c.id]: v }))
    actions.registrarDecision({ servicio: SERVICIO, custodio: c.name, decision: v === 'Asignado' ? 'aceptada' : 'descartada' })
  }
  const assigned = LIST.filter(c => dec[c.id] === 'Asignado').map(c => c.name)
  const summary = assigned.length ? 'Asignados: ' + assigned.join(', ') + ' · la decisión queda registrada para el modelo' : 'Sin custodios asignados todavía'

  return (
    <Shell active="ia" css={CSS}>
      <header style={sx('display:flex;flex-direction:column;gap:6px')}>
        <span className="lbl">Nuevo servicio · paso 2 de 3</span>
        <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Asignar custodios y unidad</h1>
        <span style={sx('color:#5F6B7A;font-size:14px')}>Cotización COT-1182 aceptada por Marsh y convertida en servicio sin recapturar.</span>
      </header>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <section className="card" style={sx('flex:1 1 300px;display:flex;flex-direction:column;gap:16px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Servicio SRV-24841</h2>
          <label className="field">Cliente<input type="text" defaultValue="Marsh" /></label>
          <label className="field">Origen<input type="text" defaultValue="Tepotzotlán, Edomex" /></label>
          <label className="field">Destino<input type="text" defaultValue="San Luis Potosí, SLP" /></label>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <label className="field">Fecha<input type="text" defaultValue="08 oct 2026" /></label>
            <label className="field">Salida<input type="text" defaultValue="22:00" /></label>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <label className="field">Custodios<input type="text" defaultValue="2" /></label>
            <label className="field">Unidades<input type="text" defaultValue="1" /></label>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px;font-size:14px;background:#F3F5F8;border-radius:8px;padding:14px')}>
            <span className="lbl">Requisitos del cliente</span>
            <span>Portación vigente · evaluación de confianza &lt; 12 meses · experiencia en carga de alto valor</span>
          </div>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;font-size:14px')}>
            <span>Riesgo de la ruta</span><span className="pill p-bad">Alto · 1.4</span>
          </div>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Querétaro–SLP nocturno: 4 incidentes en el trimestre, 3 entre 23:00 y 03:00.</span>
        </section>

        <section style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          <div className="card" style={sx('display:flex;gap:12px;align-items:flex-start;border-color:#F3D9A8')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F2A93B" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none;margin-top:2px')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span style={sx('font-weight:600')}>Recomendación: Hugo Salazar + Iván Cetina con unidad AU-2087</span>
              <span style={sx('font-size:14px;color:#3E4A59')}>Evalué 118 custodios de Centro y 74 de Bajío; 9 cumplen todos los requisitos y la ventana de descanso. Este es el ranking.</span>
            </div>
          </div>

          {LIST.map((c, i) => {
            const d = dec[c.id]
            return (
              <article key={c.id} className="card" style={sx(d === 'Asignado' ? 'border-color:#9ED9BC' : d === 'Descartado' ? 'opacity:.55' : '')}>
                <div style={sx('display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start')}>
                  <span style={sx('width:48px;height:48px;border-radius:50%;background:#FFF1DB;display:flex;align-items:center;justify-content:center;font-weight:600;color:#8A5300;flex:none')}>{c.name.split(' ').map(s => s[0]).join('')}</span>
                  <div style={sx('flex:1 1 260px;display:flex;flex-direction:column;gap:6px;min-width:0')}>
                    <div style={sx('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
                      <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>#{i + 1}</span>
                      <span style={sx('font-weight:600;font-size:16px')}>{c.name}</span>
                      <span className="pill p-mute">{c.id} · {c.base}</span>
                      {d && <span className={d === 'Asignado' ? 'pill p-ok' : 'pill p-mute'}>{d}</span>}
                    </div>
                    <span style={sx('font-size:14px;color:#3E4A59;text-wrap:pretty')}>{c.why}</span>
                    <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr));gap:10px;margin-top:6px')}>
                      {c.f.map((v, j) => (
                        <div key={j} title={KEYS[j] + ': ' + v + '/100'} style={sx('display:flex;flex-direction:column;gap:4px')}><span style={sx('font-size:12px;color:#5F6B7A')}>{KEYS[j]}</span><div className="track"><div style={sx(bar(v))}></div></div></div>
                      ))}
                    </div>
                  </div>
                  <div style={sx('display:flex;flex-direction:column;align-items:flex-end;gap:10px')}>
                    <span style={sx("font-family:'Archivo',sans-serif;font-size:28px;font-weight:600")}>{c.score}</span>
                    <div style={sx('display:flex;gap:8px')}>
                      <button type="button" className="btn btn-pri" aria-pressed={d === 'Asignado'} onClick={() => set(c, 'Asignado')}>Asignar</button>
                      <button type="button" className="btn" aria-pressed={d === 'Descartado'} onClick={() => set(c, 'Descartado')}>Descartar</button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}

          <div className="card" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span className="lbl">Unidad sugerida</span>
              <span style={sx('font-weight:600')}>AU-2087 · Nissan X-Trail 2024 · Tepotzotlán</span>
              <span style={sx('font-size:13px;color:#5F6B7A')}>A 6 km del origen · seguro y verificación vigentes · servicio en 4,200 km</span>
            </div>
            <span style={sx('font-size:14px;color:#3E4A59')}>{summary}</span>
            <Link className="btn btn-pri" to={ROUTES.Monitoreo}>Confirmar y pasar a monitoreo</Link>
          </div>
        </section>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px;border-color:#FBE3CF')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Detección de huecos · próximas 48 h</h2>
          <Link className="btn" to={ROUTES.Custodios}>Ver calendario de turnos</Link>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px')}>
          {GAPS.map(g => (
            <div key={g.zone} style={sx('background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:6px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px')}><span style={sx('font-weight:600')}>{g.zone}</span><span className={g.cls}>{g.delta}</span></div>
              <span style={sx('font-size:13px;color:#3E4A59')}>{g.text}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  )
}
