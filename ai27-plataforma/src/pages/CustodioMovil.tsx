import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'
import { custodios, servicios } from '../data/seed'
import { ruta as rutaDe, tiempoTexto } from '../data/rutas'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
@media (max-width:430px){.cm-wrap{padding:0!important;align-items:flex-start!important;background:#F6F7F9!important}.cm-phone{width:100%!important;height:100vh!important;min-height:844px;border-radius:0!important;box-shadow:none!important}}
@keyframes ai27-panic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(201,48,44,.55)}50%{box-shadow:0 0 0 14px rgba(201,48,44,0)}}
@keyframes ai27-ring{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.cm-sm{min-height:36px;border-radius:10px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 13px 'IBM Plex Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;text-decoration:none}
.cm-sm.pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.cm-link{background:none;border:0;padding:0;color:#B36B00;font:500 13px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:underline}
.cm-item{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:0 4px;border-top:1px solid #EEF1F4;font-size:14px;background:none;border-left:0;border-right:0;border-bottom:0;width:100%;text-align:left;cursor:pointer;color:#121821;font-family:'IBM Plex Sans',sans-serif}
`

const HOLD_MS = 3000
const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }
const base = "min-height:72px;border-radius:12px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer"
const ACTS: [string, string][] = [['Check-in', 'check-in'], ['Parada', 'parada'], ['Evidencia', 'foto de evidencia']]

/** Custodio del diseño (C-1043 Raúl Medina) desde seed: documentos, turnos, teléfono, servicios acumulados. */
const YO = custodios.find(c => c.id === 'C-1043') ?? custodios[2]
const SERVICIO = { id: 'SRV-24803', cliente: 'Marsh', origen: 'Tultitlán', destino: 'Pachuca', trailer: 'TR-71188', unidad: 'AU-2214', monitorista: 'L. Herrera', telMonitoreo: '55 8000 2727' }
const RUTA = rutaDe('Tultitlán', 'Pachuca')
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const historialSeed = servicios.filter(s => s.custodios.includes('R. Medina')).slice(0, 4)

type Entrada = { hora: string; txt: string; tipo: 'ok' | 'warn' | 'bad' | 'info' }
type Sheet = 'menu' | 'ruta' | 'llamada' | 'historial' | 'turno' | 'docs' | null

function Hoja({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={sx('position:absolute;inset:0;background:rgba(18,24,33,.38);display:flex;align-items:flex-end;z-index:5;border-radius:inherit')}>
      <div onClick={e => e.stopPropagation()} style={sx('background:#FFFFFF;border-radius:20px 20px 0 0;padding:14px 18px 28px;width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;max-height:78%;overflow:auto;box-shadow:0 -8px 30px rgba(18,24,33,.18)')}>
        <span aria-hidden="true" style={sx('width:40px;height:4px;border-radius:2px;background:#D5DBE3;align-self:center')}></span>
        <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:8px')}><span style={sx("font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>{title}</span><button type="button" onClick={onClose} aria-label="Cerrar" style={sx('width:32px;height:32px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#3E4A59;font-size:16px;cursor:pointer')}>×</button></div>
        {children}
      </div>
    </div>
  )
}

export default function CustodioMovil() {
  const toast = useToast()
  const navigate = useNavigate()
  const [last, setLast] = useState('Último registro: check-in 13:52 en CEDIS Tultitlán')
  const [progress, setProgress] = useState(0) // 0..1 mientras se mantiene presionado
  const [alerta, setAlerta] = useState<string | null>(null) // hora de la alerta activa
  const [sheet, setSheet] = useState<Sheet>(null)
  const [turnoConfirmado, setTurnoConfirmado] = useState(false)
  const [llamando, setLlamando] = useState(0)
  const [bitacora, setBitacora] = useState<Entrada[]>([
    { hora: '13:52', txt: 'Check-in en CEDIS Tultitlán · enviado al monitorista', tipo: 'ok' },
    { hora: '13:40', txt: 'Inicio de servicio SRV-24803 · Marsh', tipo: 'info' },
    { hora: '13:05', txt: 'Evidencia: sellos del tráiler TR-71188 (2 fotos)', tipo: 'ok' },
    { hora: '12:30', txt: 'Llegada a CEDIS Tultitlán · 15 min antes de la cita', tipo: 'ok' },
  ])
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const firedRef = useRef(false) // evita que el mismo gesto que disparó la alerta la cancele

  const registrar = (txt: string, tipo: Entrada['tipo'] = 'ok') => setBitacora(b => [{ hora: now(), txt, tipo }, ...b])

  const stopHold = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
    setProgress(0)
  }
  const tick = () => {
    if (startRef.current === null) return
    const p = Math.min(1, (performance.now() - startRef.current) / HOLD_MS)
    setProgress(p)
    if (p >= 1) {
      const t = now()
      stopHold()
      firedRef.current = true
      setAlerta(t)
      setLast('ALERTA DE PÁNICO enviada a las ' + t + ' · monitoreo y equipo de reacción notificados con tu ubicación')
      registrar('ALERTA DE PÁNICO enviada · monitoreo y reacción notificados', 'bad')
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }
  const startHold = () => {
    if (alerta || startRef.current !== null) return
    startRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
  }
  const cancelAlert = () => {
    if (!alerta) return
    setAlerta(null)
    setLast('Alerta cancelada a las ' + now() + ' · el monitorista confirmará por llamada')
    registrar('Alerta cancelada · el monitorista confirmará por llamada', 'warn')
  }
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // Llamada simulada: cuenta segundos mientras la hoja está abierta
  useEffect(() => {
    if (sheet !== 'llamada') { setLlamando(0); return }
    const t = window.setInterval(() => setLlamando(s => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [sheet])
  const colgar = () => {
    const dur = llamando
    setSheet(null)
    if (dur >= 3) { registrar(`Llamada con ${SERVICIO.monitorista} (${dur} s)`, 'info'); toast(`Llamada con ${SERVICIO.monitorista} registrada en bitácora`, 'info') } else toast('Llamada cancelada', 'info')
  }

  const secs = Math.ceil(HOLD_MS / 1000 - progress * HOLD_MS / 1000)
  const panicStyle = "min-height:120px;border-radius:16px;border:0;background:#C9302C;color:#FFFFFF;font:700 22px 'Archivo',sans-serif;letter-spacing:.04em;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;position:relative;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none"
    + (alerta ? ';background:#8E1B18;animation:ai27-panic-pulse 1.2s ease-in-out infinite' : '')
  const lic = YO.documentos.find(d => d.k === 'Licencia federal')
  const docColor = (e: string) => (e === 'ok' ? '#17784A' : e === 'warn' ? '#8A5300' : '#B42318')

  return (
    <div className="cm-wrap" style={sx('min-height:100vh;background:#E4E8ED;display:flex;align-items:center;justify-content:center;padding:24px 0;box-sizing:border-box')}>
      <style>{CSS}</style>
      <div className="cm-phone" style={sx("position:relative;width:390px;height:844px;box-sizing:border-box;overflow:hidden;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#121821;background:#F6F7F9;padding:56px 18px 24px;display:flex;flex-direction:column;gap:14px;border-radius:44px;box-shadow:0 0 0 10px #121821,0 24px 60px rgba(18,24,33,.35)")}>
        <header style={sx('display:flex;justify-content:space-between;align-items:center')}>
          <div style={sx('display:flex;flex-direction:column;gap:2px')}>
            <span style={sx('font-size:13px;color:#5F6B7A')}>{YO.nombre} · {YO.id}</span>
            <span style={sx("font-family:'Archivo',sans-serif;font-size:22px;font-weight:600")}>{alerta ? 'Alerta activa' : 'En servicio'}</span>
          </div>
          <div style={sx('display:flex;align-items:center;gap:8px')}>
            <span style={sx('display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#E3F6EC;color:#17784A;font-size:12px;font-weight:500')}><span style={sx('width:8px;height:8px;border-radius:50%;background:#4CC38A')}></span>GPS activo</span>
            <button type="button" aria-label="Menú" onClick={() => setSheet('menu')} style={sx('width:34px;height:34px;border-radius:10px;border:1px solid #D5DBE3;background:#FFFFFF;cursor:pointer;display:inline-flex;align-items:center;justify-content:center')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#121821" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
          </div>
        </header>

        <section style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px')}>
          <span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A')}>{SERVICIO.id} · {SERVICIO.cliente}</span>
          <span style={sx('font-weight:600;font-size:17px')}>{SERVICIO.origen} → {SERVICIO.destino}</span>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:13px')}>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Tráiler</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>{SERVICIO.trailer}</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Unidad</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>{SERVICIO.unidad}</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Distancia al tráiler</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>120 m</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Llegada estimada</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>16:05</span></div>
          </div>
          <div style={sx('display:flex;gap:8px')}>
            <button type="button" className="cm-sm" style={sx('flex:1')} onClick={() => setSheet('ruta')}>Ver ruta</button>
            <button type="button" className="cm-sm" style={sx('flex:1')} onClick={() => setSheet('llamada')}>Llamar monitorista</button>
          </div>
        </section>

        <section aria-label="Registro" style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px')}>
          {ACTS.map(([label, what]) => (
            <button key={label} type="button" onClick={() => { const t = now(); setLast('Registrado: ' + what + ' a las ' + t + ' · enviado al monitorista'); registrar(`${label}: ${what} · enviado al monitorista`) ; toast(`${label} registrado a las ${t}`) }} style={sx(base)}>{label}</button>
          ))}
        </section>
        <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:flex-start')}>
          <span role="status" style={sx('font-size:13px;min-height:18px;' + (alerta ? 'color:#B42318;font-weight:500' : 'color:#5F6B7A'))}>{last}</span>
          <button type="button" className="cm-link" style={sx('flex:none')} onClick={() => setSheet('historial')}>Historial ({bitacora.length})</button>
        </div>

        <button
          type="button"
          style={sx(panicStyle)}
          aria-label={alerta ? 'Alerta de pánico activa. Toca para cancelar' : 'Botón de pánico. Mantén presionado 3 segundos'}
          onPointerDown={e => { if (alerta) firedRef.current = false; else { e.currentTarget.setPointerCapture?.(e.pointerId); startHold() } }}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={() => { if (startRef.current !== null) stopHold() }}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (e.repeat) return; if (alerta) { if (!firedRef.current) cancelAlert() } else startHold() } }}
          onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); firedRef.current = false; stopHold() } }}
          onClick={() => { if (firedRef.current) { firedRef.current = false; return } if (alerta) cancelAlert() }}
          onContextMenu={e => e.preventDefault()}
        >
          <span aria-hidden="true" style={sx('position:absolute;left:0;top:0;bottom:0;background:rgba(255,255,255,.22);pointer-events:none;width:' + (progress * 100).toFixed(1) + '%')}></span>
          <span style={sx('position:relative')}>{alerta ? 'ALERTA ENVIADA' : progress > 0 ? 'PÁNICO · ' + secs : 'PÁNICO'}</span>
          <span style={sx("font:400 13px 'IBM Plex Sans',sans-serif;opacity:.9;position:relative")}>
            {alerta ? 'Enviada ' + alerta + ' · toca para cancelar si fue error' : progress > 0 ? 'Sigue presionando…' : 'Mantén presionado 3 segundos'}
          </span>
        </button>

        <button type="button" onClick={() => setSheet('turno')} aria-label="Ver próximo turno" style={sx("text-align:left;background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;font-size:14px;cursor:pointer;color:#121821;font-family:'IBM Plex Sans',sans-serif")}>
          <span style={sx('display:flex;justify-content:space-between;gap:8px')}><span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A')}>Próximo turno</span>{turnoConfirmado && <span style={sx('font-size:12px;color:#17784A;font-weight:500')}>Confirmado ✓</span>}</span>
          <span>Jueves 8 oct · 06:00 · Alpura Cuautitlán</span>
          <div style={sx('display:flex;justify-content:space-between;gap:8px;border-top:1px solid #EEF1F4;padding-top:8px')}><span>Licencia federal</span><span style={sx('color:' + docColor(lic?.estado ?? 'ok'))}>{lic?.v.startsWith('vigente') ? 'vigente' : lic?.v ?? 'vigente'}</span></div>
        </button>

        {sheet === 'menu' && (
          <Hoja title="Menú" onClose={() => setSheet(null)}>
            <div style={sx('display:flex;align-items:center;gap:12px;padding-bottom:6px')}>
              <span style={sx("width:44px;height:44px;border-radius:50%;background:#FFF1DB;color:#8A5300;display:inline-flex;align-items:center;justify-content:center;font:600 15px 'Archivo',sans-serif")}>{YO.nombre.split(' ').map(x => x[0]).join('')}</span>
              <span style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('font-weight:600')}>{YO.nombre}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{YO.id} · {YO.base} · ★ {YO.calificacion} · {YO.serviciosAcumulados} servicios</span></span>
            </div>
            <button type="button" className="cm-item" onClick={() => setSheet('docs')}><span>Mis documentos</span><span style={sx('font-size:12px;color:' + (YO.documentos.every(d => d.estado === 'ok') ? '#17784A' : '#8A5300'))}>{YO.documentos.every(d => d.estado === 'ok') ? 'Al día' : 'Revisar'} ›</span></button>
            <button type="button" className="cm-item" onClick={() => setSheet('turno')}><span>Mis turnos de la semana</span><span style={sx('color:#5F6B7A')}>›</span></button>
            <button type="button" className="cm-item" onClick={() => setSheet('historial')}><span>Historial del servicio</span><span style={sx('color:#5F6B7A')}>{bitacora.length} ›</span></button>
            <button type="button" className="cm-item" onClick={() => { setSheet(null); toast(`Horas de la semana: ${YO.horasSemana} h · ${YO.horasSemana > 48 ? 'exceso de horas, avisa a tu coordinador' : 'dentro del límite'}`, YO.horasSemana > 48 ? 'warn' : 'info') }}><span>Mis horas</span><span style={sx("font-family:'IBM Plex Mono',monospace;font-size:13px")}>{YO.horasSemana} h ›</span></button>
            <button type="button" className="cm-item" onClick={() => { setSheet(null); toast('Solicitud enviada a RH: se te contactará al ' + YO.telefono, 'info') }}><span>Solicitar vacaciones</span><span style={sx('color:#5F6B7A')}>›</span></button>
            <Link to={ROUTES.Main} className="cm-item" style={sx('text-decoration:none')}><span>Ir al centro de operación</span><span style={sx('color:#5F6B7A')}>›</span></Link>
            <button type="button" className="cm-item" style={sx('color:#B42318')} onClick={() => { toast('Sesión cerrada', 'info'); navigate(ROUTES.PortalColaborador) }}><span>Cerrar sesión</span></button>
          </Hoja>
        )}
        {sheet === 'docs' && (
          <Hoja title="Mis documentos" onClose={() => setSheet(null)}>
            {YO.documentos.map(d => (
              <div key={d.k} style={sx('display:flex;justify-content:space-between;gap:8px;border-top:1px solid #EEF1F4;padding:10px 0;font-size:14px')}><span>{d.k}</span><span style={sx('color:' + docColor(d.estado) + ';font-weight:500')}>{d.v}</span></div>
            ))}
            <span style={sx('font-size:12px;color:#5F6B7A')}>Certificaciones: {YO.certificaciones.join(', ')} · Portación: {YO.portacion ? 'sí' : 'no'} · Ingreso: {YO.ingreso}</span>
            <button type="button" className="cm-sm pri" onClick={() => { setSheet(null); toast('Solicitud de renovación enviada a RH', 'info') }}>Solicitar renovación</button>
          </Hoja>
        )}
        {sheet === 'ruta' && (
          <Hoja title={`Ruta · ${SERVICIO.origen} → ${SERVICIO.destino}`} onClose={() => setSheet(null)}>
            <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;font-size:13px')}>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Distancia</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>{RUTA.km} km</span></div>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Tiempo</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>{tiempoTexto(RUTA.minutos)}</span></div>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Casetas</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>{RUTA.casetas}</span></div>
            </div>
            <svg viewBox="0 0 340 120" width="100%" height="120" role="img" aria-label="Croquis de la ruta" style={sx('display:block;background:#EEF1F4;border-radius:10px')}>
              <path d="M24 96 C 90 92, 130 70, 180 60 S 280 30, 316 22" fill="none" stroke="#2B7FA8" strokeWidth="4" strokeLinecap="round" />
              <path d="M24 96 C 60 94, 85 84, 110 76" fill="none" stroke="#2B9A66" strokeWidth="4" strokeLinecap="round" />
              <circle cx="24" cy="96" r="6" fill="#2B9A66" /><circle cx="110" cy="76" r="6" fill="#121821" /><circle cx="316" cy="22" r="6" fill="#D08A1C" />
              <text x="14" y="114" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill="#3E4A59">{SERVICIO.origen}</text>
              <text x="96" y="66" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill="#121821">Tú · 120 m</text>
              <text x="248" y="16" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill="#3E4A59">{SERVICIO.destino}</text>
              <text x="170" y="100" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#5F6B7A">{RUTA.tramo} · riesgo {RUTA.riesgo.toLowerCase()}</text>
            </svg>
            {[['Salida CEDIS Tultitlán', '13:40', 'ok'], ['Caseta Arco Norte · San Martín', '14:35', 'ok'], ['Entronque Pachuca · punto de revisión', '15:40', 'info'], ['Llegada CEDIS Pachuca', '16:05', 'info']].map(([k, h, t]) => (
              <div key={k} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:14px;border-top:1px solid #EEF1F4;padding:8px 0')}><span>{k}</span><span style={sx("font-family:'IBM Plex Mono',monospace;color:" + (t === 'ok' ? '#17784A' : '#5F6B7A'))}>{h}</span></div>
            ))}
            <div style={sx('display:flex;gap:8px')}>
              <button type="button" className="cm-sm" style={sx('flex:1')} onClick={() => { registrar('Desvío reportado en ' + RUTA.tramo + ' · monitorista avisado', 'warn'); setSheet(null); toast('Desvío reportado al monitorista', 'warn') }}>Reportar desvío</button>
              <Link to={ROUTES.Monitoreo} className="cm-sm pri" style={sx('flex:1')}>Abrir en monitoreo</Link>
            </div>
          </Hoja>
        )}
        {sheet === 'llamada' && (
          <Hoja title="Llamar al monitorista" onClose={colgar}>
            <div style={sx('display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0')}>
              <span style={sx("width:72px;height:72px;border-radius:50%;background:#E3F2F8;color:#0B6A8A;display:inline-flex;align-items:center;justify-content:center;font:600 22px 'Archivo',sans-serif;animation:ai27-ring 1.2s ease-in-out infinite")}>{SERVICIO.monitorista.split(' ').map(x => x[0]).join('')}</span>
              <span style={sx('font-weight:600;font-size:17px')}>{SERVICIO.monitorista} · Monitoreo</span>
              <span style={sx("font-family:'IBM Plex Mono',monospace;color:#5F6B7A")}>{SERVICIO.telMonitoreo} · {llamando < 3 ? 'Llamando…' : `En llamada · ${String(Math.floor(llamando / 60)).padStart(2, '0')}:${String(llamando % 60).padStart(2, '0')}`}</span>
              <span style={sx('font-size:13px;color:#5F6B7A;text-align:center')}>El monitorista ve tu ubicación y el servicio {SERVICIO.id} en pantalla.</span>
            </div>
            <div style={sx('display:flex;gap:8px')}>
              <a href={'tel:' + SERVICIO.telMonitoreo.replace(/\s/g, '')} className="cm-sm" style={sx('flex:1')} onClick={() => toast('Abriendo el marcador del teléfono', 'info')}>Usar el teléfono</a>
              <button type="button" className="cm-sm" style={sx('flex:1;background:#C9302C;border-color:#C9302C;color:#FFFFFF')} onClick={colgar}>Colgar</button>
            </div>
          </Hoja>
        )}
        {sheet === 'historial' && (
          <Hoja title="Historial" onClose={() => setSheet(null)}>
            <span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A')}>Bitácora de hoy · {SERVICIO.id}</span>
            {bitacora.map((e, i) => (
              <div key={i} style={sx('display:flex;gap:10px;font-size:14px;border-top:1px solid #EEF1F4;padding:8px 0')}><span style={sx("font-family:'IBM Plex Mono',monospace;color:" + (e.tipo === 'bad' ? '#B42318' : e.tipo === 'warn' ? '#8A5300' : '#5F6B7A') + ';flex:none')}>{e.hora}</span><span>{e.txt}</span></div>
            ))}
            <span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;margin-top:6px')}>Servicios recientes</span>
            {historialSeed.length === 0 && <span style={sx('font-size:13px;color:#5F6B7A')}>Sin servicios previos en el trimestre</span>}
            {historialSeed.map(s => (
              <div key={s.id} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:13px;border-top:1px solid #EEF1F4;padding:8px 0')}><span><span style={sx("font-family:'IBM Plex Mono',monospace;color:#3E4A59")}>{s.id}</span> · {s.cliente} · {s.ruta}</span><span style={sx('color:#5F6B7A;flex:none')}>{s.inicio.slice(5, 10)}</span></div>
            ))}
            <button type="button" className="cm-sm" onClick={() => { setSheet(null); toast('Bitácora enviada a tu correo y al monitorista', 'info') }}>Enviar bitácora</button>
          </Hoja>
        )}
        {sheet === 'turno' && (
          <Hoja title="Próximo turno" onClose={() => setSheet(null)}>
            <span style={sx('font-weight:600;font-size:16px')}>Jueves 8 oct · 06:00 · Alpura Cuautitlán</span>
            <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:13px')}>
              <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Servicio</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>SRV-24817</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Ruta</span><span>Cuautitlán → Guadalajara</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Compañero</span><span>E. Villa · C-1188</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Unidad</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>AU-3321 · NTR-482-B</span></div>
            </div>
            <span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;margin-top:4px')}>Mi semana · {YO.horasSemana} h</span>
            <div style={sx('display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px')}>
              {YO.turnos.split('').map((t, i) => (
                <div key={i} style={sx('display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;color:#5F6B7A')}><span>{DIAS[i]}</span><span title={t === 's' ? 'Servicio' : t === 'd' ? 'Descanso' : 'Libre'} style={sx('width:100%;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-weight:600;' + (t === 's' ? 'background:#FFF1DB;color:#8A5300' : t === 'd' ? 'background:#E3F2F8;color:#0B6A8A' : 'background:#EEF1F4;color:#4A5868'))}>{t === 's' ? 'S' : t === 'd' ? 'D' : 'L'}</span></div>
              ))}
            </div>
            <div style={sx('display:flex;gap:8px')}>
              <button type="button" className="cm-sm" style={sx('flex:1')} onClick={() => { setSheet(null); toast('Solicitud de cambio enviada a tu coordinador', 'info') }}>Pedir cambio</button>
              <button type="button" className="cm-sm pri" style={sx('flex:1')} disabled={turnoConfirmado} onClick={() => { setTurnoConfirmado(true); setSheet(null); toast('Turno del jueves 8 oct confirmado') }}>{turnoConfirmado ? 'Turno confirmado' : 'Confirmar turno'}</button>
            </div>
          </Hoja>
        )}
      </div>
    </div>
  )
}
