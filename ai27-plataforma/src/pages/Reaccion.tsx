import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'
import { useToast } from '../components/ui'
import { FRANJAS, casoPorId, casos, fmt, incidentesEn, mapaCalor, type Caso, type Entrada, type Resultado } from '../data/reaccion'

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
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
.sel{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif;max-width:100%}
.heat{display:flex;align-items:center;justify-content:center;height:40px;border-radius:4px;border:0;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:13px}
.heat:hover{outline:2px solid #F2A93B}
`

const LABELS = ['Detección', 'Aviso a autoridades', 'Equipo asignado', 'Búsqueda y seguimiento', 'Recuperación', 'Cierre y reporte']
const shade = (v: number) => ['#F3F5F8', '#FBE3CF', '#F5B98A', '#E8743B'][Math.min(v, 3)]
const RES_LABEL: Record<Resultado, string> = { total: 'Recuperación total', parcial: 'Recuperación parcial', perdida: 'Pérdida' }
const EVID0 = ['Foto 1', 'Foto 2', 'Acta MP']

/** Valores por tipo de resultado para el caso: [recuperado, pérdida]. */
const montos = (c: Caso, k: Resultado): [number, number] => k === 'total' ? [c.valor, 0] : k === 'perdida' ? [0, c.valor] : c.parcial

type Estado = { step: number; out: Resultado; log: Entrada[]; evid: string[] }
const inicial = (c: Caso): Estado => ({ step: c.step, out: c.resultado, log: c.log, evid: EVID0 })
/** Avance por caso durante la sesión (sobrevive al ir y volver del reporte). */
const CACHE: Record<string, Estado> = {}

export default function Reaccion() {
  const toast = useToast()
  const [search, setSearch] = useSearchParams()
  const caso = casoPorId(search.get('inc'))
  const [estados, setEstadosRaw] = useState<Record<string, Estado>>(CACHE)
  const setEstados = (f: (e: Record<string, Estado>) => Record<string, Estado>) => setEstadosRaw(e => { const n = f(e); Object.assign(CACHE, n); return n })
  const [draft, setDraft] = useState('')
  const [heatSel, setHeatSel] = useState<{ road: string; j: number } | null>(null)
  const [aseg, setAseg] = useState<Record<string, boolean>>({})
  const evidRef = useRef<HTMLInputElement>(null)
  const evidIdx = useRef(0)

  const est = estados[caso.id] ?? inicial(caso)
  const setEst = (patch: Partial<Estado>) => setEstados(e => ({ ...e, [caso.id]: { ...(e[caso.id] ?? inicial(caso)), ...patch } }))
  const { step, out, log } = est
  const heat = useMemo(mapaCalor, [])

  const abrir = (id: string) => {
    const c = casoPorId(id)
    if (c.esPrincipal) setSearch({}, { replace: true }); else setSearch({ inc: id }, { replace: true })
    setHeatSel(null)
    toast(`Caso ${c.id} abierto · ${c.titulo}`, 'info')
  }

  const steps = LABELS.map((label, i) => ({
    label, n: i + 1, time: i < step ? caso.times[i] : (i === step ? 'en curso' : '—'),
    style: 'display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:8px;' + (i < step ? 'background:#E3F6EC;color:#17784A' : i === step ? 'background:#FFF1DB;color:#8A5300;outline:1px solid #F2A93B' : 'background:#F3F5F8;color:#5F6B7A'),
  }))
  const next = () => {
    if (step >= 6) return
    const e = caso.stepLog[step]
    setEst({ step: Math.min(step + 1, 6), log: e ? [...log, e] : log })
    toast(step + 1 >= 6 ? `Incidente ${caso.id} cerrado · reporte listo para enviar` : `Etapa completada: ${LABELS[step]}`)
  }
  const nextLabel = step >= 6 ? 'Incidente cerrado' : 'Avanzar a: ' + LABELS[Math.min(step, 5)]
  const addEntry = () => {
    const text = draft.trim()
    if (!text) return
    const d = new Date()
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    setEst({ log: [...log, { t, text, who: 'Tú' }] })
    setDraft('')
    toast('Entrada registrada en la bitácora')
  }
  const cambiarResultado = (k: Resultado) => { setEst({ out: k }); toast(`Resultado: ${RES_LABEL[k]}`, k === 'perdida' ? 'bad' : k === 'parcial' ? 'warn' : 'ok') }
  const [rec, perd] = montos(caso, out)
  const reporteTo = caso.esPrincipal ? ROUTES.ReporteIncidente : `${ROUTES.ReporteIncidente}?inc=${caso.id}`
  const heatList = heatSel ? incidentesEn(heatSel.road, heatSel.j) : []

  return (
    <Shell active="reaccion" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px;min-width:0')}>
          <span className="lbl">Reacción · {caso.id}{!caso.esPrincipal && <> · {caso.fecha}</>}</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>{caso.titulo}</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>{caso.sub}</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap;align-items:center')}>
          <label style={sx('display:flex;flex-direction:column;gap:4px;font-size:12px;color:#5F6B7A')}>Caso
            <select className="sel" value={caso.id} onChange={e => abrir(e.target.value)} aria-label="Abrir otro caso">
              {casos.map(c => <option key={c.id} value={c.id}>{c.id} · {c.tipo} · {c.ubicacion.split(' km')[0]} · {c.cliente}{c.esPrincipal ? ' · en curso' : c.step >= 6 ? ' · cerrado' : ''}</option>)}
            </select>
          </label>
          <Link className="btn" to={reporteTo}>Reporte post-incidente</Link>
          <button type="button" className="btn btn-pri" onClick={next} disabled={step >= 6} style={step >= 6 ? sx('cursor:default') : undefined}>{nextLabel}</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · ruta probable de escape</span><span style={sx('font-size:14px;color:#3E4A59')}>{caso.esPrincipal ? 'En 12 incidentes previos en este tramo, 70% de los vehículos salió por el entronque a Polotitlán (km 151). Sugiero posicionar a Guardia Nacional ahí. La tasa de recuperación del área sube cada mes.' : `En ${heat.find(([r]) => caso.ubicacion.startsWith(r))?.[1].reduce((a, b) => a + b, 0) ?? 0} incidentes del trimestre en ${caso.ubicacion.split(' km')[0]}, la franja ${FRANJAS[Math.min(5, Math.floor((Number(caso.times[0].slice(0, 2)) || 0) / 4))]} concentra el mayor riesgo. Sugiero posicionar a ${caso.autoridades.split(' · ')[0]} en el siguiente entronque. La tasa de recuperación del área sube cada mes.`}</span></div>
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
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Alerta → incidente</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>{caso.minutos.incidente} min</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Aviso a autoridades</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600")}>{caso.minutos.autoridades ? caso.minutos.autoridades + ' min' : '—'}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{caso.autoridades}</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Equipo en sitio</span><span style={sx("font-family:'Archivo';font-size:28px;font-weight:600" + (caso.minutos.sitio > 20 ? ';color:#B42318' : ''))}>{caso.minutos.sitio} min</span><span style={sx('font-size:13px;color:#5F6B7A')}>Meta: 20 min</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Equipo de reacción</span><span style={sx("font-family:'Archivo';font-size:20px;font-weight:600")}>{caso.equipo}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{caso.equipoDetalle}</span></div>
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
            <span style={sx('display:flex;gap:8px')}>
              <input type="text" placeholder="Acción, contacto o hallazgo" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }} style={sx("flex:1;min-height:44px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif")} />
              <button type="button" className="btn" onClick={addEntry} disabled={!draft.trim()} style={!draft.trim() ? sx('opacity:.5;cursor:default') : undefined}>Registrar</button>
            </span>
          </label>
        </section>

        <section className="card" style={sx('flex:1 1 300px;display:flex;flex-direction:column;gap:16px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Resultado</h2>
          <fieldset style={sx('border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px')}>
            <legend className="lbl" style={sx('margin-bottom:8px')}>Recuperación{caso.resultadoTexto === 'Sin afectación' && <span className="pill p-ok" style={sx('margin-left:8px;text-transform:none;letter-spacing:0')}>Sin afectación</span>}</legend>
            {(Object.keys(RES_LABEL) as Resultado[]).map(k => (
              <button key={k} type="button" className="btn" aria-pressed={k === out} style={sx(k === out ? 'justify-content:flex-start;background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : 'justify-content:flex-start')} onClick={() => cambiarResultado(k)}>{RES_LABEL[k]}</button>
            ))}
          </fieldset>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
            <div><dt className="lbl">Valor recuperado</dt><dd className="mono" style={sx('margin:4px 0 0;color:#17784A')}>{fmt(rec)}</dd></div>
            <div><dt className="lbl">Pérdida</dt><dd className="mono" style={sx('margin:4px 0 0;color:#B42318')}>{fmt(perd)}</dd></div>
            <div><dt className="lbl">Denuncia</dt><dd className="mono" style={sx('margin:4px 0 0;overflow-wrap:anywhere')}>{caso.denuncia}</dd></div>
            <div><dt className="lbl">Aseguradora</dt><dd style={sx('margin:4px 0 0')}><button type="button" onClick={() => { setAseg(a => ({ ...a, [caso.id]: true })); toast(`Siniestro de ${caso.id} ${aseg[caso.id] ? 'reenviado' : 'notificado'} a la aseguradora de ${caso.cliente} por correo`) }} style={sx('background:none;border:0;padding:0;cursor:pointer;color:#B36B00;font:inherit;text-decoration:underline;text-align:left')}>{aseg[caso.id] ? 'Siniestro reportado · reenviar' : caso.denuncia === '—' ? 'Notificar siniestro' : 'Siniestro reportado'}</button></dd></div>
          </dl>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Evidencias</span>
            <input ref={evidRef} type="file" accept="image/*,application/pdf" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) { const ev = est.evid.slice(); ev[evidIdx.current] = f.name; setEst({ evid: ev }); toast(`Evidencia adjuntada: ${f.name}`) }; e.target.value = '' }} />
            <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px')}>
              {est.evid.map((e, i) => (
                <button key={i} type="button" title="Adjuntar evidencia" onClick={() => { evidIdx.current = i; evidRef.current?.click() }} style={sx('aspect-ratio:1;background:' + (EVID0.includes(e) ? '#F3F5F8' : '#E3F6EC') + ';border:1px dashed #D5DBE3;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A;cursor:pointer;font-family:inherit;padding:4px;overflow:hidden;word-break:break-all;text-align:center')}>{e}</button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Mapa de calor · incidentes por carretera y horario (trimestre)</h2>
          <span style={sx('font-size:13px;color:#5F6B7A')}>{heat.reduce((a, [, v]) => a + v.reduce((x, y) => x + y, 0), 0)} incidentes · alimenta el factor de riesgo del cotizador</span>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:200px repeat(6,minmax(64px,1fr));gap:4px;min-width:640px;font-size:13px')}>
            <span></span>{FRANJAS.map(f => <span key={f} className="lbl" style={sx('text-align:center')}>{f}</span>)}
            {heat.map(([road, vs]) => [
              <span key={road} style={sx('display:flex;align-items:center')}>{road}</span>,
              ...vs.map((v, j) => (
                <button key={road + j} type="button" className="heat" aria-pressed={heatSel?.road === road && heatSel.j === j} title={`${road} · ${FRANJAS[j]} h · ${v} ${v === 1 ? 'incidente' : 'incidentes'}`} onClick={() => setHeatSel(heatSel?.road === road && heatSel.j === j ? null : { road, j })}
                  style={sx('background:' + shade(v) + ';color:' + (v ? '#5A2A0A' : '#A0AAB6') + (heatSel?.road === road && heatSel.j === j ? ';outline:2px solid #F2A93B' : ''))}>{v}</button>
              )),
            ])}
          </div>
        </div>
        {heatSel && (
          <div style={sx('display:flex;flex-direction:column;gap:6px;border-top:1px solid #EEF1F4;padding-top:12px')}>
            <span style={sx('font-size:14px;font-weight:600')}>{heatSel.road} · {FRANJAS[heatSel.j]} h · {heatList.length} {heatList.length === 1 ? 'incidente' : 'incidentes'}</span>
            {heatList.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A')}>Sin incidentes en esta franja durante el trimestre.</span>}
            {heatList.map(i => (
              <div key={i.id} style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
                <span className="mono" style={sx('min-width:72px')}>{i.id}</span><span style={sx('min-width:120px')}>{i.tipo}</span><span style={sx('color:#3E4A59;min-width:160px')}>{i.cliente} · {i.servicio}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{i.fecha} {i.hora}</span>
                <span className={'pill ' + (i.resultado === 'Pérdida' ? 'p-bad' : i.resultado === 'Recuperación parcial' ? 'p-warn' : 'p-ok')}>{i.resultado}</span>
                <button type="button" className="btn btn-sm" onClick={() => abrir(i.id)}>Abrir caso</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </Shell>
  )
}
