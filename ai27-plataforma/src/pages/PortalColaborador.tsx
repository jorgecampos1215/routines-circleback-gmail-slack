import { Logo } from '../components/Logo'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { useStore, actions } from '../lib/store'
import { useToast } from '../components/ui'
import { YO, recibos, money, descargarReciboPDF, descargarReciboXML, descargarConstancia } from '../data/portal'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;padding:22px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF3DC;color:#9A5B00}.p-bad{background:#FDE8E8;color:#B42318}.p-mute{background:#EEF1F4;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#0D1D41;font:500 14px 'Montserrat',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#475CC7;border-color:#475CC7;color:#FFFFFF}
.field{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#3E4A59}
.field select,.field input,.field textarea{min-height:44px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#0D1D41;padding:0 12px;font:400 15px 'Montserrat',sans-serif;box-sizing:border-box}
.field textarea{padding:10px 12px;resize:vertical}
`

const T: [string, string][] = [['home', 'Inicio'], ['vac', 'Vacaciones y permisos'], ['pay', 'Recibos'], ['docs', 'Documentos']]
const TYPES = ['Vacaciones', 'Permiso con goce', 'Permiso sin goce', 'Incapacidad']
const BASE = [
  { id: 'b1', t: 'Vacaciones', d: '18–19 ago 2026', n: '2 días', s: 'Aprobada', cls: 'pill p-ok' },
  { id: 'b2', t: 'Permiso con goce', d: '2 sep 2026 · cita médica', n: '1 día', s: 'Aprobada', cls: 'pill p-ok' },
  { id: 'b3', t: 'Vacaciones', d: '6–7 jul 2026', n: '2 días', s: 'Aprobada', cls: 'pill p-ok' },
]
const DOCS0 = [['Contrato individual de trabajo', 'Vigente', 'pill p-ok'], ['INE', 'Vigente', 'pill p-ok'], ['Comprobante de domicilio', 'Vence en 2 meses', 'pill p-warn'], ['Constancia de situación fiscal', 'Vigente', 'pill p-ok'], ['Certificado de capacitación en monitoreo', 'Vigente', 'pill p-ok']].map(([n, s, cls]) => ({ n, s, cls }))
const TRAMITES = ['Constancia laboral', 'Constancia de percepciones', 'Carta de recomendación', 'Cambio de datos bancarios']
const AVISOS: [string, string][] = [['Capacitación de protocolo de reacción', 'Jueves 16 oct · 10:00 · sala de monitoreo'], ['Actualiza tu contacto de emergencia', 'Antes del 31 de octubre']]
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
/** Días hábiles lunes a sábado (semana operativa de 6 días). */
function diasHabiles(desde: string, hasta: string) {
  if (!desde || !hasta) return 0
  const a = parse(desde), b = parse(hasta)
  let n = 0
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++
  return n
}
function rango(desde: string, hasta: string) {
  const a = parse(desde), b = parse(hasta)
  const y = b.getFullYear()
  if (desde === hasta) return `${a.getDate()} ${MES[a.getMonth()]} ${y}`
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MES[a.getMonth()]} ${y}` : `${a.getDate()} ${MES[a.getMonth()]}–${b.getDate()} ${MES[b.getMonth()]} ${y}`
}
const cls = (s: string) => (s === 'Aprobada' ? 'pill p-ok' : s === 'Rechazada' ? 'pill p-bad' : 'pill p-warn')

export default function PortalColaborador() {
  const toast = useToast()
  const [tab, setTab] = useState('home')
  const [docs, setDocs] = useState(DOCS0)
  const [adjunto, setAdjunto] = useState('')
  const [tramite, setTramite] = useState(TRAMITES[0])
  const [paraQue, setParaQue] = useState('')
  const [avisosOk, setAvisosOk] = useState<Record<number, boolean>>({})
  const incRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const tramitesTodos = useStore(s => s.tramites) ?? []
  const tramites = tramitesTodos.filter(x => x.colaborador === YO.nombre)
  const [type, setType] = useState('Vacaciones')
  const [sent, setSent] = useState(false)
  const [desde, setDesde] = useState('2026-10-27')
  const [hasta, setHasta] = useState('2026-10-31')
  const [cubre, setCubre] = useState('Sofía Campos · Monitorista')
  const [coment, setComent] = useState('')
  const todas = useStore(s => s.vacaciones)
  const mias = todas.filter(v => v.colaborador === YO.nombre)

  const dias = diasHabiles(desde, hasta)
  const valido = dias > 0 && desde <= hasta
  // Días de vacaciones usados: los aprobados del historial base (2 + 2) más los aprobados en el demo
  const used = BASE.filter(b => b.t === 'Vacaciones' && b.s === 'Aprobada').reduce((a, b) => a + parseInt(b.n), 0) + mias.filter(v => v.estatus === 'Aprobada' && (v.motivo || 'Vacaciones').startsWith('Vacaciones')).reduce((a, v) => a + v.dias, 0)
  const left = Math.max(0, 14 - used)
  const pending = mias.filter(v => v.estatus === 'Pendiente').length
  const reqs = [
    ...mias.map(v => ({ id: v.id, t: (v.motivo || 'Vacaciones').split(' · ')[0], d: rango(v.desde, v.hasta), n: v.dias + (v.dias === 1 ? ' día' : ' días'), s: v.estatus, cls: cls(v.estatus) })),
    ...BASE,
  ]

  const submit = () => {
    if (!valido) return
    const quien = cubre === 'Lo asigna mi jefe' ? 'Cubre: lo asigna el jefe' : 'Cubre: ' + cubre.split(' · ')[0]
    if (type === 'Incapacidad' && !adjunto) { toast('Adjunta tu incapacidad del IMSS para enviar la solicitud', 'warn'); return }
    const id = actions.solicitarVacaciones({ colaborador: YO.nombre, area: YO.area, desde, hasta, dias, motivo: [type, quien, coment.trim(), adjunto && 'Adjunto: ' + adjunto].filter(Boolean).join(' · ') })
    setSent(true)
    setComent('')
    setAdjunto('')
    toast(`Solicitud ${id} enviada a ${YO.jefe} · ${type} · ${dias} ${dias === 1 ? 'día' : 'días'}`)
  }
  const enviarTramite = () => {
    const id = actions.solicitarTramite({ colaborador: YO.nombre, area: YO.area, tramite, motivo: paraQue.trim() })
    toast(`Trámite ${id} enviado a RH: ${tramite}. Respuesta en 1 día hábil.`)
    setParaQue('')
  }
  const subirDoc = (f: File) => {
    const n = f.name.replace(/\.[^.]+$/, '')
    setDocs(d => [...d, { n, s: 'En revisión', cls: 'pill p-warn' }])
    toast(`Documento "${f.name}" subido · RH lo revisará`)
  }

  const tabStyle = (on: boolean) => "min-height:40px;padding:0 14px;border-radius:8px;border:0;cursor:pointer;font:500 14px 'Montserrat',sans-serif;" + (on ? 'background:#E9EDFB;color:#0D1D41' : 'background:transparent;color:#3E4A59')

  return (
    <div style={sx("font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;background:#F6F7F9;min-height:100vh")}>
      <style>{CSS}</style>
      <header style={sx('background:#FFFFFF;border-bottom:1px solid #E4E8ED')}>
        <div style={sx('max-width:1120px;margin:0 auto;padding:14px 24px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between')}>
          <div style={sx('display:flex;align-items:center;gap:10px')}>
            <Logo height={24} />
            <span style={sx("font-family:'Montserrat',sans-serif;font-weight:700;font-size:19px")}>AI27</span>
            <span style={sx('font-size:14px;color:#5F6B7A;padding-left:10px;border-left:1px solid #E4E8ED')}>Mi portal</span>
          </div>
          <nav aria-label="Secciones del portal" style={sx('display:flex;gap:4px;flex-wrap:wrap')}>
            {T.map(([k, label]) => (
              <button key={k} type="button" aria-current={k === tab ? 'page' : undefined} onClick={() => setTab(k)} style={sx(tabStyle(k === tab))}>{label}</button>
            ))}
          </nav>
          <div style={sx('display:flex;align-items:center;gap:10px')}>
            <span style={sx('width:38px;height:38px;border-radius:50%;background:#6A5ACD;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px')}>LH</span>
            <span style={sx('display:flex;flex-direction:column;font-size:13px;line-height:1.3')}><span style={sx('font-weight:500')}>Luis Herrera</span><span style={sx('color:#5F6B7A')}>Monitorista Sr</span></span>
          </div>
        </div>
      </header>

      <main style={sx('max-width:1120px;margin:0 auto;padding:28px 24px 56px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px')}>
        {tab === 'home' && (
          <div style={sx('display:flex;flex-direction:column;gap:22px')}>
            <div style={sx('display:flex;flex-direction:column;gap:6px')}>
              <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:30px;font-weight:600")}>Hola, Luis</h1>
              <span style={sx('color:#5F6B7A;font-size:15px')}>Aquí puedes pedir vacaciones y permisos, descargar tus recibos y consultar tus documentos.</span>
            </div>
            <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px')}>
              <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
                <span className="lbl">Vacaciones disponibles</span>
                <span style={sx("font-family:'Montserrat',sans-serif;font-size:34px;font-weight:600")}>{left} días</span>
                <div style={sx('height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;background:#475CC7;width:' + Math.round(used / 14 * 100) + '%')}></div></div>
                <span style={sx('font-size:13px;color:#5F6B7A')}>{used} usados de 14 · periodo 2026</span>
              </div>
              <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Próximo pago</span><span style={sx("font-family:'Montserrat',sans-serif;font-size:34px;font-weight:600")}>15 oct</span><span style={sx('font-size:13px;color:#5F6B7A')}>Quincena 19 · depósito en nómina</span></div>
              <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Mis solicitudes</span><span style={sx("font-family:'Montserrat',sans-serif;font-size:34px;font-weight:600")}>{pending}</span><span style={sx('font-size:13px;color:#5F6B7A')}>pendientes de aprobación</span></div>
              <div className="card" style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Mi turno</span><span style={sx("font-family:'Montserrat',sans-serif;font-size:22px;font-weight:600")}>Vespertino</span><span style={sx('font-size:13px;color:#5F6B7A')}>14:00 a 22:00 · descanso miércoles</span></div>
            </section>
            <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:16px')}>
              <div className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
                <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>¿Qué necesitas?</h2>
                <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px')}>
                  <button type="button" className="btn" onClick={() => { setType('Vacaciones'); setSent(false); setTab('vac') }}>Pedir vacaciones</button>
                  <button type="button" className="btn" onClick={() => { setType('Permiso con goce'); setSent(false); setTab('vac') }}>Pedir un permiso</button>
                  <button type="button" className="btn" onClick={() => setTab('pay')}>Descargar recibo</button>
                  <button type="button" className="btn" onClick={() => setTab('docs')}>Constancia laboral</button>
                </div>
              </div>
              <div className="card" style={sx('display:flex;flex-direction:column;gap:10px')}>
                <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:18px;font-weight:600")}>Avisos de RH</h2>
                {AVISOS.map(([t, d], i) => (
                  <button key={t} type="button" aria-pressed={!!avisosOk[i]} onClick={() => { setAvisosOk(a => ({ ...a, [i]: !a[i] })); toast(avisosOk[i] ? 'Aviso marcado como pendiente' : i === 0 ? 'Asistencia confirmada · recordatorio agregado a tu calendario' : 'Aviso marcado como atendido') }}
                    style={sx('padding:10px 0;border:0;border-top:1px solid #EEF1F4;font-size:14px;display:flex;flex-direction:column;gap:2px;background:none;cursor:pointer;font-family:inherit;color:inherit;text-align:left')}>
                    <span style={sx('font-weight:500' + (avisosOk[i] ? ';text-decoration:line-through;color:#5F6B7A' : ''))}>{t}</span><span style={sx('color:#5F6B7A')}>{d}{avisosOk[i] ? ' · atendido' : ''}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'vac' && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
            <section className="card" style={sx('flex:1 1 380px;display:flex;flex-direction:column;gap:16px')}>
              <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600")}>Nueva solicitud</h1>
              <div role="group" aria-label="Tipo de solicitud" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                {TYPES.map(t => (
                  <button key={t} type="button" aria-pressed={t === type} className="btn" style={sx(t === type ? 'background:#E9EDFB;border-color:#475CC7;color:#0D1D41' : '')} onClick={() => { setType(t); setSent(false) }}>{t}</button>
                ))}
              </div>
              <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
                <label className="field">Desde<input type="date" value={desde} onChange={e => { setDesde(e.target.value); setSent(false) }} /></label>
                <label className="field">Hasta<input type="date" value={hasta} min={desde} onChange={e => { setHasta(e.target.value); setSent(false) }} /></label>
              </div>
              <div style={sx('display:flex;justify-content:space-between;align-items:center;background:#F7F9FB;border-radius:8px;padding:12px 14px;font-size:14px')}><span>Días hábiles</span><span className="mono" style={sx('font-size:18px')}>{dias}</span></div>
              <label className="field">¿Quién te cubre?<select value={cubre} onChange={e => setCubre(e.target.value)}><option>Sofía Campos · Monitorista</option><option>Pedro Ruiz · Monitorista</option><option>Lo asigna mi jefe</option></select></label>
              <label className="field">Comentario (opcional)<textarea rows={3} placeholder="Ej. viaje familiar" value={coment} onChange={e => setComent(e.target.value)}></textarea></label>
              {type === 'Incapacidad' && (
                <>
                  <input ref={incRef} type="file" accept="application/pdf,image/*" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) { setAdjunto(f.name); toast(`Incapacidad adjuntada: ${f.name}`) }; e.target.value = '' }} />
                  <button type="button" onClick={() => incRef.current?.click()} style={sx('border:1px dashed #C3CBD5;border-radius:8px;padding:16px;text-align:center;font-size:14px;color:#3E4A59;background:#FFFFFF;cursor:pointer;font-family:inherit')}>{adjunto ? `Adjunto: ${adjunto} · cambiar` : 'Adjunta tu incapacidad del IMSS (PDF o foto)'}</button>
                </>
              )}
              <span style={sx('font-size:13px;color:#5F6B7A')}>Tu solicitud llega a Jorge Pérez (jefe directo) y después a RH. Te avisamos por correo y WhatsApp.</span>
              <button type="button" className="btn btn-pri" onClick={submit} disabled={!valido} style={sx(valido ? '' : 'opacity:.5;cursor:not-allowed')}>Enviar solicitud</button>
              {sent && <span className="pill p-ok" style={sx('align-self:flex-start')}>Solicitud enviada · pendiente de aprobación</span>}
            </section>
            <section className="card" style={sx('flex:999 1 460px;display:flex;flex-direction:column;gap:14px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
                <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:20px;font-weight:600")}>Mis solicitudes</h2>
                <span style={sx('font-size:14px;color:#3E4A59')}>{left} días disponibles</span>
              </div>
              {reqs.map(r => (
                <div key={r.id} style={sx('display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
                  <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:200px')}><span style={sx('font-weight:500')}>{r.t}</span><span style={sx('color:#5F6B7A;font-size:13px')}>{r.d}</span></span>
                  <span style={sx('color:#3E4A59;min-width:120px')}>{r.n}</span>
                  <span className={r.cls}>{r.s}</span>
                </div>
              ))}
              <div style={sx('display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEF1F4;padding-top:14px')}>
                <span className="lbl">Días festivos y descansos próximos</span>
                <span style={sx('font-size:14px;color:#3E4A59')}>2 nov · Día de Muertos (turno con prima) · 16 nov · Revolución mexicana · 25 dic · Navidad</span>
              </div>
            </section>
          </div>
        )}

        {tab === 'pay' && (
          <section className="card" style={sx('display:flex;flex-direction:column;gap:14px;padding:22px 10px 4px')}>
            <h1 style={sx("margin:0;padding:0 12px;font-family:'Montserrat',sans-serif;font-size:24px;font-weight:600")}>Mis recibos de nómina</h1>
            <div style={sx('overflow-x:auto')}>
              <table className="tbl">
                <thead><tr><th>Periodo</th><th>Fecha de pago</th><th style={sx('text-align:right')}>Percepciones</th><th style={sx('text-align:right')}>Deducciones</th><th style={sx('text-align:right')}>Neto</th><th>Descargar</th></tr></thead>
                <tbody>
                  {recibos.map(p => (
                    <tr key={p.periodo}><td>{p.periodo}</td><td className="mono">{p.pago}</td><td className="mono" style={sx('text-align:right')}>{money(p.percepciones)}</td><td className="mono" style={sx('text-align:right')}>{money(p.deducciones)}</td><td className="mono" style={sx('text-align:right;font-weight:500')}>{money(p.neto)}</td>
                      <td><span style={sx('display:flex;gap:8px')}><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { descargarReciboPDF(p); toast(`Recibo PDF descargado · ${p.periodo}`) }}>PDF</button><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { descargarReciboXML(p); toast(`CFDI XML descargado · ${p.periodo}`) }}>XML</button></span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'docs' && (
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:16px')}>
            <section className="card" style={sx('display:flex;flex-direction:column;gap:10px')}>
              <h1 style={sx("margin:0 0 4px;font-family:'Montserrat',sans-serif;font-size:22px;font-weight:600")}>Mis documentos</h1>
              {docs.map(d => (
                <button key={d.n} type="button" title="Descargar" onClick={() => { descargarConstancia(d.n, ''); toast(`Descargando ${d.n} (PDF)`, 'info') }} style={sx('display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border:0;border-top:1px solid #EEF1F4;font-size:14px;background:none;cursor:pointer;font-family:inherit;color:inherit;text-align:left')}><span>{d.n}</span><span className={d.cls}>{d.s}</span></button>
              ))}
              <input ref={docRef} type="file" accept="application/pdf,image/*" style={sx('display:none')} onChange={e => { const f = e.target.files?.[0]; if (f) subirDoc(f); e.target.value = '' }} />
              <button type="button" className="btn" style={sx('align-self:flex-start')} onClick={() => docRef.current?.click()}>Subir documento</button>
            </section>
            <section className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
              <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:20px;font-weight:600")}>Solicitar a RH</h2>
              <label className="field">Trámite<select value={tramite} onChange={e => setTramite(e.target.value)}>{TRAMITES.map(x => <option key={x}>{x}</option>)}</select></label>
              <label className="field">Para qué la necesitas<input type="text" placeholder="Ej. trámite de crédito Infonavit" value={paraQue} onChange={e => setParaQue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviarTramite() }} /></label>
              <button type="button" className="btn btn-pri" style={sx('align-self:flex-start')} onClick={enviarTramite}>Enviar a RH</button>
              <span style={sx('font-size:13px;color:#5F6B7A')}>Tiempo de respuesta habitual: 1 día hábil.</span>
              {tramites.length > 0 && (
                <div style={sx('display:flex;flex-direction:column;gap:4px;border-top:1px solid #EEF1F4;padding-top:12px')}>
                  <span className="lbl">Mis trámites</span>
                  {tramites.map(t => (
                    <div key={t.id} style={sx('display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px;flex-wrap:wrap')}>
                      <span style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('font-weight:500')}>{t.tramite}</span><span style={sx('color:#5F6B7A;font-size:13px')}>{t.id} · {t.motivo || 'sin comentario'}</span></span>
                      <span style={sx('display:flex;gap:8px;align-items:center')}>
                        <span className={cls(t.estatus === 'Entregado' ? 'Aprobada' : t.estatus === 'Rechazado' ? 'Rechazada' : 'Pendiente')}>{t.estatus}</span>
                        {t.estatus === 'Entregado' && t.tramite.startsWith('Constancia') && <button type="button" className="btn" style={sx('min-height:34px;padding:0 12px')} onClick={() => { descargarConstancia(t.tramite, t.motivo); toast(`${t.tramite} descargada (PDF)`) }}>Descargar</button>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <Link to={ROUTES.RH} style={sx('font-size:14px;align-self:center')}>Volver a la vista de RH (demo)</Link>
      </main>
    </div>
  )
}
