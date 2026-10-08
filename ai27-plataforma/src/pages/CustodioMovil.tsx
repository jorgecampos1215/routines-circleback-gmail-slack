import { useEffect, useRef, useState } from 'react'
import { sx } from '../lib/sx'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
@media (max-width:430px){.cm-wrap{padding:0!important;align-items:flex-start!important;background:#F6F7F9!important}.cm-phone{width:100%!important;height:100vh!important;min-height:844px;border-radius:0!important;box-shadow:none!important}}
@keyframes ai27-panic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(201,48,44,.55)}50%{box-shadow:0 0 0 14px rgba(201,48,44,0)}}
`

const HOLD_MS = 3000
const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }
const base = "min-height:72px;border-radius:12px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer"
const ACTS: [string, string][] = [['Check-in', 'check-in'], ['Parada', 'parada'], ['Evidencia', 'foto de evidencia']]

export default function CustodioMovil() {
  const [last, setLast] = useState('Último registro: check-in 13:52 en CEDIS Tultitlán')
  const [progress, setProgress] = useState(0) // 0..1 mientras se mantiene presionado
  const [alerta, setAlerta] = useState<string | null>(null) // hora de la alerta activa
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const firedRef = useRef(false) // evita que el mismo gesto que disparó la alerta la cancele

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
  }
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const secs = Math.ceil(HOLD_MS / 1000 - progress * HOLD_MS / 1000)
  const panicStyle = "min-height:120px;border-radius:16px;border:0;background:#C9302C;color:#FFFFFF;font:700 22px 'Archivo',sans-serif;letter-spacing:.04em;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;position:relative;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none"
    + (alerta ? ';background:#8E1B18;animation:ai27-panic-pulse 1.2s ease-in-out infinite' : '')

  return (
    <div className="cm-wrap" style={sx('min-height:100vh;background:#E4E8ED;display:flex;align-items:center;justify-content:center;padding:24px 0;box-sizing:border-box')}>
      <style>{CSS}</style>
      <div className="cm-phone" style={sx("width:390px;height:844px;box-sizing:border-box;overflow:hidden;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#121821;background:#F6F7F9;padding:56px 18px 24px;display:flex;flex-direction:column;gap:16px;border-radius:44px;box-shadow:0 0 0 10px #121821,0 24px 60px rgba(18,24,33,.35)")}>
        <header style={sx('display:flex;justify-content:space-between;align-items:center')}>
          <div style={sx('display:flex;flex-direction:column;gap:2px')}>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Raúl Medina · C-1043</span>
            <span style={sx("font-family:'Archivo',sans-serif;font-size:22px;font-weight:600")}>{alerta ? 'Alerta activa' : 'En servicio'}</span>
          </div>
          <span style={sx('display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#E3F6EC;color:#17784A;font-size:12px;font-weight:500')}><span style={sx('width:8px;height:8px;border-radius:50%;background:#4CC38A')}></span>GPS activo</span>
        </header>

        <section style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px')}>
          <span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A')}>SRV-24803 · Marsh</span>
          <span style={sx('font-weight:600;font-size:17px')}>Tultitlán → Pachuca</span>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:13px')}>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Tráiler</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>TR-71188</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Unidad</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>AU-2214</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Distancia al tráiler</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>120 m</span></div>
            <div style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('color:#5F6B7A')}>Llegada estimada</span><span style={sx("font-family:'IBM Plex Mono',monospace")}>16:05</span></div>
          </div>
        </section>

        <section aria-label="Registro" style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px')}>
          {ACTS.map(([label, what]) => (
            <button key={label} type="button" onClick={() => setLast('Registrado: ' + what + ' a las ' + now() + ' · enviado al monitorista')} style={sx(base)}>{label}</button>
          ))}
        </section>
        <span role="status" style={sx('font-size:13px;min-height:18px;' + (alerta ? 'color:#B42318;font-weight:500' : 'color:#5F6B7A'))}>{last}</span>

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

        <section style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;font-size:14px')}>
          <span style={sx('font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A')}>Próximo turno</span>
          <span>Jueves 8 oct · 06:00 · Alpura Cuautitlán</span>
          <div style={sx('display:flex;justify-content:space-between;gap:8px;border-top:1px solid #EEF1F4;padding-top:8px')}><span>Licencia federal</span><span style={sx('color:#17784A')}>vigente</span></div>
        </section>
      </div>
    </div>
  )
}
