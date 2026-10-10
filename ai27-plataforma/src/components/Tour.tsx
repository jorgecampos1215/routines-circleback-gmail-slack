import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sx } from '../lib/sx'
import { Logo } from './Logo'

/**
 * Recorrido guiado: explica la plataforma paso a paso, navegando entre pantallas y resaltando
 * el elemento clave de cada una (los elementos se marcan con data-tour="…").
 * Se ofrece la primera vez que alguien abre la plataforma y se puede relanzar desde el menú
 * ("Recorrido guiado") o con iniciarTour().
 */
export type PasoTour = { ruta: string; target?: string; titulo: string; texto: string; tip?: string }

export const PASOS_TOUR: PasoTour[] = [
  { ruta: '/', target: 'acciones', titulo: 'Así funciona AI27', texto: 'La plataforma sigue el ciclo de un servicio de custodia en cuatro pasos: cotizar, asignar custodios y unidades, monitorear en vivo y atender incidentes. Desde Inicio entras al paso que te toca.' },
  { ruta: '/', target: 'kpis', titulo: 'Cómo va la operación', texto: 'Estos indicadores resumen el día: servicios activos, custodios ocupados, entregas sin incidente, unidades operando e ingresos. Cada uno dice en una línea qué significa y te lleva a su módulo.' },
  { ruta: '/cotizador', target: 'precio', titulo: 'Paso 1 · Cotizar', texto: 'Eliges cliente, tipo de servicio y ruta; la plataforma calcula distancia, casetas y riesgo (del historial de incidentes) y te da el precio con el margen objetivo. Al aceptar, la cotización se vuelve servicio sin volver a capturar.' },
  { ruta: '/asignacion', target: 'ranking', titulo: 'Paso 2 · Asignar custodios y unidad', texto: 'La IA ordena a los custodios disponibles por cercanía, descanso, experiencia y desempeño, y sugiere la unidad. Tú decides con Asignar o Descartar; cada decisión queda registrada.' },
  { ruta: '/monitoreo', target: 'mapa', titulo: 'Paso 3 · Mapa en vivo', texto: 'Tráileres, custodios y autos de AI27 en un solo mapa, con los eventos de Samsara y Ruptela normalizados. Las alertas (desvío, separación, sin señal) aparecen aquí y se escalan a Incidentes con un clic.' },
  { ruta: '/reaccion', target: 'stepper', titulo: 'Paso 4 · Atender incidente', texto: 'Cada incidente se sigue en seis etapas, con bitácora minuto a minuto, tiempos de respuesta y resultado. Al cerrar, se genera el reporte para el cliente.' },
  { ruta: '/custodios', target: 'estatus', titulo: 'Custodios', texto: 'Los 400 custodios con su estatus en tiempo real. Al abrir uno ves su expediente, documentos y vigencias, su agenda por día y hora, y todo su historial de asignaciones.' },
  { ruta: '/flotilla', target: 'unidades', titulo: 'Flotilla', texto: 'Las 600 unidades: a qué cliente y custodios están asignadas, su consumo de gasolina diario, órdenes de taller y vencimientos. Desde la ficha de cada unidad la mandas a taller o registras una carga.' },
  { ruta: '/clientes', target: 'cliente', titulo: 'Clientes', texto: 'Cada cliente con sus contactos, contratos, servicios, custodios y unidades asignadas, incidentes y rentabilidad. Las oportunidades de venta van aparte, en Oportunidades.' },
  { ruta: '/personas', target: 'equipo', titulo: 'Equipo', texto: 'Toda la empresa: directorio, vacaciones y permisos, ingresos y bajas, reclutamiento. Cada colaborador tiene su portal de autoservicio.' },
  { ruta: '/asistente', target: 'preguntas', titulo: 'Pregúntale a la operación', texto: 'Escribe la pregunta en tus palabras ("¿qué cliente nos dejó más margen?") y el asistente responde con cifras, gráficas o tablas, respetando los permisos de tu rol.', tip: 'Puedes volver a ver este recorrido desde el menú, abajo a la izquierda.' },
]

const KEY = 'ai27-tour-v1'
type Estado = { activo: boolean; paso: number; ofrecer: boolean }
let estado: Estado = { activo: false, paso: 0, ofrecer: false }
const subs = new Set<() => void>()
const setEstado = (e: Partial<Estado>) => { estado = { ...estado, ...e }; subs.forEach(f => f()) }
export const iniciarTour = (paso = 0) => setEstado({ activo: true, paso, ofrecer: false })
const useTour = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => estado)

try { if (!localStorage.getItem(KEY)) estado = { ...estado, ofrecer: true } } catch { /* sin storage */ }
const marcarVisto = () => { try { localStorage.setItem(KEY, 'visto') } catch { /* ignorar */ } }

