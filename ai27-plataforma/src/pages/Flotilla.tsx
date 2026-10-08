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
.k{font-family:'Archivo',sans-serif;font-size:26px;font-weight:600}
`

type Cell = { v: string; cls: string }
const P = (v: string, cls?: string): Cell => ({ v, cls: cls || '' })
const ST: Record<string, string> = { 'Operando': 'pill p-info', 'Disponible': 'pill p-ok', 'En taller': 'pill p-warn', 'Siniestrada': 'pill p-bad', 'Baja': 'pill p-mute', 'Abierta': 'pill p-warn', 'Cerrada': 'pill p-ok', 'En aseguradora': 'pill p-info', 'Normal': 'pill p-ok', 'Anómalo': 'pill p-bad' }
const T: Record<'u' | 't' | 'c', { label: string; head: string[]; rows: Cell[][] }> = {
  u: {
    label: 'Unidades', head: ['Unidad', 'Vehículo', 'Placas', 'Custodio', 'Cliente / servicio', 'GPS', 'Póliza', 'Estatus'], rows: [
      ['AU-3321', 'Nissan X-Trail 2024', 'NTR-482-B', 'R. Medina', 'Alpura · SRV-24817', 'Samsara', 'vence 14 nov', 'Operando'],
      ['AU-2087', 'Nissan X-Trail 2024', 'NTP-119-C', '—', '—', 'Samsara', 'vigente', 'Disponible'],
      ['AU-1876', 'Toyota Hilux 2023', 'LKS-904-A', 'J. Ordaz', 'Electrónica del Bajío', 'Samsara', 'vigente', 'Operando'],
      ['AU-1450', 'VW Tiguan 2022', 'MMR-337-D', '—', '—', 'Ruptela', 'vence 2 nov', 'En taller'],
      ['AU-0992', 'Toyota Hilux 2021', 'JHT-561-A', '—', '—', 'Ruptela', 'en trámite', 'Siniestrada'],
      ['AU-2214', 'Nissan X-Trail 2023', 'NTB-776-C', 'F. Arce', 'Bebidas del Golfo', 'Samsara', 'vigente', 'Operando'],
    ].map(r => r.map((v, i) => P(v, i === 7 ? ST[v] : (i === 6 && v.indexOf('vence') === 0 ? 'pill p-warn' : (i === 0 ? 'mono' : ''))))),
  },
  t: {
    label: 'Taller', head: ['Orden', 'Unidad', 'Tipo', 'Falla reportada', 'Proveedor', 'Costo', 'Días fuera', 'Estatus'], rows: [
      ['OT-3381', 'AU-1450', 'Correctivo', 'Ruido en suspensión delantera', 'Servicio Automotriz Vallejo', '$14,800', '5', 'Abierta'],
      ['OT-3376', 'AU-2051', 'Preventivo', 'Servicio 60,000 km', 'Agencia Nissan Tlalnepantla', '$7,200', '1', 'Cerrada'],
      ['OT-3369', 'AU-0992', 'Siniestro', 'Choque lateral · deducible $18,000', 'Taller convenio aseguradora', '—', '12', 'En aseguradora'],
      ['OT-3362', 'AU-1688', 'Correctivo', 'Falla en alternador', 'Eléctrico Querétaro', '$6,400', '2', 'Cerrada'],
      ['OT-3358', 'AU-2214', 'Preventivo', 'Cambio de balatas y llantas', 'Llantera del Golfo', '$11,900', '1', 'Cerrada'],
    ].map(r => r.map((v, i) => P(v, i === 7 ? ST[v] : (i === 0 || i === 5 ? 'mono' : '')))),
  },
  c: {
    label: 'Combustible', head: ['Fecha', 'Unidad', 'Origen', 'Litros', 'Costo', 'Km GPS', 'km/l', 'Consumo'], rows: [
      ['06 oct', 'AU-3321', 'Tarjeta', '52.4', '$1,268', '538', '10.3', 'Normal'],
      ['06 oct', 'AU-1876', 'Tarjeta', '61.0', '$1,476', '412', '6.8', 'Anómalo'],
      ['05 oct', 'AU-2214', 'Manual', '47.8', '$1,157', '489', '10.2', 'Normal'],
      ['05 oct', 'AU-2087', 'Tarjeta', '44.1', '$1,067', '452', '10.2', 'Normal'],
      ['04 oct', 'AU-1688', 'Tarjeta', '58.3', '$1,411', '401', '6.9', 'Anómalo'],
    ].map(r => r.map((v, i) => P(v, i === 7 ? ST[v] : (i >= 3 && i <= 6 ? 'mono' : '')))),
  },
}
type Tab = keyof typeof T
const COST = ([['Combustible', 41200], ['Mantenimiento', 18300], ['Seguro', 12400]] as [string, number][])
  .map(([k, v]) => ({ k, v: '$' + v.toLocaleString('es-MX'), bar: 'height:100%;width:' + Math.round(v / 41200 * 100) + '%;background:#3FA7C9' }))
const VENC = 'display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px'

export default function Flotilla() {
  const [tab, setTab] = useState<Tab>('u')
  const cur = T[tab]

  return (
    <Shell active="flotilla" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Recursos</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Flotilla y taller</h1>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <button type="button" className="btn">Importar cargas de tarjeta</button>
          <button type="button" className="btn btn-pri">Nueva orden de taller</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · mantenimiento predictivo y combustible</span><span style={sx('font-size:14px;color:#3E4A59')}>AU-1876 y AU-1688 rinden 35% menos que la flotilla y sus km de GPS no cuadran con las cargas: posible fuga o uso no autorizado. AU-1450 tiene 82% de probabilidad de falla de suspensión en los próximos 2,000 km.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Rendimiento en km por litro: AU-3321 10.3, AU-1876 6.8, AU-2214 10.2, AU-2087 10.2, AU-1688 6.9, AU-1450 9.9" style={sx('display:block')}><g><rect x="4" y="11.8" width="28" height="48.2" rx="2" fill="#2B7FA8"></rect><rect x="40" y="28.2" width="28" height="31.8" rx="2" fill="#D9534F"></rect><rect x="76" y="12.3" width="28" height="47.7" rx="2" fill="#2B7FA8"></rect><rect x="112" y="12.3" width="28" height="47.7" rx="2" fill="#2B7FA8"></rect><rect x="148" y="27.7" width="28" height="32.3" rx="2" fill="#D9534F"></rect><rect x="184" y="13.7" width="28" height="46.3" rx="2" fill="#2B7FA8"></rect></g></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>km/l por unidad · rojo: consumo anómalo</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:12px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Operando</span><span className="k">91%</span><span style={sx('font-size:13px;color:#5F6B7A')}>546 de 600</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Días en taller</span><span className="k">4.2</span><span style={sx('font-size:13px;color:#5F6B7A')}>promedio por orden</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Km recorridos</span><span className="k">1.84M</span><span style={sx('font-size:13px;color:#5F6B7A')}>septiembre · GPS</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Rendimiento</span><span className="k">9.8 km/l</span><span style={sx('font-size:13px;color:#5F6B7A')}>meta 10.5</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Costo por km</span><span className="k">$4.10</span><span style={sx('font-size:13px;color:#5F6B7A')}>comb. + taller + seguro</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Siniestros</span><span className="k">3</span><span style={sx('font-size:13px;color:#5F6B7A')}>en el trimestre</span></div>
      </section>

      <div role="tablist" aria-label="Sección" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
        {(Object.keys(T) as Tab[]).map(k => (
          <button key={k} type="button" role="tab" aria-selected={k === tab} className="btn" style={sx(k === tab ? 'background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : '')} onClick={() => setTab(k)}>{T[k].label}</button>
        ))}
      </div>

      <section className="card" role="tabpanel" aria-label={cur.label} style={sx('padding:8px 8px 0')}>
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr>{cur.head.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {cur.rows.map((r, i) => (
                <tr key={tab + i}>{r.map((c, j) => <td key={j}><span className={c.cls}>{c.v}</span></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:10px')}>
          <h2 style={sx("margin:0 0 6px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Vencimientos próximos</h2>
          <div style={sx(VENC)}><span>Pólizas de seguro · 30 días</span><span className="pill p-warn">12 unidades</span></div>
          <div style={sx(VENC)}><span>Verificación vehicular · 2° semestre</span><span className="pill p-bad">27 unidades</span></div>
          <div style={sx(VENC)}><span>Servicio por kilometraje · &lt; 1,000 km</span><span className="pill p-warn">18 unidades</span></div>
          <div style={sx(VENC)}><span>Consumo anómalo vs km GPS</span><span className="pill p-bad">4 unidades</span></div>
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
          <h2 style={sx("margin:0 0 6px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Costo total · AU-3321 · trimestre</h2>
          {COST.map(c => (
            <div key={c.k} style={sx('display:grid;grid-template-columns:120px minmax(0,1fr) 90px;gap:12px;align-items:center;font-size:14px')}>
              <span>{c.k}</span>
              <div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden')}><div style={sx(c.bar)}></div></div>
              <span className="mono" style={sx('text-align:right')}>{c.v}</span>
            </div>
          ))}
          <div style={sx('display:flex;justify-content:space-between;border-top:1px solid #E4E8ED;padding-top:10px;font-weight:600')}><span>Total</span><span className="mono">$71,900 · $3.86/km</span></div>
        </div>
      </section>
    </Shell>
  )
}
