import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
`

const LABELS = ['Detección', 'Aviso a autoridades', 'Equipo asignado', 'Búsqueda y seguimiento', 'Recuperación', 'Cierre y reporte']
const TIMES = ['14:30', '14:34', '14:35', '14:47', '15:40', '18:20']
/** Entrada de bitácora que se registra al completar cada paso con el botón "Avanzar". */
const STEP_LOG: Record<number, { t: string; text: string; who: string }> = {
  3: { t: '15:05', text: 'Búsqueda y seguimiento concluidos; tráiler bajo resguardo de R-03', who: 'G. Pacheco' },
  4: { t: '15:40', text: 'Carga inspeccionada y servicio reanudado', who: 'Coordinación' },
  5: { t: '18:20', text: 'Incidente cerrado; reporte post-incidente emitido', who: 'L. Herrera' },
}
const O = {
  total: ['Recuperación total', '$2,400,000', '$0'],
  parcial: ['Recuperación parcial', '$1,750,000', '$650,000'],
  perdida: ['Pérdida', '$0', '$2,400,000'],
} as const
type Out = keyof typeof O
const HEAT: [string, number[]][] = [['Arco Norte', [3, 1, 0, 0, 1, 2]], ['Méx–Puebla–Orizaba', [2, 1, 0, 1, 0, 2]], ['Méx–Querétaro', [1, 1, 0, 1, 1, 1]], ['Querétaro–SLP', [2, 0, 0, 0, 0, 2]], ['Guadalajara–Colima', [1, 0, 0, 0, 1, 1]], ['Monterrey–Nuevo Laredo', [0, 1, 0, 0, 0, 1]]]
const shade = (v: number) => ['#F3F5F8', '#FBE3CF', '#F5B98A', '#E8743B'][Math.min(v, 3)]
const LOG0 = [
  { t: '14:30', text: 'Alerta de desvío Samsara convertida en incidente (intento de robo)', who: 'L. Herrera' },
  { t: '14:31', text: 'Custodio R. Medina reporta cierre del paso por dos vehículos', who: 'Radio' },
  { t: '14:34', text: 'Aviso a Guardia Nacional y C5 Edomex, folio 88213', who: 'L. Herrera' },
  { t: '14:35', text: 'Unidad de reacción R-03 asignada, sale de San Juan del Río', who: 'Coordinación' },
  { t: '14:39', text: 'Tráiler detenido en camino de terracería; motor apagado remoto', who: 'Samsara' },
  { t: '14:47', text: 'R-03 y Guardia Nacional en sitio; agresores huyen', who: 'G. Pacheco' },
  { t: '14:52', text: 'Inspección de sellos: carga íntegra', who: 'G. Pacheco' },
  { t: '14:58', text: 'Aviso al cliente Alpura y a aseguradora', who: 'Coordinación' },
]

export default function Reaccion() {
  const [step, setStep] = useState(3)
  const [out, setOut] = useState<Out>('total')
  const [log, setLog] = useState(LOG0)
  const [draft, setDraft] = useState('')

  const steps = LABELS.map((label, i) => ({
    label, n: i + 1, time: i < step ? TIMES[i] : (i === step ? 'en curso' : '—'),
    style: 'display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:8px;' + (i < step ? 'background:#E3F6EC;color:#17784A' : i === step ? 'background:#FFF1DB;color:#8A5300;outline:1px solid #F2A93B' : 'background:#F3F5F8;color:#5F6B7A'),
  }))
  const next = () => {
    if (step >= 6) return
    const e = STEP_LOG[step]
    if (e) setLog(l => [...l, e])
    setStep(Math.min(step + 1, 6))
  }
  const nextLabel = step >= 6 ? 'Incidente cerrado' : 'Avanzar a: ' + LABELS[Math.min(step, 5)]
  const addEntry = () => {
    const text = draft.trim()
    if (!text) return
    const d = new Date()
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    setLog(l => [...l, { t, text, who: 'Tú' }])
    setDraft('')
  }

  return (
    <Shell active="reaccion" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Reacción · INC-0412</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Intento de robo · Méx–Qro km 142</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>Abierto desde alerta Samsara · SRV-24817 · Alpura · lácteos refrigerados $2.4M</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <Link className="btn" to={ROUTES.ReporteIncidente}>Reporte post-incidente</Link>
          <button type="button" className="btn btn-pri" onClick={next} disabled={step >= 6} style={step >= 6 ? sx('cursor:default') : undefined}>{nextLabel}</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · ruta probable de escape</span><span style={sx('font-size:14px;color:#3E4A59')}>En 12 incidentes previos en este tramo, 70% de los vehículos salió por el entronque a Polotitlán (km 151). Sugiero posicionar a Guardia Nacional ahí. La tasa de recuperación del área sube cada mes.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Porcentaje de recuperación de abril a septiembre: 61, 64, 66, 70, 69 y 72 por ciento" style={sx('display:block')}><path d="M10 60H210" stroke="#E4E8ED"></path><polyline points="10,47 50,38 90,32 130,20 170,23 210,14" fill="none" stroke="#2B9A66" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline><circle cx="210" cy="14" r="4" fill="#2B9A66"></circle><text x="176" y="10" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#17784A">72%</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>% de recuperación · abr a sep</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <ol aria-label="Flujo de reacción" style={sx('list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:8px')}>
        {steps.map(s => (
          <li key={s.n} style={sx(s.style)} aria-current={s.n - 1 === step ? 'step' : undefined}>
            <span className="mono" style={sx('font-size:12px;opacity:.85')}>{s.n} · {s.time}</span>
            <span style={sx('font-weight:600;font-size:14px')}>{s.label}</span>
          </li>
        ))}
      </ol>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Alerta → incidente</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>1 min</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Aviso a autoridades</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>4 min</span><span style={sx('font-size:13px;color:#5F6B7A')}>Guardia Nacional · C5 Edomex</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Equipo en sitio</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>17 min</span><span style={sx('font-size:13px;color:#5F6B7A')}>Meta: 20 min</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Equipo de reacción</span><span style={sx("font-family:'Archivo';font-size:20px;font-weight:600")}>Unidad R-03</span><span style={sx('font-size:13px;color:#5F6B7A')}>G. Pacheco + 3 · base San Juan del Río</span></div>
      </section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <section className="card" style={sx('flex:999 1 480px;display:flex;flex-direction:column;gap:12px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Bitácora minuto a minuto</h2>
          <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column')}>
            {log.map((l, i) => (
              <li key={i} style={sx('display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid #EEF1F4;align-items:start')}>
                <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{l.t}</span>
                <span style={sx('font-size:14px')}>{l.text}</span>
                <span style={sx('font-size:12px;color:#5F6B7A;white-space:nowrap')}>{l.who}</span>
              </li>
            ))}
          </ol>
          <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Nueva entrada
            <input type="text" placeholder="Acción, contacto o hallazgo" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }} style={sx("min-height:44px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif")} />
          </label>
        </section>

        <section className="card" style={sx('flex:1 1 300px;display:flex;flex-direction:column;gap:16px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Resultado</h2>
          <fieldset style={sx('border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px')}>
            <legend className="lbl" style={sx('margin-bottom:8px')}>Recuperación</legend>
            {(Object.keys(O) as Out[]).map(k => (
              <button key={k} type="button" className="btn" aria-pressed={k === out} style={sx(k === out ? 'justify-content:flex-start;background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : 'justify-content:flex-start')} onClick={() => setOut(k)}>{O[k][0]}</button>
            ))}
          </fieldset>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
            <div><dt className="lbl">Valor recuperado</dt><dd className="mono" style={sx('margin:4px 0 0;color:#17784A')}>{O[out][1]}</dd></div>
            <div><dt className="lbl">Pérdida</dt><dd className="mono" style={sx('margin:4px 0 0;color:#B42318')}>{O[out][2]}</dd></div>
            <div><dt className="lbl">Denuncia</dt><dd className="mono" style={sx('margin:4px 0 0')}>FGJEM/CUA/1184/2026</dd></div>
            <div><dt className="lbl">Aseguradora</dt><dd style={sx('margin:4px 0 0')}>Siniestro reportado</dd></div>
          </dl>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Evidencias</span>
            <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px')}>
              <div style={sx('aspect-ratio:1;background:#F3F5F8;border:1px dashed #D5DBE3;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A')}>Foto 1</div>
              <div style={sx('aspect-ratio:1;background:#F3F5F8;border:1px dashed #D5DBE3;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A')}>Foto 2</div>
              <div style={sx('aspect-ratio:1;background:#F3F5F8;border:1px dashed #D5DBE3;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A')}>Acta MP</div>
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Mapa de calor · incidentes por carretera y horario (trimestre)</h2>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Alimenta el factor de riesgo del cotizador</span>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:200px repeat(6,minmax(64px,1fr));gap:4px;min-width:640px;font-size:13px')}>
            <span></span><span className="lbl" style={sx('text-align:center')}>00–04</span><span className="lbl" style={sx('text-align:center')}>04–08</span><span className="lbl" style={sx('text-align:center')}>08–12</span><span className="lbl" style={sx('text-align:center')}>12–16</span><span className="lbl" style={sx('text-align:center')}>16–20</span><span className="lbl" style={sx('text-align:center')}>20–24</span>
            {HEAT.map(([road, vs]) => [
              <span key={road} style={sx('display:flex;align-items:center')}>{road}</span>,
              ...vs.map((v, j) => (
                <span key={road + j} className="mono" style={sx('display:flex;align-items:center;justify-content:center;height:40px;border-radius:4px;background:' + shade(v) + ';color:' + (v ? '#5A2A0A' : '#A0AAB6'))}>{v}</span>
              )),
            ])}
          </div>
        </div>
      </section>
    </Shell>
  )
}
