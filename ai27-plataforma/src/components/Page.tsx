import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sx } from '../lib/sx'

/* ───────────────────────── PageHeader ─────────────────────────
 * Encabezado uniforme de cada pantalla: sección, título, UNA frase que explica qué hace la pantalla,
 * y a la derecha una sola acción principal (azul) más, opcionalmente, acciones secundarias.
 *   <PageHeader seccion="Operación" titulo="Mapa en vivo" descripcion="Dónde están tus tráileres y custodios ahora mismo."
 *               accion={{ label: 'Nueva cotización', to: '/cotizador' }} secundarias={<button className="btn">Exportar</button>} />
 */
export type Accion = { label: string; to?: string; onClick?: () => void }
export function PageHeader({ seccion, titulo, descripcion, accion, secundarias, children, tour }: { seccion?: string; titulo: string; descripcion: string; accion?: Accion; secundarias?: ReactNode; children?: ReactNode; tour?: string }) {
  return (
    <header data-tour={tour} style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;justify-content:space-between')}>
      <div style={sx('display:flex;flex-direction:column;gap:6px;max-width:720px;min-width:0')}>
        {seccion && <span className="lbl">{seccion}</span>}
        <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:28px;font-weight:700;color:#0D1D41;letter-spacing:-.01em")}>{titulo}</h1>
        <p style={sx('margin:0;color:#5F6B7A;font-size:15px;line-height:1.5')}>{descripcion}</p>
        {children}
      </div>
      {(accion || secundarias) && (
        <div style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:center')}>
          {secundarias}
          {accion && (accion.to
            ? <Link to={accion.to} className="btn btn-pri">{accion.label}</Link>
            : <button type="button" className="btn btn-pri" onClick={accion.onClick}>{accion.label}</button>)}
        </div>
      )}
    </header>
  )
}

/* ───────────────────────── Pasos del flujo ─────────────────────────
 * Barra "Paso N de 4" que une Cotizar → Asignar → Monitorear → Atender incidente, para que la historia
 * del demo sea visible desde cualquier pantalla del flujo.
 */
export const FLUJO = [
  { n: 1, label: 'Cotizar', to: '/cotizador' },
  { n: 2, label: 'Asignar custodios', to: '/asignacion' },
  { n: 3, label: 'Monitorear', to: '/monitoreo' },
  { n: 4, label: 'Atender incidente', to: '/reaccion' },
]
export function Pasos({ actual }: { actual: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Flujo del servicio" style={sx('display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px')}>
      {FLUJO.map((p, i) => {
        const on = p.n === actual, done = p.n < actual
        return (
          <span key={p.n} style={sx('display:flex;align-items:center;gap:6px')}>
            <Link to={p.to} style={sx(`display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;text-decoration:none;font-weight:${on ? 600 : 500};` + (on ? 'background:#0D1D41;color:#FFFFFF' : done ? 'background:#E9EDFB;color:#0D1D41' : 'background:#F3F5F8;color:#5F6B7A'))}>
              <span className="mono" style={sx(`width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;${on ? 'background:#475CC7;color:#fff' : done ? 'background:#475CC7;color:#fff' : 'background:#E4E8ED;color:#5F6B7A'}`)}>{done ? '✓' : p.n}</span>
              {p.label}
            </Link>
            {i < FLUJO.length - 1 && <span style={sx('color:#C3CBD5')}>›</span>}
          </span>
        )
      })}
    </nav>
  )
}

/* ───────────────────────── Section ─────────────────────────
 * Tarjeta con título y, opcionalmente, plegable. Lo secundario de cada pantalla va plegado (`plegable` + `abierto={false}`)
 * para que a primera vista solo se vea lo esencial.
 *   <Section titulo="Tarifas base por zona" ayuda="Editables. Alimentan el cálculo del precio." plegable abierto={false}>…</Section>
 */
export function Section({ titulo, ayuda, acciones, plegable, abierto = true, children, style, tour }: { titulo: string; ayuda?: string; acciones?: ReactNode; plegable?: boolean; abierto?: boolean; children: ReactNode; style?: string; tour?: string }) {
  const [open, setOpen] = useState(abierto)
  const head = (
    <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
      <div style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}>
        <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600;color:#0D1D41")}>{titulo}</h2>
        {ayuda && <span style={sx('font-size:13px;color:#5F6B7A')}>{ayuda}</span>}
      </div>
      <div style={sx('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
        {acciones}
        {plegable && (
          <button type="button" className="btn" onClick={() => setOpen(o => !o)} aria-expanded={open} style={sx('min-height:34px;padding:0 12px;font-size:13px')}>
            {open ? 'Ocultar' : 'Ver más'} <span aria-hidden="true" style={sx(`display:inline-block;transition:transform .15s;transform:rotate(${open ? 180 : 0}deg)`)}>⌄</span>
          </button>
        )}
      </div>
    </div>
  )
  return (
    <section className="card" data-tour={tour} style={sx('display:flex;flex-direction:column;gap:14px;' + (style ?? ''))}>
      {head}
      {(!plegable || open) && children}
    </section>
  )
}

/* ───────────────────────── Ayuda contextual ───────────────────────── */
export function Nota({ children }: { children: ReactNode }) {
  return <p style={sx('margin:0;font-size:13px;color:#5F6B7A;line-height:1.5')}>{children}</p>
}
