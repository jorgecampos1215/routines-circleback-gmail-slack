import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { ROUTES } from '../lib/routes'
import { actions } from '../lib/store'
import { sx, fmtMXN as fmt } from '../lib/sx'
import type { CotizacionPayload } from './CotizacionPDF'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-bad{background:#FDE8E8;color:#B42318}.p-warn{background:#FFF1DB;color:#8A5300}.p-ok{background:#E3F6EC;color:#17784A}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A}
.field select,.field input{min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif}
.step{width:40px;height:40px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:600 18px 'IBM Plex Sans',sans-serif;cursor:pointer}
`

type Tab = 'evt' | 'ded' | 'mon'
const ON = 'background:#FFF1DB;border-color:#F2A93B;color:#8A5300'
const TABS: [Tab, string][] = [['evt', 'Por evento'], ['ded', 'Custodio dedicado'], ['mon', 'Monitoreo como servicio']]
const RATES_INIT: [string, string[]][] = [
  ['Centro', ['$3,200', '$2.10', '$24,500', '$620']],
  ['Bajío', ['$3,000', '$2.10', '$23,000', '$600']],
  ['Occidente', ['$3,000', '$2.20', '$23,000', '$600']],
  ['Noreste', ['$3,400', '$2.30', '$26,000', '$650']],
  ['Golfo', ['$2,900', '$2.20', '$22,500', '$590']],
]
const KM = 382

/** "$3,200" → 3200; si no es número válido, usa el respaldo. */
function num(s: string, fallback: number) {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : fallback
}
const money = (n: number) => '$' + n.toLocaleString('es-MX')

export default function Cotizador() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('evt')
  const [c, setC] = useState(2)
  const [u, setU] = useState(1)
  const [night, setNight] = useState(true)
  const [origen, setOrigen] = useState('Tepotzotlán, Edomex')
  const [destino, setDestino] = useState('San Luis Potosí, SLP')
  // Dedicado
  const [perfil, setPerfil] = useState('Custodio armado · carga alto valor')
  const [nDed, setNDed] = useState('3')
  const [plazo, setPlazo] = useState('12 meses')
  const [unidadDed, setUnidadDed] = useState('Con unidad AI27')
  // Monitoreo
  const [nMon, setNMon] = useState('40')
  const [horarioMon, setHorarioMon] = useState('24/7')
  const [sla, setSla] = useState('5 minutos')
  const [fuente, setFuente] = useState('Ruptela')
  // Formato y tarifas
  const [formato, setFormato] = useState('Estándar AI27 (carta)')
  const [rates, setRates] = useState(RATES_INIT)
  const [enviada, setEnviada] = useState(false)

  // Tarifas de la zona Centro (origen Tepotzotlán) alimentan el cálculo
  const centro = rates[0][1]
  const rCust = num(centro[0], 3200)
  const rKm = num(centro[1], 2.1)
  const rDed = num(centro[2], 24500)
  const rMon = num(centro[3], 620)

  let lines: [string, number][]
  let priceLbl = 'Precio sugerido'
  const risk = night ? 1.4 : 1.15
  let parts = { cust: 0, unit: 0, fuel: 0, cas: 0, via: 0 }
  if (tab === 'evt') {
    const cust = c * rCust * risk, unit = u * KM * rKm, fuel = u * Math.round(KM / 9.8 * 24.2), cas = u * 1840, via = c * 650
    parts = { cust, unit, fuel, cas, via }
    lines = [['Custodios (' + c + ' × riesgo ' + risk + ')', cust], ['Unidades de custodia', unit], ['Combustible estimado', fuel], ['Casetas', cas], ['Viáticos', via]]
  } else if (tab === 'ded') {
    const n = Math.max(1, Math.round(num(nDed, 3)))
    const conUnidad = unidadDed === 'Con unidad AI27'
    lines = [[n + ' custodios × ' + money(rDed), n * rDed]]
    if (conUnidad) lines.push(['Unidad AI27 (renta + seguro)', 18900], ['Combustible estimado', 21600])
    lines.push(['Supervisión y monitoreo', 6000])
    priceLbl = 'Tarifa mensual'
  } else {
    const n = Math.max(1, Math.round(num(nMon, 40)))
    lines = [[n + ' unidades × ' + money(rMon), n * rMon], ['Monitorista dedicado (proporcional)', 9800], ['Plataforma y conectores', 3200]]
    priceLbl = 'Tarifa mensual'
  }
  const cost = lines.reduce((a, l) => a + l[1], 0)
  const price = cost / 0.65

  const tipo = tab === 'evt' ? 'Por evento' : tab === 'ded' ? 'Dedicado' : 'Monitoreo'
  const corto = (s: string) => s.split(',')[0].trim()

  function payload(): CotizacionPayload {
    const subtotal = Math.round(price)
    if (tab === 'evt') {
      const custAmt = Math.round((parts.cust + parts.via) / 0.65)
      const unitAmt = Math.round((parts.unit + parts.fuel) / 0.65)
      return {
        modelo: 'Custodia por evento',
        info: [
          ['Ruta', corto(origen) + ' → ' + corto(destino)],
          ['Distancia y tiempo', KM + ' km · 4 h 40'],
          ['Salida', night ? '8 oct 2026 · 22:00' : '8 oct 2026 · 08:00'],
          ['Nivel de riesgo', night ? 'Alto · horario nocturno' : 'Medio · horario diurno'],
        ],
        items: [
          { t: 'Custodios armados certificados', s: (night ? 'Turno nocturno' : 'Turno diurno') + ', portación vigente y evaluación de confianza', q: c, v: custAmt },
          { t: 'Unidad de custodia con GPS', s: 'Incluye combustible del trayecto', q: u, v: unitAmt },
          { t: 'Casetas de peaje', s: 6 * u + ' casetas en ruta', q: 1, v: subtotal - custAmt - unitAmt },
          { t: 'Monitoreo 24/7 desde centro de control', s: 'Seguimiento en vivo, alertas y protocolo de reacción', q: 1, v: null },
        ],
        subtotal,
        formato,
      }
    }
    // Dedicado / Monitoreo: cada línea de costo se lleva a precio con el mismo margen
    let acc = 0
    const items = lines.map(([k, v], i) => {
      const amt = i === lines.length - 1 ? subtotal - acc : Math.round(v / 0.65)
      acc += amt
      return { t: k, s: tab === 'ded' ? perfil + ' · ' + plazo : 'Horario ' + horarioMon + ' · SLA ' + sla, q: 1, v: amt }
    })
    const info: [string, string][] = tab === 'ded'
      ? [['Perfil', perfil], ['Custodios', String(Math.max(1, Math.round(num(nDed, 3))))], ['Plazo', plazo], ['Unidad', unidadDed]]
      : [['Unidades', String(Math.max(1, Math.round(num(nMon, 40))))], ['Horario', horarioMon], ['SLA de respuesta', sla], ['Fuente de rastreo', fuente]]
    return { modelo: tab === 'ded' ? 'Custodio dedicado · mensual' : 'Monitoreo como servicio · mensual', info, items, subtotal, formato }
  }

  function generarPDF() {
    const p = payload()
    navigate(ROUTES.CotizacionPDF + '?d=' + encodeURIComponent(JSON.stringify(p)), { state: p })
  }

  function aceptar() {
    const ruta = tab === 'evt' ? corto(origen) + ' → ' + corto(destino) : tab === 'ded' ? 'Dedicado · ' + plazo : 'Monitoreo · ' + nMon + ' unidades'
    actions.crearServicio({ cliente: 'Marsh', tipo, ruta, precio: Math.round(price) })
    navigate(ROUTES.AsignacionIA)
  }

  function setRate(zi: number, vi: number, val: string) {
    setRates(rs => rs.map((r, i) => (i === zi ? [r[0], r[1].map((x, j) => (j === vi ? val : x))] : r)))
  }

  return (
    <Shell active="cotizador" css={CSS}>
      <header style={sx('display:flex;flex-direction:column;gap:6px')}>
        <span className="lbl">Comercial · COT-1182 · Marsh</span>
        <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Cotizador</h1>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · precio sugerido</span><span style={sx('font-size:14px;color:#3E4A59')}>Marsh aceptó 9 de 11 cotizaciones Méx–SLP nocturnas entre $19K y $23K. El precio calculado cae en ese rango: probabilidad de aceptación 78%.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Precios aceptados por Marsh entre 19 y 23 mil pesos; precio actual 21,300" style={sx('display:block')}><g fill="#E2C48F"><rect x="4" y="40" width="16" height="20" rx="2"></rect><rect x="28" y="28" width="16" height="32" rx="2"></rect><rect x="52" y="14" width="16" height="46" rx="2"></rect><rect x="76" y="6" width="16" height="54" rx="2"></rect><rect x="100" y="20" width="16" height="40" rx="2"></rect><rect x="124" y="36" width="16" height="24" rx="2"></rect><rect x="148" y="48" width="16" height="12" rx="2"></rect></g><path d="M92 2V62" stroke="#B36B00" strokeWidth="2" strokeDasharray="4 3"></path><text x="98" y="10" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#8A5300">$21.3K</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Cotizaciones aceptadas por rango de precio</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <div role="tablist" aria-label="Modelo de servicio" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={k === tab} className="btn" style={sx(k === tab ? ON : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <section className="card" style={sx('flex:999 1 460px;display:flex;flex-direction:column;gap:18px')}>
          {tab === 'evt' && (
            <div style={sx('display:flex;flex-direction:column;gap:18px')}>
              <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px')}>
                <label className="field">Origen<input type="text" value={origen} onChange={e => setOrigen(e.target.value)} /></label>
                <label className="field">Destino<input type="text" value={destino} onChange={e => setDestino(e.target.value)} /></label>
              </div>
              <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:12px')}>
                <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Distancia</span><span className="mono" style={sx('font-size:18px')}>382 km</span></div>
                <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Tiempo</span><span className="mono" style={sx('font-size:18px')}>4 h 40</span></div>
                <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Casetas</span><span className="mono" style={sx('font-size:18px')}>6</span></div>
                <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Riesgo</span><span className={night ? 'pill p-bad' : 'pill p-warn'} style={sx('align-self:flex-start')}>{night ? 'Alto · 1.4' : 'Medio · 1.15'}</span></div>
              </div>
              <div style={sx('display:flex;flex-wrap:wrap;gap:24px')}>
                <div style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Custodios</span>
                  <div style={sx('display:flex;align-items:center;gap:10px')}><button type="button" className="step" aria-label="Quitar custodio" onClick={() => setC(Math.max(1, c - 1))}>−</button><span className="mono" style={sx('font-size:20px;min-width:24px;text-align:center')}>{c}</span><button type="button" className="step" aria-label="Agregar custodio" onClick={() => setC(Math.min(6, c + 1))}>+</button></div>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Unidades</span>
                  <div style={sx('display:flex;align-items:center;gap:10px')}><button type="button" className="step" aria-label="Quitar unidad" onClick={() => setU(Math.max(1, u - 1))}>−</button><span className="mono" style={sx('font-size:20px;min-width:24px;text-align:center')}>{u}</span><button type="button" className="step" aria-label="Agregar unidad" onClick={() => setU(Math.min(4, u + 1))}>+</button></div>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Horario</span>
                  <div style={sx('display:flex;gap:8px')}><button type="button" className="btn" style={sx(night ? '' : ON)} onClick={() => setNight(false)}>Diurno</button><button type="button" className="btn" style={sx(night ? ON : '')} onClick={() => setNight(true)}>Nocturno</button></div>
                </div>
              </div>
              <span style={sx('font-size:13px;color:#5F6B7A')}>El factor de riesgo sale del historial de incidentes de Querétaro–SLP (mapa de calor de Reacción).</span>
            </div>
          )}
          {tab === 'ded' && (
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px')}>
              <label className="field">Perfil<select value={perfil} onChange={e => setPerfil(e.target.value)}><option>Custodio armado · carga alto valor</option><option>Custodio no armado</option></select></label>
              <label className="field">Número de custodios<input type="text" value={nDed} onChange={e => setNDed(e.target.value)} /></label>
              <label className="field">Plazo<select value={plazo} onChange={e => setPlazo(e.target.value)}><option>12 meses</option><option>Indefinido</option><option>6 meses</option></select></label>
              <label className="field">Unidad<select value={unidadDed} onChange={e => setUnidadDed(e.target.value)}><option>Con unidad AI27</option><option>Sin unidad</option></select></label>
            </div>
          )}
          {tab === 'mon' && (
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px')}>
              <label className="field">Unidades a monitorear<input type="text" value={nMon} onChange={e => setNMon(e.target.value)} /></label>
              <label className="field">Horario<select value={horarioMon} onChange={e => setHorarioMon(e.target.value)}><option>24/7</option><option>Lunes a sábado 6–22</option></select></label>
              <label className="field">SLA de respuesta<select value={sla} onChange={e => setSla(e.target.value)}><option>5 minutos</option><option>10 minutos</option></select></label>
              <label className="field">Fuente de rastreo del cliente<select value={fuente} onChange={e => setFuente(e.target.value)}><option>Ruptela</option><option>Samsara</option></select></label>
            </div>
          )}
        </section>

        <aside className="card" aria-label="Resultado" style={sx('flex:1 1 320px;display:flex;flex-direction:column;gap:12px;border-color:#F3D9A8')}>
          <span className="lbl">Desglose de costo</span>
          {lines.map(([k, v]) => (
            <div key={k} style={sx('display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4')}><span>{k}</span><span className="mono">{fmt(v)}</span></div>
          ))}
          <div style={sx('display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#3E4A59')}><span>Costo total</span><span className="mono">{fmt(cost)}</span></div>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#3E4A59')}><span>Margen objetivo</span><span className="mono">35%</span></div>
          <div style={sx('display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid #E4E8ED')}>
            <span className="lbl">{priceLbl}</span>
            <span style={sx("font-family:'Archivo',sans-serif;font-size:36px;font-weight:600;color:#8A5300")}>{fmt(price)}</span>
            <span style={sx('font-size:13px;color:#5F6B7A')}>MXN antes de IVA · margen {fmt(price - cost)}</span>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <label className="field">Formato de cotización<select value={formato} onChange={e => setFormato(e.target.value)}><option>Estándar AI27 (carta)</option><option>Corporativo con anexo de protocolos</option><option>Resumido para correo</option></select></label>
            <button type="button" className="btn" onClick={generarPDF}>Generar cotización en PDF</button>
            <button type="button" className="btn" onClick={() => setEnviada(true)}>{enviada ? 'Enviada a Marsh por correo ✓' : 'Enviar al cliente por correo'}</button>
            <button type="button" className="btn btn-pri" onClick={aceptar}>Aceptada · convertir en servicio</button>
          </div>
        </aside>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Tarifas base por zona</h2>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Editables · un cliente puede tener tarifa pactada distinta</span>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:140px repeat(4,minmax(120px,1fr));gap:8px;min-width:640px;align-items:center;font-size:14px')}>
            <span className="lbl">Zona</span><span className="lbl">Custodio / jornada</span><span className="lbl">Unidad / km</span><span className="lbl">Dedicado / mes</span><span className="lbl">Monitoreo / unidad</span>
            {rates.map(([z, vs], zi) => [
              <span key={z}>{z}</span>,
              ...vs.map((v, vi) => (
                <label key={z + vi} style={sx('display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Tarifa</span><input type="text" value={v} onChange={e => setRate(zi, vi, e.target.value)} className="mono" style={sx('width:100%;min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 10px;font-size:14px;box-sizing:border-box')} /></label>
              )),
            ])}
          </div>
        </div>
      </section>
    </Shell>
  )
}
