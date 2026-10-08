import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { simularEventos, type EventoTelemetria, type TipoEvento } from '../lib/telemetria'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.city{font:500 13px 'IBM Plex Sans',sans-serif;fill:#5F6B7A}
@keyframes ping{0%{r:8;opacity:.9}100%{r:26;opacity:0}}
.ping{animation:ping 1.6s ease-out infinite}
@keyframes feedIn{from{background:#FFF8EC}to{background:transparent}}
.feed-new{animation:feedIn 2.4s ease-out}
`

type Src = 'all' | 'samsara' | 'ruptela'
type Ev = { k: string; t: string; text: string; src: 'Samsara' | 'Ruptela'; cls: string; nuevo?: boolean }

const SOURCES: [Src, string][] = [['all', 'Todas las fuentes'], ['samsara', 'Samsara'], ['ruptela', 'Ruptela']]

const BASE: Ev[] = [
  { k: 'b1', t: '14:30:12', text: 'Desvío de ruta · TR-88213', src: 'Samsara', cls: 'pill p-bad' },
  { k: 'b2', t: '14:29:40', text: 'Separación 1.1 km · AU-3321 / TR-88213', src: 'Samsara', cls: 'pill p-warn' },
  { k: 'b3', t: '14:27:03', text: 'Pérdida de señal · TR-71540', src: 'Ruptela', cls: 'pill p-warn' },
  { k: 'b4', t: '14:25:51', text: 'Entrada a geocerca · CEDIS Monterrey', src: 'Samsara', cls: 'pill p-info' },
  { k: 'b5', t: '14:24:18', text: 'Frenado brusco · AU-1876', src: 'Samsara', cls: 'pill p-mute' },
  { k: 'b6', t: '14:22:09', text: 'Parada no autorizada 6 min · TR-66012', src: 'Ruptela', cls: 'pill p-warn' },
  { k: 'b7', t: '14:20:44', text: 'Evento de cámara: distracción · AU-2051', src: 'Samsara', cls: 'pill p-mute' },
]

/** Texto y severidad por tipo de evento normalizado (adaptador Samsara/Ruptela). */
const TIPO: Record<TipoEvento, [string, string]> = {
  ubicacion: ['Posición reportada', 'pill p-mute'],
  parada: ['Parada detectada', 'pill p-warn'],
  desvio: ['Desvío de ruta', 'pill p-bad'],
  geocerca: ['Salida de geocerca', 'pill p-info'],
  panico: ['Botón de pánico', 'pill p-bad'],
  gps_desconectado: ['Pérdida de señal', 'pill p-warn'],
  frenado_brusco: ['Frenado brusco', 'pill p-mute'],
  separacion: ['Separación custodio–tráiler', 'pill p-warn'],
  zona_riesgo: ['Entrada a zona de riesgo', 'pill p-warn'],
}

const T0 = 14 * 3600 + 30 * 60 + 12 // 14:30:12, último evento del diseño
const hms = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':')

function toEv(e: EventoTelemetria, i: number): Ev {
  const [label, cls] = TIPO[e.tipo]
  const extra = e.tipo === 'ubicacion' ? ` ${e.velocidad} km/h` : ''
  return { k: 'live' + i, t: hms(T0 + (i + 1) * 23), text: `${label}${extra} · ${e.unidad}`, src: e.fuente === 'samsara' ? 'Samsara' : 'Ruptela', cls, nuevo: true }
}

/** Puntos de la ruta de SRV-24817 en el mapa, ligados al porcentaje del replay. */
const RUTA: [number, number, number][] = [[0, 500, 370], [41, 470, 330], [77, 456, 337], [100, 438, 344]]
function posReplay(r: number) {
  for (let i = 1; i < RUTA.length; i++) {
    const [p0, x0, y0] = RUTA[i - 1], [p1, x1, y1] = RUTA[i]
    if (r <= p1) { const f = (r - p0) / (p1 - p0); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f] }
  }
  return [438, 344]
}

export default function Monitoreo() {
  const [src, setSrc] = useState<Src>('all')
  const [replay, setReplay] = useState(92)
  const [playing, setPlaying] = useState(false)
  const sim = useMemo(() => simularEventos(60).map(toEv), [])
  const [live, setLive] = useState(0)

  // Feed en vivo: cada 6 s entra un evento normalizado desde el adaptador de telemetría.
  useEffect(() => {
    const id = window.setInterval(() => setLive(n => Math.min(n + 1, sim.length)), 6000)
    return () => window.clearInterval(id)
  }, [sim.length])

  // Reproducción automática del replay.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setReplay(r => { if (r >= 100) { setPlaying(false); return 100 } return r + 1 }), 120)
    return () => window.clearInterval(id)
  }, [playing])

  const all = [...sim.slice(0, live).reverse(), ...BASE]
  const events = (src === 'all' ? all : all.filter(e => e.src.toLowerCase() === src)).slice(0, 7)

  const mins = Math.round(492 + (870 - 492) * replay / 100)
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0')
  const replayLabel = hh + ':' + mm + ' · ' + Math.round(replay * 2.1) + ' km recorridos'
  const [rx, ry] = posReplay(replay)

  return (
    <Shell active="monitoreo" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px">
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Monitoreo</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Mapa en vivo</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>128 custodios · 94 autos de custodia · 212 tráileres reportando</span>
        </div>
        <div role="group" aria-label="Fuente de telemetría" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
          {SOURCES.map(([k, label]) => (
            <button key={k} type="button" className="btn" aria-pressed={k === src} style={sx(k === src ? 'background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : '')} onClick={() => setSrc(k)}>{label}</button>
          ))}
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · patrón de robo detectado</span><span style={sx('font-size:14px;color:#3E4A59')}>El desvío de SRV-24817 coincide 87% con 5 robos previos en Méx–Qro: salida a terracería, velocidad baja y separación del custodio. Recomiendo escalar a Reacción ahora y pre-alertar a la unidad R-03.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Incidentes por franja horaria: el pico está entre 21 y 24 horas, seguido de 00 a 03" style={sx('display:block')}><g fill="#AEB8C4"><rect x="4" y="12" width="20" height="48" rx="2"></rect><rect x="31" y="42" width="20" height="18" rx="2"></rect><rect x="58" y="54" width="20" height="6" rx="2"></rect><rect x="85" y="48" width="20" height="12" rx="2"></rect><rect x="139" y="30" width="20" height="30" rx="2"></rect><rect x="166" y="36" width="20" height="24" rx="2"></rect><rect x="193" y="6" width="20" height="54" rx="2"></rect></g><rect x="112" y="24" width="20" height="36" rx="2" fill="#D9534F"></rect></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Incidentes por franja de 3 h · rojo: ahora</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.Reaccion}>Escalar a Reacción</Link>
      </section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:stretch')}>
        <section className="card" style={sx('flex:999 1 560px;padding:0;overflow:hidden;position:relative;display:flex;flex-direction:column')}>
          <svg viewBox="0 0 900 560" role="img" aria-label="Mapa de rutas activas en el centro del país" style={sx('width:100%;height:auto;display:block;background:#F7F9FB')}>
            <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#F3F5F8" strokeWidth="1"></path></pattern></defs>
            <rect width="900" height="560" fill="url(#g)"></rect>
            <path d="M560 120L480 250L450 320L500 370L560 390L660 370M300 330L390 290L450 320M480 250L390 290M500 370L470 380L300 330M500 370L520 345L560 120" fill="none" stroke="#D5DBE3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M500 370L470 330L450 320L480 250" fill="none" stroke="#3FA7C9" strokeWidth="3" strokeDasharray="2 0"></path>
            <path d="M470 330L438 344L450 320" fill="none" stroke="#F0605D" strokeWidth="3" strokeDasharray="6 5"></path>
            <path d="M520 345L560 120" fill="none" stroke="#3FA7C9" strokeWidth="3"></path>
            <path d="M560 390L660 370" fill="none" stroke="#3FA7C9" strokeWidth="3"></path>
            <g className="city">
              <text x="572" y="116">Monterrey</text><text x="492" y="246">San Luis Potosí</text><text x="236" y="352">Guadalajara</text><text x="352" y="280">León</text><text x="372" y="316">Querétaro</text><text x="512" y="398">CDMX</text><text x="532" y="340">Pachuca</text><text x="566" y="414">Puebla</text><text x="668" y="366">Veracruz</text>
            </g>
            <circle cx="438" cy="344" r="8" fill="none" stroke="#F0605D" strokeWidth="2" className="ping"></circle>
            <rect x="432" y="338" width="12" height="12" rx="2" fill="#0B6A8A"></rect>
            <circle cx="452" cy="352" r="7" fill="#F2A93B"></circle>
            <path d="M438 344L452 352" stroke="#F0605D" strokeWidth="2" strokeDasharray="3 3"></path>
            <rect x="534" y="222" width="12" height="12" rx="2" fill="#0B6A8A"></rect><circle cx="548" cy="238" r="7" fill="#F2A93B"></circle>
            <rect x="604" y="374" width="12" height="12" rx="2" fill="#0B6A8A"></rect><circle cx="620" cy="388" r="7" fill="#F2A93B"></circle>
            <rect x="470" y="282" width="12" height="12" rx="2" fill="#0B6A8A"></rect><circle cx="486" cy="296" r="7" fill="#F2A93B"></circle>
            <rect x="356" y="306" width="12" height="12" rx="2" fill="#0B6A8A"></rect><circle cx="372" cy="296" r="7" fill="#F2A93B"></circle>
            {/* Posición del replay de SRV-24817 */}
            <g aria-label={'Replay ' + replayLabel}>
              <circle cx={rx} cy={ry} r="6" fill="#FFFFFF" stroke="#121821" strokeWidth="2"></circle>
              <circle cx={rx} cy={ry} r="2" fill="#121821"></circle>
            </g>
            <rect x="140" y="470" width="300" height="70" rx="8" fill="#FFFFFF" stroke="#E4E8ED"></rect>
            <rect x="158" y="488" width="12" height="12" rx="2" fill="#0B6A8A"></rect><text x="178" y="499" className="city" style={sx('fill:#3E4A59')}>Tráiler del cliente</text>
            <circle cx="164" cy="520" r="6" fill="#F2A93B"></circle><text x="178" y="525" className="city" style={sx('fill:#3E4A59')}>Custodio / auto de custodia</text>
            <path d="M320 494H348" stroke="#F0605D" strokeWidth="3" strokeDasharray="6 5"></path><text x="356" y="499" className="city" style={sx('fill:#3E4A59')}>Desvío</text>
          </svg>
          <div style={sx('padding:16px 20px;display:flex;flex-direction:column;gap:10px;border-top:1px solid #E4E8ED')}>
            <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
              <span className="lbl" style={sx('display:inline-flex;align-items:center;gap:10px')}>
                <button type="button" onClick={() => { if (!playing && replay >= 100) setReplay(0); setPlaying(p => !p) }} aria-label={playing ? 'Pausar replay' : 'Reproducir replay'}
                  style={sx('display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:1px solid #D5DBE3;background:#F3F5F8;cursor:pointer;padding:0;color:#121821')}>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">{playing ? <path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" /> : <path d="M3 1.5l7 4.5-7 4.5z" fill="currentColor" />}</svg>
                </button>
                Replay de ruta · SRV-24817
              </span>
              <span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{replayLabel}</span>
            </div>
            <label style={sx('display:flex;gap:12px;align-items:center')}>
              <span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Posición del replay</span>
              <input type="range" min="0" max="100" value={replay} onChange={e => { setPlaying(false); setReplay(Number(e.target.value)) }} style={sx('flex:1;accent-color:#F2A93B;min-height:44px')} />
            </label>
            <div style={sx('display:flex;justify-content:space-between;font-size:12px;color:#5F6B7A')}>
              {([['08:12 salida', 0], ['10:47 parada', 41], ['13:05 frenado', 77], ['14:30 desvío', 100]] as const).map(([l, p]) => (
                <span key={l} role="button" tabIndex={0} style={sx('cursor:pointer')} onClick={() => { setPlaying(false); setReplay(p) }} onKeyDown={e => { if (e.key === 'Enter') { setPlaying(false); setReplay(p) } }}>{l}</span>
              ))}
            </div>
          </div>
        </section>

        <aside style={sx('flex:1 1 320px;display:flex;flex-direction:column;gap:16px;min-width:0')}>
          <div className="card" style={sx('display:flex;flex-direction:column;gap:12px;border-color:#F5C2C2')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:8px')}><span className="pill p-bad">Crítica · Desvío de ruta</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>14:30:12</span></div>
            <span style={sx('font-weight:600;font-size:16px')}>SRV-24817 · Alpura · TR-88213</span>
            <span style={sx('font-size:14px;color:#3E4A59')}>1.6 km fuera de geocerca hacia camino de terracería, km 142 Méx–Qro. Custodio a 1.1 km del tráiler. Velocidad 38 km/h.</span>
            <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
              <Link className="btn btn-pri" to={ROUTES.Reaccion}>Abrir incidente</Link>
              <a className="btn" href="tel:+520000000000">Llamar custodio</a>
            </div>
          </div>
          <div className="card" style={sx('display:flex;flex-direction:column;gap:4px')}>
            <h2 style={sx("margin:0 0 8px;font-family:'Archivo',sans-serif;font-size:16px;font-weight:600")}>Eventos entrantes</h2>
            {events.map(e => (
              <div key={e.k} className={e.nuevo ? 'feed-new' : undefined} style={sx('display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid #EEF1F4;font-size:13px')}>
                <span className="mono" style={sx('color:#5F6B7A')}>{e.t}</span>
                <span style={sx('min-width:0')}>{e.text}</span>
                <span className={e.cls}>{e.src}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Alertas abiertas</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>7</span><span style={sx('font-size:13px;color:#5F6B7A')}>1 crítica · 3 altas · 3 medias</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Separación custodio–tráiler</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>2</span><span style={sx('font-size:13px;color:#5F6B7A')}>Umbral 1 km por más de 3 min</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Sin señal</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>3</span><span style={sx('font-size:13px;color:#5F6B7A')}>2 Ruptela · 1 Samsara</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">En zona de riesgo</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>11</span><span style={sx('font-size:13px;color:#5F6B7A')}>Arco Norte y Puebla–Orizaba</span></div>
      </section>
    </Shell>
  )
}
