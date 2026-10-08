import { useRef, useState } from 'react'
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
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.k{font-family:'Archivo',sans-serif;font-size:24px;font-weight:600}
.crm-row{cursor:pointer}.crm-row:hover td{background:#FAFBFC}
.crm-row.sel td{background:#FFF8EC}
button.pill{border:0;cursor:pointer;font-family:'IBM Plex Sans',sans-serif}
.crm-deal{cursor:pointer}.crm-deal:hover{outline:1px solid #D5DBE3}
`

type Cliente = { name: string; type: string; rev: string; since: string; active: number; q: string; margin: string; inc: string; c1: string; c2: string; routes: string; rate: string; req: string }

/** Clientes de la lista lateral (renderVals del diseño). */
const C: Cliente[] = [
  { name: 'Alpura', type: 'Por evento', rev: '$5.0M', since: '2019', active: 14, q: '$14.6M', margin: '38%', inc: '2', c1: 'Gerente de logística · [NOMBRE]', c2: 'Seguridad corporativa · [NOMBRE]', routes: 'Cuautitlán–Guadalajara, Cuautitlán–Querétaro, Cuautitlán–Puebla', rate: '$30.50/km · 2 custodios nocturno', req: 'Cadena de frío: check-in de temperatura en cada parada' },
  { name: 'Marsh', type: 'Evento + monitoreo', rev: '$3.8M', since: '2021', active: 9, q: '$11.2M', margin: '34%', inc: '1', c1: 'Riesgos de transporte · [NOMBRE]', c2: 'Siniestros · [NOMBRE]', routes: 'Arco Norte, Méx–SLP', rate: '$31.00/km · monitoreo $900/unidad', req: 'Reporte post-incidente en 24 h para aseguradora' },
  { name: 'Farmacéutica Orión', type: 'Por evento', rev: '$2.9M', since: '2020', active: 6, q: '$8.4M', margin: '29%', inc: '0', c1: 'Distribución · [NOMBRE]', c2: 'Compras · [NOMBRE]', routes: 'Toluca–Monterrey, Toluca–Guadalajara', rate: '$29.00/km', req: 'Custodios con certificación de carga farmacéutica' },
  { name: 'Autopartes Saltillo', type: 'Dedicado', rev: '$2.3M', since: '2023', active: 4, q: '$6.8M', margin: '31%', inc: '0', c1: 'Planta Ramos Arizpe · [NOMBRE]', c2: '—', routes: 'Saltillo–Nuevo Laredo', rate: '$47,000/mes por custodio', req: 'Custodios con inglés básico para cruce' },
  { name: 'Electrónica del Bajío', type: 'Dedicado', rev: '$1.9M', since: '2022', active: 2, q: '$5.6M', margin: '33%', inc: '1', c1: 'Seguridad patrimonial · [NOMBRE]', c2: '—', routes: 'León–Lázaro Cárdenas', rate: '$48,000/mes por custodio', req: 'Rotación de custodios cada 6 meses' },
  { name: 'Logística Pacífico Norte', type: 'Monitoreo', rev: '$1.3M', since: '2024', active: 1, q: '$3.9M', margin: '41%', inc: '0', c1: 'Torre de control · [NOMBRE]', c2: '—', routes: '48 unidades propias', rate: '$900/unidad/mes', req: 'SLA 5 minutos 24/7' },
  { name: 'Bebidas del Golfo', type: 'Por evento', rev: '$1.1M', since: '2024', active: 3, q: '$3.2M', margin: '27%', inc: '1', c1: 'Logística · [NOMBRE]', c2: '—', routes: 'Veracruz–Puebla, Veracruz–CDMX', rate: '$27.50/km', req: 'Ventanas de entrega nocturnas' },
]
/** Clientes que aparecen solo en la tabla: vista 360 al seleccionarlos desde la tabla. */
const EXTRA: Cliente[] = [
  { name: 'Grupo Textil Arrayán', type: 'Por evento', rev: '$0.5M', since: '2025', active: 0, q: '$1.4M', margin: '22%', inc: '0', c1: 'Logística · [NOMBRE]', c2: '—', routes: 'Puebla–Manzanillo, Puebla–Lázaro Cárdenas', rate: '$28.00/km', req: 'Cobranza vencida 81 días: revisar antes de nuevos eventos' },
  { name: 'Distribuidora Peninsular', type: 'Por evento', rev: '$0.4M', since: '2025', active: 1, q: '$1.1M', margin: '30%', inc: '0', c1: 'Operaciones · [NOMBRE]', c2: '—', routes: 'Mérida–Cancún, Mérida–Villahermosa', rate: '$28.50/km', req: 'Evaluando custodio dedicado (4 custodios)' },
  { name: 'Química del Norte', type: 'Monitoreo', rev: '$0.3M', since: '2024', active: 1, q: '$0.9M', margin: '36%', inc: '0', c1: 'Seguridad industrial · [NOMBRE]', c2: '—', routes: '22 unidades propias', rate: '$880/unidad/mes', req: 'Materiales peligrosos: protocolo de reacción especial' },
]
const ALL = [...C, ...EXTRA]

type Row = [string, string, number, string, number, string, string]
const TABLE: Row[] = [
  ['Alpura', 'Por evento', 14, '$14.6M', 38, 'Al corriente', 'hoy'], ['Marsh', 'Evento + monitoreo', 9, '$11.2M', 34, 'Al corriente', 'hoy'],
  ['Farmacéutica Orión', 'Por evento', 6, '$8.4M', 29, '45 días', 'hoy'], ['Autopartes Saltillo', 'Dedicado', 4, '$6.8M', 31, 'Al corriente', 'continuo'],
  ['Electrónica del Bajío', 'Dedicado', 2, '$5.6M', 33, 'Al corriente', 'continuo'], ['Logística Pacífico Norte', 'Monitoreo', 1, '$3.9M', 41, 'Al corriente', 'continuo'],
  ['Bebidas del Golfo', 'Por evento', 3, '$3.2M', 27, '74 días', 'ayer'], ['Grupo Textil Arrayán', 'Por evento', 0, '$1.4M', 22, '81 días', 'hace 12 días'],
  ['Distribuidora Peninsular', 'Por evento', 1, '$1.1M', 30, 'Al corriente', 'hace 3 días'], ['Química del Norte', 'Monitoreo', 1, '$0.9M', 36, 'Al corriente', 'continuo'],
]
/** Clientes con portal en vivo (servicio visible en tiempo real para el cliente). */
const PORTAL = ['Alpura', 'Marsh', 'Logística Pacífico Norte']

type Deal = { name: string; what: string; amt: string; next: string; cls: string }
type Stage = { name: string; total: string; deals: Deal[] }
const D = (name: string, what: string, amt: string, next: string, cls: string): Deal => ({ name, what, amt, next, cls: 'pill ' + cls })
const STAGES: Stage[] = [
  { name: 'Prospecto', total: '$1.2M', deals: [D('Grupo Textil Arrayán', 'Eventos Puebla–Pacífico', '$420K', 'Llamar 9 oct', 'p-mute'), D('Cementos del Centro', 'Monitoreo 60 unidades', '$780K', 'Correo hoy', 'p-warn')] },
  { name: 'Diagnóstico', total: '$0.9M', deals: [D('Distribuidora Peninsular', 'Dedicado 4 custodios', '$560K', 'Visita 10 oct', 'p-info')] },
  { name: 'Cotizado', total: '$2.1M', deals: [D('Marsh', 'Méx–SLP nocturno', '$190K/evento', 'Seguimiento 8 oct', 'p-warn'), D('Agroexport Sinaloa', 'Eventos Culiacán–Nogales', '$1.4M', 'Vencido 2 días', 'p-bad')] },
  { name: 'Negociación', total: '$1.6M', deals: [D('Farmacéutica Orión', 'Ampliar a Monterrey dedicado', '$1.6M', 'Junta 14 oct', 'p-info')] },
  { name: 'Ganado', total: '$0.7M', deals: [D('Autopartes Saltillo', 'Renovación 12 meses', '$188K/mes', 'Firmado', 'p-ok')] },
]

const TH = 'text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED'
const TH_R = 'text-align:right;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED'
const PILL_ON = 'background:#FFF1DB;color:#8A5300'

export default function CRM() {
  const [selName, setSelName] = useState('Alpura')
  const [filtro, setFiltro] = useState<'todos' | 'portal'>('todos')
  const [stages, setStages] = useState(STAGES)
  const [leads, setLeads] = useState(0)
  const [desdeTabla, setDesdeTabla] = useState(false)

  const sel = ALL.find(c => c.name === selName) ?? C[0]
  const vista = useRef<HTMLDivElement>(null)
  const pick = (name: string) => {
    if (!ALL.some(c => c.name === name)) return
    setSelName(name)
    vista.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const rows = filtro === 'portal' ? TABLE.filter(r => PORTAL.includes(r[0])) : TABLE

  function nuevoLead() {
    const n = leads + 1
    setLeads(n)
    setStages(ss => ss.map((s, i) => (i === 0 ? { ...s, deals: [...s.deals, D('Lead nuevo ' + n, 'Por calificar', '—', 'Calificar hoy', 'p-mute')] } : s)))
  }

  return (
    <Shell active="crm" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Comercial</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Clientes y pipeline</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>25 clientes activos · {18 + leads} leads abiertos · cierre de cotizaciones 42%</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}><button type="button" className="btn" onClick={nuevoLead}>Nuevo lead</button><Link className="btn btn-pri" to={ROUTES.Cotizador}>Nueva cotización</Link></div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · siguiente mejor acción</span><span style={sx('font-size:14px;color:#3E4A59')}>Agroexport Sinaloa tiene la cotización vencida hace 2 días y abrió el PDF 4 veces. Si se le llama hoy, la probabilidad de cierre estimada es 64%. Farmacéutica Orión es el deal con más probabilidad del pipeline (85%).</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Probabilidad de cierre por deal: Orión 85, Peninsular 71, Agroexport 64, Marsh 52, Cementos 38" style={sx('display:block')}><g fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#3E4A59"><rect x="4" y="9.2" width="30" height="51" rx="2" fill="#2B9A66"></rect><rect x="48" y="17.4" width="30" height="42.6" rx="2" fill="#2B7FA8"></rect><rect x="92" y="21.6" width="30" height="38.4" rx="2" fill="#D08A1C"></rect><rect x="136" y="28.8" width="30" height="31.2" rx="2" fill="#2B7FA8"></rect><rect x="180" y="37.2" width="30" height="22.8" rx="2" fill="#AEB8C4"></rect><text x="8" y="6">85%</text><text x="96" y="18">64%</text></g></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Probabilidad de cierre por deal</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <nav aria-label="Clientes" className="card" style={sx('flex:1 1 260px;padding:10px;display:flex;flex-direction:column;gap:4px')}>
          {C.map(c => (
            <button key={c.name} type="button" aria-pressed={c.name === sel.name} onClick={() => { setSelName(c.name); setDesdeTabla(false) }} style={sx("display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:52px;padding:6px 12px;border-radius:8px;border:0;cursor:pointer;font:400 14px 'IBM Plex Sans',sans-serif;text-align:left;" + (c.name === sel.name ? 'background:#FFF1DB;color:#8A5300' : 'background:transparent;color:#121821'))}>
              <span style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:2px')}><span style={sx('font-weight:500')}>{c.name}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{c.type}</span></span>
              <span className="mono" style={sx('font-size:13px;color:#3E4A59')}>{c.rev}</span>
            </button>
          ))}
        </nav>

        <section style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px')}>
          <div ref={vista} className="card" style={sx('display:flex;flex-direction:column;gap:16px')}>
            <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start')}>
              <div style={sx('display:flex;flex-direction:column;gap:4px')}><span className="lbl">Vista 360</span><h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:24px;font-weight:600")}>{sel.name}</h2><span style={sx('font-size:14px;color:#5F6B7A')}>{sel.type} · cliente desde {sel.since}</span></div>
              <span className="pill p-ok">Contrato vigente</span>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:12px')}>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Servicios activos</span><span className="k">{sel.active}</span></div>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Facturado trimestre</span><span className="k">{sel.q}</span></div>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Margen</span><span className="k">{sel.margin}</span></div>
              <div style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px')}><span className="lbl">Incidentes</span><span className="k">{sel.inc}</span></div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:20px;font-size:14px')}>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Contactos</span><span>{sel.c1}</span><span>{sel.c2}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Rutas frecuentes</span><span>{sel.routes}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Tarifa pactada</span><span className="mono">{sel.rate}</span></div>
              <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="lbl">Requisitos especiales</span><span>{sel.req}</span></div>
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px;padding:20px 8px 0')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;padding:0 12px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Todos los clientes</h2>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
            <button type="button" aria-pressed={filtro === 'todos'} className="pill p-mute" onClick={() => setFiltro('todos')}>25 activos</button>
            <button type="button" aria-pressed={filtro === 'portal'} className="pill p-mute" style={sx(filtro === 'portal' ? PILL_ON : '')} onClick={() => setFiltro(f => (f === 'portal' ? 'todos' : 'portal'))}>3 con portal en vivo</button>
            <button type="button" className="btn">Alta de cliente</button>
          </div>
        </div>
        <div style={sx('overflow-x:auto')}>
          <table style={sx('width:100%;border-collapse:collapse;font-size:14px')}>
            <thead><tr>
              <th style={sx(TH)}>Cliente</th>
              <th style={sx(TH)}>Modelo</th>
              <th style={sx(TH_R)}>Servicios activos</th>
              <th style={sx(TH_R)}>Facturado trimestre</th>
              <th style={sx(TH + ';min-width:160px')}>Margen</th>
              <th style={sx(TH)}>Cobranza</th>
              <th style={sx(TH)}>Último servicio</th>
            </tr></thead>
            <tbody>
              {rows.map(([n, m, a, q, mg, c, l]) => {
                const cls = c === 'Al corriente' ? 'pill p-ok' : (parseInt(c) > 60 ? 'pill p-bad' : 'pill p-warn')
                const bar = 'height:100%;width:' + Math.round(mg / 45 * 100) + '%;background:' + (mg < 28 ? '#D08A1C' : '#2B9A66')
                return (
                  <tr key={n} className={'crm-row' + (desdeTabla && n === sel.name ? ' sel' : '')} onClick={() => { pick(n); setDesdeTabla(true) }} title="Ver vista 360">
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap;font-weight:500')}>{n}</td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap')}>{m}</td>
                    <td className="mono" style={sx('padding:12px;border-bottom:1px solid #EEF1F4;text-align:right')}>{a}</td>
                    <td className="mono" style={sx('padding:12px;border-bottom:1px solid #EEF1F4;text-align:right')}>{q}</td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4')}><div style={sx('display:flex;align-items:center;gap:8px')}><div style={sx('flex:1;height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(bar)}></div></div><span className="mono" style={sx('font-size:13px')}>{mg + '%'}</span></div></td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4')}><span className={cls}>{c}</span></td>
                    <td style={sx('padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap;color:#3E4A59')}>{l}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sx('display:flex;flex-direction:column;gap:12px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Pipeline comercial</h2>
          <span style={sx('font-size:13px;color:#5F6B7A')}>Valor mensual estimado · MXN</span>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:repeat(5,minmax(210px,1fr));gap:12px;min-width:1080px')}>
            {stages.map(s => (
              <div key={s.name} style={sx('background:#F3F5F8;border:1px solid #E4E8ED;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px')}>
                <div style={sx('display:flex;justify-content:space-between;gap:8px')}><span style={sx('font-weight:600;font-size:14px')}>{s.name}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{s.total}</span></div>
                {s.deals.map(d => (
                  <div key={d.name} className={ALL.some(c => c.name === d.name) ? 'crm-deal' : undefined} onClick={() => pick(d.name)} style={sx('background:#F3F5F8;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px')}>
                    <span style={sx('font-weight:500;font-size:14px')}>{d.name}</span>
                    <span style={sx('font-size:12px;color:#5F6B7A')}>{d.what}</span>
                    <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center')}><span className="mono" style={sx('font-size:13px')}>{d.amt}</span><span className={d.cls}>{d.next}</span></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  )
}
