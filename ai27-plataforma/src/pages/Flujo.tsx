import { Link } from 'react-router-dom'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { Logo } from '../components/Logo'

const CSS = `
a{color:#3448A8}a:hover{color:#0D1D41}
.paso{display:flex;gap:16px;align-items:center;padding:18px 20px;background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;min-height:88px;box-sizing:border-box}
.paso .n{width:40px;height:40px;border-radius:50%;background:#475CC7;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font:600 16px 'Montserrat',sans-serif;flex:none}
.paso .t{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600;line-height:1.3}
.paso .d{font-size:14px;color:#5F6B7A;line-height:1.4}
.paso .btn{flex:none}
.extra{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:10px;border:1px dashed #C3CBD5;background:#FFFFFF;color:#0D1D41;text-decoration:none;font-size:14px;font-weight:500}
.extra:hover{border-color:#475CC7;color:#0D1D41}
`

/** Los 7 pasos del guion, en el orden en que se muestran al cliente (15 a 20 minutos). */
const PASOS: { to: string; titulo: string; linea: string }[] = [
  { to: ROUTES.Main, titulo: 'Inicio: ¿cómo va la operación hoy?', linea: 'La foto del día: indicadores, alertas y custodios por zona.' },
  { to: ROUTES.Cotizador, titulo: 'Cotizar un servicio', linea: 'Distancia, riesgo y margen en segundos; la cotización sale en PDF.' },
  { to: ROUTES.AsignacionIA, titulo: 'Asignar custodios', linea: 'La IA sugiere quién va y en qué unidad; el coordinador confirma.' },
  { to: ROUTES.Monitoreo, titulo: 'Ver el mapa en vivo', linea: 'El GPS de Samsara detecta un desvío y dispara la alerta.' },
  { to: ROUTES.Reaccion, titulo: 'Atender el incidente', linea: 'Aviso a autoridades, equipo de reacción R-03 y recuperación.' },
  { to: ROUTES.ReporteIncidente, titulo: 'Enviar el reporte al cliente', linea: 'Cierre del incidente y envío del informe a Alpura.' },
  { to: ROUTES.AsistenteIA, titulo: 'Preguntarle a la operación', linea: 'Preguntas en lenguaje natural con gráficas; se fijan en Inicio.' },
]

/** Pantallas que alimentan el guion; se abren si el cliente pregunta por ellas. */
const EXTRAS: { to: string; label: string }[] = [
  { to: ROUTES.Servicios, label: 'Servicios y bitácora' },
  { to: ROUTES.Custodios, label: 'Custodios' },
  { to: ROUTES.CustodioMovil, label: 'App del custodio' },
  { to: ROUTES.CRM, label: 'Clientes' },
  { to: ROUTES.Flotilla, label: 'Flotilla y taller' },
  { to: ROUTES.RH, label: 'Equipo' },
  { to: ROUTES.Finanzas, label: 'Finanzas' },
]

export default function Flujo() {
  return (
    <div style={sx("min-height:100vh;background:#F6F7F9;font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;padding:32px 16px 64px;box-sizing:border-box")}>
      <style>{CSS}</style>
      <div style={sx('max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:24px')}>
        <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;justify-content:space-between')}>
          <div style={sx('display:flex;flex-direction:column;gap:8px;max-width:620px')}>
            <Link to={ROUTES.Main} aria-label="Inicio" style={sx('display:inline-flex;text-decoration:none')}><Logo /></Link>
            <span className="lbl">Demo</span>
            <h1 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.01em")}>Guion del demo</h1>
            <p style={sx('margin:0;color:#5F6B7A;font-size:15px;line-height:1.5')}>Siete pasos de 15 a 20 minutos en total. Abre cada paso en orden; dentro de cada pantalla, el botón azul te lleva al siguiente.</p>
          </div>
          <Link to={ROUTES.Main} className="btn">Volver a Inicio</Link>
        </header>

        <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px')}>
          {PASOS.map((p, i) => (
            <li key={p.to} className="paso">
              <span className="n" aria-hidden="true">{i + 1}</span>
              <span style={sx('display:flex;flex-direction:column;gap:3px;flex:1;min-width:0')}>
                <span className="t">{p.titulo}</span>
                <span className="d">{p.linea}</span>
              </span>
              <Link to={p.to} className={'btn' + (i === 0 ? ' btn-pri' : '')} aria-label={`Abrir paso ${i + 1}: ${p.titulo}`}>Abrir</Link>
            </li>
          ))}
        </ol>

        <section className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
          <div style={sx('display:flex;flex-direction:column;gap:2px')}>
            <h2 style={sx("margin:0;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:600")}>Si el cliente pregunta por más</h2>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Pantallas que alimentan el guion. Todas están también en el menú lateral.</span>
          </div>
          <div style={sx('display:flex;flex-wrap:wrap;gap:8px')}>
            {EXTRAS.map(e => <Link key={e.to} to={e.to} className="extra">{e.label} <span aria-hidden="true" style={sx('color:#475CC7')}>›</span></Link>)}
          </div>
        </section>
      </div>
    </div>
  )
}
