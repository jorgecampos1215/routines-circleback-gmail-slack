import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
@media print{
  @page{size:letter;margin:12mm}
  html,body{background:#FFFFFF !important}
  .ri-noprint{display:none !important}
  .ri-wrap{display:block !important;background:#FFFFFF !important;min-height:0 !important}
  .ri-main{padding:0 !important;display:block !important}
  .ri-doc{border:0 !important;border-radius:0 !important;padding:0 !important;max-width:none !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .ri-doc section,.ri-doc table tr{break-inside:avoid}
}
`

const TL = [
  { t: '14:30', x: 'Alerta automática de desvío de ruta (Samsara)' },
  { t: '14:31', x: 'Incidente abierto por el monitorista; custodio reporta cierre del paso' },
  { t: '14:34', x: 'Aviso a Guardia Nacional y C5 Edomex' },
  { t: '14:39', x: 'Tráiler detenido; motor apagado de forma remota' },
  { t: '14:47', x: 'Unidad de reacción R-03 y autoridades en sitio' },
  { t: '15:40', x: 'Carga inspeccionada y servicio reanudado' },
]
const EVID = 'aspect-ratio:4/3;background:#F3F5F8;border:1px dashed #C3CBD5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#5F6B7A'
const H3 = "margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600"

export default function ReporteIncidente() {
  const [sent, setSent] = useState(false)
  const sendLabel = sent ? 'Enviado al portal y correo de Alpura' : 'Enviar al cliente'

  return (
    <div className="ri-wrap" style={sx("font-family:'IBM Plex Sans',system-ui,sans-serif;color:#121821;background:#F6F7F9;min-height:100vh;display:flex;flex-wrap:wrap")}>
      <style>{CSS}</style>
      <div className="ri-noprint" style={sx('flex:1 1 240px;background:#FFFFFF;border-right:1px solid #EEF1F4')}>
        <Nav active="reaccion" />
      </div>
      <main className="ri-main" style={sx('flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px')}>
        <header className="ri-noprint" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
          <div style={sx('display:flex;flex-direction:column;gap:6px')}>
            <span className="lbl">Reacción · paso final</span>
            <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Reporte post-incidente</h1>
          </div>
          <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
            <Link className="btn" to={ROUTES.Reaccion}>Volver al incidente</Link>
            <button type="button" className="btn" onClick={() => window.print()}>Descargar PDF</button>
            <button type="button" className="btn btn-pri" onClick={() => setSent(true)}>{sendLabel}</button>
          </div>
        </header>

        <article className="ri-doc" style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:12px;max-width:880px;width:100%;box-sizing:border-box;padding:56px 64px;display:flex;flex-direction:column;gap:28px;align-self:center')}>
          <div style={sx('display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;border-bottom:2px solid #121821;padding-bottom:20px')}>
            <div style={sx('display:flex;align-items:center;gap:10px')}>
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2l12 5v8c0 7.5-5.2 12.6-12 15-6.8-2.4-12-7.5-12-15V7z" stroke="#D08A1C" strokeWidth="2"></path><path d="M10 17l4 4 8-9" stroke="#D08A1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              <span style={sx("font-family:'Archivo',sans-serif;font-weight:700;font-size:22px")}>AI27</span>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:2px;text-align:right;font-size:13px;color:#3E4A59')}>
              <span className="mono">INC-0412 · SRV-24817</span><span>Emitido 7 oct 2026, 18:20</span>
            </div>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:6px')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:26px;font-weight:600;text-wrap:balance")}>Intento de robo controlado · carga recuperada al 100%</h2>
            <span style={sx('font-size:15px;color:#3E4A59')}>Para: Alpura · Gerencia de logística y seguridad corporativa</span>
          </div>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:16px;background:#F7F9FB;border-radius:8px;padding:18px')}>
            <div><dt className="lbl">Ruta</dt><dd style={sx('margin:4px 0 0')}>Cuautitlán → El Salto</dd></div>
            <div><dt className="lbl">Ubicación</dt><dd style={sx('margin:4px 0 0')}>Méx–Qro km 142</dd></div>
            <div><dt className="lbl">Valor de la carga</dt><dd className="mono" style={sx('margin:4px 0 0')}>$2,400,000</dd></div>
            <div><dt className="lbl">Recuperado</dt><dd className="mono" style={sx('margin:4px 0 0;color:#17784A')}>$2,400,000</dd></div>
            <div><dt className="lbl">Respuesta en sitio</dt><dd style={sx('margin:4px 0 0')}>17 minutos</dd></div>
            <div><dt className="lbl">Denuncia</dt><dd className="mono" style={sx('margin:4px 0 0')}>FGJEM/CUA/1184/2026</dd></div>
          </dl>
          <section style={sx('display:flex;flex-direction:column;gap:10px')}>
            <h3 style={sx(H3)}>Resumen</h3>
            <p style={sx('margin:0;font-size:16px;line-height:1.6;text-wrap:pretty')}>A las 14:30 la telemetría de Samsara detectó un desvío de 1.6 km del tráiler TR-88213 hacia un camino de terracería. El monitorista abrió el incidente en un minuto, se dio aviso a Guardia Nacional y C5 Edomex, y la unidad de reacción R-03 llegó al sitio a las 14:47. Los agresores huyeron; la carga se inspeccionó con sellos íntegros y el servicio se reanudó a las 15:40.</p>
          </section>
          <section style={sx('display:flex;flex-direction:column;gap:10px')}>
            <h3 style={sx(H3)}>Línea de tiempo</h3>
            <table style={sx('width:100%;border-collapse:collapse;font-size:15px')}>
              <tbody>
                {TL.map(t => (
                  <tr key={t.t}><td className="mono" style={sx('padding:9px 16px 9px 0;border-bottom:1px solid #E4E8ED;width:70px;color:#3E4A59;vertical-align:top')}>{t.t}</td><td style={sx('padding:9px 0;border-bottom:1px solid #E4E8ED')}>{t.x}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          <section style={sx('display:flex;flex-direction:column;gap:10px')}>
            <h3 style={sx(H3)}>Evidencias</h3>
            <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
              <div style={sx(EVID)}>Foto de sellos</div>
              <div style={sx(EVID)}>Recorrido del replay</div>
              <div style={sx(EVID)}>Acta del MP</div>
            </div>
          </section>
          <section style={sx('display:flex;flex-direction:column;gap:10px')}>
            <h3 style={sx(H3)}>Recomendaciones</h3>
            <p style={sx('margin:0;font-size:16px;line-height:1.6;text-wrap:pretty')}>Para salidas de Cuautitlán entre 13:00 y 16:00 hacia Querétaro, asignar dos custodios y una geocerca de alerta temprana a 500 m de la ruta. AI27 actualiza el factor de riesgo del tramo km 120–150 en su cotizador.</p>
          </section>
          <div style={sx('display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-top:1px solid #E4E8ED;padding-top:18px;font-size:14px;color:#3E4A59')}>
            <span>Coordinación de Reacción AI27 · [NOMBRE Y FIRMA]</span><span>Contacto 24/7: [TELÉFONO]</span>
          </div>
        </article>

        <nav className="ri-noprint" aria-label="Siguiente en el demo" style={sx('display:flex;gap:12px;flex-wrap:wrap;justify-content:center')}>
          <Link className="btn" to={ROUTES.Flotilla}>Vista rápida: Flotilla</Link>
          <Link className="btn" to={ROUTES.RH}>Vista rápida: RH</Link>
          <Link className="btn" to={ROUTES.Finanzas}>Vista rápida: Rentabilidad</Link>
          <Link className="btn" to={ROUTES.Flujo}>Ver flujo completo</Link>
        </nav>
      </main>
    </div>
  )
}
