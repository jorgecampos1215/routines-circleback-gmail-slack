import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { actions, useStore, type DecisionIA } from '../lib/store'
import { Modal, Field, inputStyle, btnStyle, btnPriStyle, useToast } from '../components/ui'
import { SERVICIO, FACTORES, candidatos, resumenEvaluacion, riesgoRuta, unidadesDisponibles, type Candidato } from '../data/asignacion'
import { coberturaPorZona, sugerirCobertura, PICOS_48H, type Cobertura } from '../data/cobertura'
import type { Zona } from '../data/seed'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 14px 'Montserrat',sans-serif}
.track{height:6px;border-radius:3px;background:#EBEEF2;overflow:hidden}
.gap{cursor:pointer;border:1px solid transparent;text-align:left;font:inherit;color:inherit}.gap:hover{border-color:#475CC7}
`

type Dec = 'Asignado' | 'Descartado'
const bar = (v: number) => 'height:100%;width:' + v + '%;background:' + (v >= 80 ? '#4CC38A' : v >= 60 ? '#3FA7C9' : '#475CC7')
const PASO = 4

/** Última decisión registrada por custodio para este servicio (el store guarda la más reciente primero). */
function desdeStore(decs: DecisionIA[], lista: Candidato[]): Record<string, Dec> {
  const out: Record<string, Dec> = {}
  for (const d of decs) {
    if (d.servicio !== SERVICIO.id) continue
    const c = lista.find(x => x.name === d.custodio)
    if (c && !out[c.id]) out[c.id] = d.decision === 'aceptada' ? 'Asignado' : 'Descartado'
  }
  return out
}

type Hueco = { key: string; zona: Zona; titulo: string; diff: number; cls: string; text: string; cob?: Cobertura }

export default function AsignacionIA() {
  const navigate = useNavigate()
  const toast = useToast()
  const LIST = useMemo(() => candidatos(), [])
  const resumen = useMemo(() => resumenEvaluacion(), [])
  const riesgo = useMemo(() => riesgoRuta(), [])
  const UNIDADES = useMemo(() => unidadesDisponibles(), [])
  const cobertura = useMemo(() => coberturaPorZona(), [])
  const decisiones = useStore(s => s.decisiones)
  const [dec, setDec] = useState<Record<string, Dec>>(() => desdeStore(decisiones, LIST))
  const [visibles, setVisibles] = useState(PASO)
  const [soloCumplen, setSoloCumplen] = useState(false)
  const [form, setForm] = useState({ cliente: SERVICIO.cliente, origen: SERVICIO.origen, destino: SERVICIO.destino, fecha: SERVICIO.fecha, salida: SERVICIO.salida, custodios: String(SERVICIO.custodios), unidades: String(SERVICIO.unidades) })
  const [unidadId, setUnidadId] = useState(UNIDADES[0]?.id ?? 'AU-2087')
  const [modal, setModal] = useState<'unidad' | Hueco | null>(null)
  const [cubiertos, setCubiertos] = useState<Record<string, string>>({})

  const requeridos = Math.max(1, parseInt(form.custodios) || 1)
  const lista = soloCumplen ? LIST.filter(c => c.cumple) : LIST
  const mostrados = lista.slice(0, visibles)
  const unidad = UNIDADES.find(u => u.id === unidadId) ?? UNIDADES[0]

  const set = (c: Candidato, v: Dec) => {
    if (dec[c.id] === v) return
    setDec(d => ({ ...d, [c.id]: v }))
    actions.registrarDecision({ servicio: SERVICIO.id, custodio: c.name, decision: v === 'Asignado' ? 'aceptada' : 'descartada' })
    toast(v === 'Asignado' ? `${c.name} asignado a ${SERVICIO.id}` : `${c.name} descartado · la decisión alimenta al modelo`, v === 'Asignado' ? 'ok' : 'info')
  }
  const assigned = LIST.filter(c => dec[c.id] === 'Asignado')
  const summary = assigned.length ? `Asignados ${assigned.length} de ${requeridos}: ${assigned.map(c => c.name).join(', ')} · la decisión queda registrada para el modelo` : 'Sin custodios asignados todavía'
  const top = LIST.slice(0, requeridos).map(c => c.name)

  const confirmar = () => {
    if (assigned.length < requeridos) { toast(`Asigna ${requeridos - assigned.length} custodio${requeridos - assigned.length > 1 ? 's' : ''} más antes de confirmar`, 'warn'); return }
    actions.crearServicio({ cliente: form.cliente, tipo: 'Por evento', ruta: `${form.origen.split(',')[0]}–${form.destino.split(',')[0]}`, precio: 38500 })
    toast(`${SERVICIO.id} confirmado con ${assigned.map(c => c.name.split(' ')[0]).join(' y ')} y unidad ${unidad?.id}. Pasando a monitoreo.`)
    navigate(ROUTES.Monitoreo)
  }

  const huecos: Hueco[] = useMemo(() => {
    const porZona: Hueco[] = cobertura.map(c => {
      const sug = c.diff < 0 ? sugerirCobertura(c.zona, -c.diff, cobertura) : []
      const text = c.diff < 0
        ? `${c.requeridos} servicios agendados, ${c.disponibles} custodios disponibles.${sug.length ? ' Sugerencia: mover ' + sug.map(s => `${s.n} de ${s.zona}`).join(', ').replace(/, ([^,]*)$/, ' y $1') + '.' : ' Sin excedente cercano: considerar horas extra.'}`
        : c.diff === 0 ? `${c.requeridos} servicios agendados, ${c.disponibles} disponibles: cobertura justa, sin reserva.`
        : `Cobertura completa con ${c.diff} custodio${c.diff > 1 ? 's' : ''} de reserva${c.diff >= 5 ? ' · excedente disponible para apoyar a otras zonas' : ''}.`
      return { key: c.zona, zona: c.zona, titulo: `${c.zona} · mañana`, diff: c.diff, cls: c.diff < 0 ? 'pill p-bad' : c.diff === 0 ? 'pill p-warn' : 'pill p-ok', text, cob: c }
    })
    const picos: Hueco[] = PICOS_48H.map(p => {
      const c = cobertura.find(x => x.zona === p.zona)!
      const diff = c.disponibles - c.vacaciones - p.eventos
      return { key: p.zona + p.dia, zona: p.zona, titulo: `${p.zona} · ${p.dia}`, diff, cls: diff < 0 ? 'pill p-bad' : diff === 0 ? 'pill p-warn' : 'pill p-ok', text: `Pico de ${p.cliente} (${p.eventos} eventos). ${c.vacaciones} custodio${c.vacaciones === 1 ? '' : 's'} con vacaciones aprobadas.`, cob: c }
    })
    return [...porZona, ...picos].sort((a, b) => a.diff - b.diff)
  }, [cobertura])

  const cubrir = (h: Hueco) => {
    const sug = sugerirCobertura(h.zona, -h.diff, cobertura)
    const txt = sug.length ? sug.map(s => `${s.n} de ${s.zona}`).join(', ').replace(/, ([^,]*)$/, ' y $1') : 'horas extra autorizadas'
    setCubiertos(c => ({ ...c, [h.key]: txt }))
    toast(`Hueco en ${h.titulo} cubierto: ${txt}. Se notificó a los coordinadores de zona.`)
    setModal(null)
  }

  return (
    <Shell active="ia" css={CSS}>
      <header style={sx('display:flex;flex-direction:column;gap:6px')}>
        <span className="lbl">Nuevo servicio · paso 2 de 3</span>
        <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:32px;font-weight:600")}>Asignar custodios y unidad</h1>
        <span style={sx('color:#5F6B7A;font-size:14px')}>Cotización COT-1182 aceptada por {form.cliente} y convertida en servicio sin recapturar.</span>
      </header>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <section className="card" style={sx('flex:1 1 300px;display:flex;flex-direction:column;gap:16px')}>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Servicio {SERVICIO.id}</h2>
          <label className="field">Cliente<input type="text" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} /></label>
          <label className="field">Origen<input type="text" value={form.origen} onChange={e => setForm(f => ({ ...f, origen: e.target.value }))} /></label>
          <label className="field">Destino<input type="text" value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} /></label>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <label className="field">Fecha<input type="text" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></label>
            <label className="field">Salida<input type="text" value={form.salida} onChange={e => setForm(f => ({ ...f, salida: e.target.value }))} /></label>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            <label className="field">Custodios<input type="number" min={1} max={4} value={form.custodios} onChange={e => setForm(f => ({ ...f, custodios: e.target.value }))} /></label>
            <label className="field">Unidades<input type="number" min={1} max={3} value={form.unidades} onChange={e => setForm(f => ({ ...f, unidades: e.target.value }))} /></label>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px;font-size:14px;background:#F3F5F8;border-radius:8px;padding:14px')}>
            <span className="lbl">Requisitos del cliente</span>
            <span>Portación vigente · evaluación de confianza &lt; 12 meses · experiencia en carga de alto valor</span>
            <label style={sx('display:flex;gap:8px;align-items:center;font-size:13px;color:#3E4A59;cursor:pointer')}><input type="checkbox" checked={soloCumplen} onChange={e => { setSoloCumplen(e.target.checked); setVisibles(PASO) }} style={sx('accent-color:#475CC7')} />Mostrar solo quienes cumplen todos los requisitos ({LIST.filter(c => c.cumple).length})</label>
          </div>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;font-size:14px')}>
            <span>Riesgo de la ruta</span><span className={riesgo.factor >= 1.4 ? 'pill p-bad' : riesgo.factor >= 1.2 ? 'pill p-warn' : 'pill p-ok'}>{riesgo.factor >= 1.4 ? 'Alto' : riesgo.factor >= 1.2 ? 'Medio' : 'Bajo'} · {riesgo.factor.toFixed(1)}</span>
          </div>
          <span style={sx('font-size:13px;color:#5F6B7A')}>{SERVICIO.carretera} nocturno: {riesgo.n} incidentes en el trimestre, {riesgo.nocturnos} entre 23:00 y 03:00. <Link to={ROUTES.Reaccion}>Ver incidentes</Link></span>
        </section>

        <section style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          <div className="card" style={sx('display:flex;gap:12px;align-items:flex-start;border-color:#C7D0F2')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475CC7" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none;margin-top:2px')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span style={sx('font-weight:600')}>Recomendación: {top.join(' + ')} con unidad {unidad?.id}</span>
              <span style={sx('font-size:14px;color:#3E4A59')}>Evalué {resumen.zona} custodios de {SERVICIO.zona} y {resumen.apoyo} de {SERVICIO.zonaApoyo}; {resumen.disponibles} están disponibles y {resumen.cumplen} cumplen todos los requisitos y la ventana de descanso. Este es el ranking.</span>
            </div>
          </div>

          {mostrados.map((c, i) => {
            const d = dec[c.id]
            return (
              <article key={c.id} className="card" style={sx(d === 'Asignado' ? 'border-color:#9ED9BC' : d === 'Descartado' ? 'opacity:.55' : '')}>
                <div style={sx('display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start')}>
                  <span style={sx('width:48px;height:48px;border-radius:50%;background:#E9EDFB;display:flex;align-items:center;justify-content:center;font-weight:600;color:#0D1D41;flex:none')}>{c.name.split(' ').map(s => s[0]).join('')}</span>
                  <div style={sx('flex:1 1 260px;display:flex;flex-direction:column;gap:6px;min-width:0')}>
                    <div style={sx('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
                      <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>#{i + 1}</span>
                      <Link to={ROUTES.Custodios} style={sx('font-weight:600;font-size:16px;color:inherit;text-decoration:none')} title="Abrir expediente">{c.name}</Link>
                      <span className="pill p-mute">{c.id} · {c.base}</span>
                      {!c.cumple && <span className="pill p-warn" title="No cumple todos los requisitos del cliente">Revisar requisitos</span>}
                      {d && <span className={d === 'Asignado' ? 'pill p-ok' : 'pill p-mute'}>{d}</span>}
                    </div>
                    <span style={sx('font-size:14px;color:#3E4A59;text-wrap:pretty')}>{c.why}</span>
                    <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr));gap:10px;margin-top:6px')}>
                      {c.f.map((v, j) => (
                        <div key={j} title={FACTORES[j] + ': ' + v + '/100'} style={sx('display:flex;flex-direction:column;gap:4px')}><span style={sx('font-size:12px;color:#5F6B7A')}>{FACTORES[j]}</span><div className="track"><div style={sx(bar(v))}></div></div></div>
                      ))}
                    </div>
                  </div>
                  <div style={sx('display:flex;flex-direction:column;align-items:flex-end;gap:10px')}>
                    <span style={sx("font-family:'Montserrat',sans-serif;font-size:28px;font-weight:600")} title="Promedio de los 4 factores">{c.score}</span>
                    <div style={sx('display:flex;gap:8px')}>
                      <button type="button" className="btn btn-pri" aria-pressed={d === 'Asignado'} onClick={() => set(c, 'Asignado')}>Asignar</button>
                      <button type="button" className="btn" aria-pressed={d === 'Descartado'} onClick={() => set(c, 'Descartado')}>Descartar</button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}

          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
            {visibles < lista.length && <button type="button" className="btn" onClick={() => setVisibles(v => Math.min(lista.length, v + PASO))}>Ver más candidatos ({lista.length - visibles} más)</button>}
            {visibles > PASO && <button type="button" className="btn" onClick={() => setVisibles(PASO)}>Ver menos</button>}
            <span style={sx('font-size:13px;color:#5F6B7A')}>Mostrando {mostrados.length} de {lista.length} candidatos disponibles en {SERVICIO.zona} y {SERVICIO.zonaApoyo}.</span>
          </div>

          <div className="card" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span className="lbl">Unidad sugerida</span>
              <span style={sx('font-weight:600')}>{unidad ? `${unidad.id} · ${unidad.vehiculo} · ${unidad.id === 'AU-2087' ? 'Tepotzotlán' : unidad.zona}` : 'Sin unidades disponibles'}</span>
              <span style={sx('font-size:13px;color:#5F6B7A')}>{unidad?.id === 'AU-2087' ? 'A 6 km del origen · seguro y verificación vigentes · servicio en 4,200 km' : unidad ? `${unidad.placas} · GPS ${unidad.gps} · póliza ${unidad.poliza} · ${unidad.km.toLocaleString('es-MX')} km` : ''}</span>
              <button type="button" className="btn" style={sx('align-self:flex-start;min-height:32px;padding:0 10px;font-size:13px')} onClick={() => setModal('unidad')}>Cambiar unidad ({UNIDADES.length} disponibles)</button>
            </div>
            <span style={sx('font-size:14px;color:#3E4A59')}>{summary}</span>
            <button type="button" className="btn btn-pri" onClick={confirmar}>Confirmar y pasar a monitoreo</button>
          </div>
        </section>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px;border-color:#FBE3CF')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Detección de huecos · próximas 48 h</h2>
          <Link className="btn" to={ROUTES.Custodios}>Ver calendario de turnos</Link>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px')}>
          {huecos.map(g => (
            <button key={g.key} type="button" className="gap" title="Ver detalle del hueco" onClick={() => setModal(g)} style={sx('background:#F3F5F8;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:6px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px;width:100%')}><span style={sx('font-weight:600')}>{g.titulo}</span><span className={cubiertos[g.key] ? 'pill p-ok' : g.cls}>{cubiertos[g.key] ? 'Cubierto' : (g.diff > 0 ? '+' : g.diff < 0 ? '−' : '') + Math.abs(g.diff)}</span></div>
              <span style={sx('font-size:13px;color:#3E4A59')}>{cubiertos[g.key] ? `Cubierto con ${cubiertos[g.key]}.` : g.text}</span>
            </button>
          ))}
        </div>
        <span style={sx('font-size:13px;color:#5F6B7A')}>Disponibles = custodios con estatus Disponible en la zona · Requeridos = servicios agendados para mañana por zona.</span>
      </section>

      <Modal open={modal === 'unidad'} onClose={() => setModal(null)} title="Elegir unidad de custodia" width={560} footer={<button type="button" style={sx(btnPriStyle)} onClick={() => { setModal(null); toast(`Unidad ${unidadId} seleccionada`) }}>Usar esta unidad</button>}>
        <span style={sx('font-size:14px;color:#3E4A59')}>Unidades disponibles en {SERVICIO.zona} (seed). La sugerida está primero.</span>
        {UNIDADES.map(u => (
          <label key={u.id} style={sx('display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:8px;cursor:pointer;background:' + (u.id === unidadId ? '#E9EDFB' : '#F3F5F8'))}>
            <input type="radio" name="unidad" checked={u.id === unidadId} onChange={() => setUnidadId(u.id)} style={sx('accent-color:#475CC7')} />
            <span style={sx('display:flex;flex-direction:column;gap:2px;flex:1')}><span style={sx('font-weight:600')}>{u.id} · {u.vehiculo}</span><span style={sx('font-size:13px;color:#5F6B7A')}>{u.placas} · GPS {u.gps} · póliza {u.poliza} · {u.km.toLocaleString('es-MX')} km</span></span>
          </label>
        ))}
      </Modal>

      <Modal open={modal !== null && modal !== 'unidad'} onClose={() => setModal(null)} title={modal && modal !== 'unidad' ? `Cobertura · ${modal.titulo}` : ''} width={520}
        footer={modal && modal !== 'unidad' ? (
          <>
            <Link to={ROUTES.Custodios} style={sx(btnStyle)}>Ver custodios de la zona</Link>
            {modal.diff < 0 && !cubiertos[modal.key] && <button type="button" style={sx(btnPriStyle)} onClick={() => cubrir(modal)}>Cubrir hueco</button>}
          </>
        ) : undefined}>
        {modal && modal !== 'unidad' && modal.cob && (
          <>
            <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
              <Field label="Disponibles"><span className="mono" style={sx(inputStyle + ';display:flex;align-items:center')}>{modal.cob.disponibles}</span></Field>
              <Field label="Requeridos"><span className="mono" style={sx(inputStyle + ';display:flex;align-items:center')}>{modal.cob.requeridos}</span></Field>
              <Field label="Diferencia"><span className="mono" style={sx(inputStyle + ';display:flex;align-items:center;color:' + (modal.diff < 0 ? '#B42318' : '#17784A'))}>{modal.diff > 0 ? '+' : ''}{modal.diff}</span></Field>
            </div>
            <span style={sx('font-size:14px;color:#3E4A59')}>{modal.text} En descanso: {modal.cob.descanso} · vacaciones: {modal.cob.vacaciones}.</span>
            <span className="lbl">Disponibles en {modal.zona}</span>
            <div style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
              {modal.cob.nombres.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A')}>Nadie disponible.</span>}
              {modal.cob.nombres.map(n => <span key={n} className="pill p-mute">{n}</span>)}
            </div>
          </>
        )}
      </Modal>
    </Shell>
  )
}