export function Tour() {
  const { activo, paso, ofrecer } = useTour()
  const nav = useNavigate()
  const loc = useLocation()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const p = PASOS_TOUR[paso]

  // Navegar a la pantalla del paso
  useEffect(() => { if (activo && p && loc.pathname !== p.ruta) nav(p.ruta) }, [activo, paso]) // eslint-disable-line react-hooks/exhaustive-deps

  // Localizar y resaltar el elemento del paso (reintenta mientras carga la pantalla)
  useLayoutEffect(() => {
    if (!activo || !p) { setRect(null); return }
    let intentos = 0; let timer: number
    const buscar = () => {
      const el = p.target ? document.querySelector<HTMLElement>(`[data-tour="${p.target}"]`) : null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: intentos === 0 ? 'auto' : 'smooth' })
        window.setTimeout(() => setRect(el.getBoundingClientRect()), 350)
      } else if (intentos++ < 20) timer = window.setTimeout(buscar, 150)
      else setRect(null)
    }
    buscar()
    const onResize = () => { const el = p.target ? document.querySelector<HTMLElement>(`[data-tour="${p.target}"]`) : null; if (el) setRect(el.getBoundingClientRect()) }
    window.addEventListener('resize', onResize); window.addEventListener('scroll', onResize, true)
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true) }
  }, [activo, paso, loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activo) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') salir(); if (e.key === 'ArrowRight') siguiente(); if (e.key === 'ArrowLeft') anterior() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [activo, paso]) // eslint-disable-line react-hooks/exhaustive-deps

  const salir = () => { marcarVisto(); setEstado({ activo: false, ofrecer: false }) }
  const siguiente = () => { if (paso >= PASOS_TOUR.length - 1) { salir(); nav('/'); return } setEstado({ paso: paso + 1 }) }
  const anterior = () => setEstado({ paso: Math.max(0, paso - 1) })

  if (ofrecer && !activo && loc.pathname === '/') {
    return (
      <div style={sx('position:fixed;inset:0;background:rgba(13,29,65,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:950')}>
        <div role="dialog" aria-modal="true" aria-label="Recorrido guiado" style={sx("background:#FFFFFF;border-radius:14px;width:min(520px,100%);padding:28px;display:flex;flex-direction:column;gap:14px;font-family:'Montserrat',sans-serif;color:#0D1D41;box-shadow:0 24px 70px rgba(13,29,65,.3)")}>
          <Logo height={30} />
          <h2 style={sx('margin:6px 0 0;font-size:22px;font-weight:700')}>Bienvenido a la plataforma de operación de custodia</h2>
          <p style={sx('margin:0;color:#3E4A59;font-size:15px;line-height:1.55')}>¿Quieres un recorrido guiado de 2 minutos? Te llevamos pantalla por pantalla por el ciclo de un servicio: cotizar, asignar custodios, monitorear y atender incidentes, más custodios, flotilla y clientes.</p>
          <div style={sx('display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px')}>
            <button type="button" className="btn" onClick={salir}>Ahora no</button>
            <button type="button" className="btn btn-pri" onClick={() => iniciarTour(0)}>Empezar recorrido</button>
          </div>
        </div>
      </div>
    )
  }
  if (!activo || !p) return null

  const PAD = 10
  const r = rect ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null
  // Tarjeta: debajo del elemento si cabe; si no, arriba; sin elemento, abajo a la derecha.
  const vh = window.innerHeight, vw = window.innerWidth
  const cardW = Math.min(420, vw - 32)
  let cardStyle = `position:fixed;right:20px;bottom:20px;width:${cardW}px`
  if (r) {
    const abajo = r.y + r.h + 16 + 220 < vh
    const top = abajo ? r.y + r.h + 16 : Math.max(16, r.y - 16 - 230)
    const left = Math.min(Math.max(16, r.x), vw - cardW - 16)
    cardStyle = `position:fixed;top:${top}px;left:${left}px;width:${cardW}px`
  }
  return (
    <>
      {/* oscurecer todo menos el elemento */}
      <svg aria-hidden="true" style={sx('position:fixed;inset:0;width:100%;height:100%;z-index:940;pointer-events:none')}>
        <defs><mask id="tour-mask"><rect width="100%" height="100%" fill="white" />{r && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="12" fill="black" />}</mask></defs>
        <rect width="100%" height="100%" fill="rgba(13,29,65,.5)" mask="url(#tour-mask)" />
        {r && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="12" fill="none" stroke="#475CC7" strokeWidth="3" />}
      </svg>
      <div onClick={salir} style={sx('position:fixed;inset:0;z-index:941')} />
      <div role="dialog" aria-label={p.titulo} onClick={e => e.stopPropagation()} style={sx(cardStyle + ";z-index:960;background:#FFFFFF;border-radius:14px;padding:20px 22px;display:flex;flex-direction:column;gap:10px;font-family:'Montserrat',sans-serif;color:#0D1D41;box-shadow:0 20px 60px rgba(13,29,65,.35)")}>
        <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:10px')}>
          <span className="lbl" style={sx('color:#475CC7')}>Recorrido · {paso + 1} de {PASOS_TOUR.length}</span>
          <button type="button" onClick={salir} aria-label="Salir del recorrido" style={sx('border:0;background:transparent;color:#5F6B7A;font-size:18px;cursor:pointer;line-height:1')}>×</button>
        </div>
        <h3 style={sx('margin:0;font-size:18px;font-weight:700')}>{p.titulo}</h3>
        <p style={sx('margin:0;font-size:14px;line-height:1.55;color:#3E4A59')}>{p.texto}</p>
        {p.tip && <p style={sx('margin:0;font-size:13px;color:#5F6B7A')}>{p.tip}</p>}
        <div style={sx('display:flex;gap:4px;margin-top:4px')}>{PASOS_TOUR.map((_, i) => <span key={i} style={sx(`flex:1;height:4px;border-radius:2px;background:${i <= paso ? '#475CC7' : '#E4E8ED'}`)} />)}</div>
        <div style={sx('display:flex;justify-content:space-between;gap:10px;margin-top:4px')}>
          <button type="button" className="btn" onClick={salir} style={sx('min-height:36px;padding:0 12px;font-size:13px')}>Salir</button>
          <div style={sx('display:flex;gap:8px')}>
            {paso > 0 && <button type="button" className="btn" onClick={anterior} style={sx('min-height:36px;padding:0 12px;font-size:13px')}>Anterior</button>}
            <button type="button" className="btn btn-pri" onClick={siguiente} style={sx('min-height:36px;padding:0 14px;font-size:13px')}>{paso >= PASOS_TOUR.length - 1 ? 'Terminar' : 'Siguiente ›'}</button>
          </div>
        </div>
      </div>
    </>
  )
}
