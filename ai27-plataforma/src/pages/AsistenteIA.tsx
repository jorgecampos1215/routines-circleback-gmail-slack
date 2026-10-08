import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-bad{background:#FDE8E8;color:#B42318}.p-warn{background:#FFF1DB;color:#8A5300}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:1px solid #E4E8ED}
.tbl td{padding:10px;border-bottom:1px solid #EEF1F4}
`

type Kind = 'bars' | 'group' | 'table' | 'line'
type Prompt = { q: string; kind: Kind; a: string; title?: string; data?: [string, number][]; fmt?: (v: number) => string; to: string; act: string; keys: string[] }

const P: Prompt[] = [
  { q: '¿Qué cliente nos dejó más margen en septiembre?', kind: 'bars', title: 'Margen por cliente · septiembre 2026',
    a: 'Alpura fue el cliente con más margen: $1.92M (38%) con 46 servicios por evento sin incidentes. Los 5 primeros concentran el 47% del margen del mes.',
    data: [['Alpura', 1.92], ['Marsh', 1.31], ['Farmacéutica Orión', 0.88], ['Autopartes Saltillo', 0.70], ['Electrónica del Bajío', 0.63]], fmt: v => '$' + v.toFixed(2) + 'M',
    to: ROUTES.Finanzas, act: 'Ver rentabilidad por cliente',
    keys: ['cliente', 'clientes', 'margen', 'rentable', 'rentabilidad', 'utilidad', 'ganancia', 'alpura', 'marsh', 'septiembre', 'factura', 'facturacion'] },
  { q: '¿Dónde subieron los incidentes este trimestre?', kind: 'group',
    a: 'Arco Norte pasó de 3 a 7 incidentes, 5 de ellos entre 22:00 y 04:00. Recomiendo subir su factor de riesgo de 1.2 a 1.4 y exigir 2 custodios en horario nocturno.',
    to: ROUTES.Cotizador, act: 'Actualizar riesgo en el cotizador',
    keys: ['incidente', 'incidentes', 'robo', 'robos', 'carretera', 'carreteras', 'arco', 'riesgo', 'trimestre', 'seguridad', 'subieron', 'reaccion', 'ruta', 'rutas'] },
  { q: '¿Cuántos custodios hay disponibles mañana por zona?', kind: 'table',
    a: 'Mañana faltan 6 custodios en Bajío. Centro tiene 9 de excedente: puedes mover 4 a Querétaro y cubrir los otros 2 desde Occidente.',
    to: ROUTES.AsignacionIA, act: 'Abrir asignación',
    keys: ['custodio', 'custodios', 'disponible', 'disponibles', 'manana', 'zona', 'zonas', 'bajio', 'faltan', 'cobertura', 'asignacion', 'documentos', 'personal', 'vencer'] },
  { q: 'Muéstrame ingresos contra gastos de los últimos 6 meses', kind: 'line',
    a: 'Los ingresos crecieron 17% de abril a septiembre ($12.1M a $14.1M) y los gastos 13% ($8.6M a $9.7M); el margen pasó de 29% a 31%. Combustible es la partida que más creció.',
    to: ROUTES.Finanzas, act: 'Abrir finanzas',
    keys: ['ingreso', 'ingresos', 'gasto', 'gastos', 'meses', 'finanzas', 'ventas', 'costos', 'costo', 'flujo', 'tendencia', 'crecimiento'] },
  { q: '¿Qué unidades tienen consumo de combustible anómalo?', kind: 'bars', title: 'Rendimiento km/l vs meta 10.5',
    a: 'AU-1876 y AU-1688 rinden 6.8 y 6.9 km/l, 35% por debajo de la flotilla, y sus kilómetros GPS no cuadran con las cargas. Sugiero revisión en taller y auditoría de tarjeta.',
    data: [['AU-1876', 6.8], ['AU-1688', 6.9], ['AU-2087', 10.2], ['AU-2214', 10.2], ['AU-3321', 10.3]], fmt: v => v.toFixed(1) + ' km/l',
    to: ROUTES.Flotilla, act: 'Abrir flotilla',
    keys: ['unidad', 'unidades', 'combustible', 'diesel', 'gasolina', 'consumo', 'rendimiento', 'flotilla', 'taller', 'anomalo', 'camion', 'camiones', 'km'] },
]

const G: [string, number, number][] = [['Arco Norte', 3, 7], ['Méx–Puebla–Orizaba', 4, 6], ['Méx–Querétaro', 4, 5], ['Querétaro–SLP', 2, 4], ['Guadalajara–Colima', 3, 2]]
const groups = G.map(([k, a, b]) => ({ k, v: a + ' → ' + b, b1: 'height:8px;border-radius:3px;background:#AEB8C4;width:' + Math.round(a / 7 * 100) + '%', b2: 'height:8px;border-radius:3px;background:#D08A1C;width:' + Math.round(b / 7 * 100) + '%' }))
const ROWS: [string, number, number][] = [['Centro', 21, 12], ['Bajío', 12, 18], ['Occidente', 12, 9], ['Noreste', 9, 6], ['Golfo', 8, 8]]
const rows = ROWS.map(([z, d, r]) => ({ z, d, r, diff: (d - r > 0 ? '+' : '') + (d - r), cls: d - r < 0 ? 'pill p-bad' : (d - r === 0 ? 'pill p-warn' : 'pill p-ok') }))

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
const STOP = new Set(['que', 'los', 'las', 'del', 'por', 'con', 'una', 'uno', 'para', 'hay', 'como', 'cual', 'cuales', 'cuantos', 'cuantas', 'este', 'esta', 'nos', 'mas', 'dame', 'muestrame'])
/** Coincidencia más cercana entre una pregunta libre y las preguntas que el demo sabe responder. */
function closest(text: string): number {
  const words = norm(text).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
  let best = 0, bestScore = -1
  P.forEach((p, i) => {
    const qWords = new Set(norm(p.q).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)))
    const score = words.reduce((acc, w) => acc
      + (p.keys.some(k => k === w || (w.length > 3 && (k.startsWith(w.slice(0, 5)) || w.startsWith(k.slice(0, 5))))) ? 2 : 0)
      + (qWords.has(w) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = i }
  })
  return best
}

export default function AsistenteIA() {
  const [i, setI] = useState(0)
  const [asked, setAsked] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [pinned, setPinned] = useState<Set<number>>(new Set())
  const cur = P[i]
  const max = cur.data ? Math.max(...cur.data.map(d => d[1])) : 1
  const bars = (cur.data || []).map(([k, v], j) => ({ k, v: cur.fmt!(v), bar: 'height:100%;width:' + Math.round(v / max * 100) + '%;background:' + (cur.kind === 'bars' && i === 4 && v < 8 ? '#D9534F' : (j === 0 && i === 0 ? '#D08A1C' : '#2B7FA8')) }))

  const pick = (n: number) => { setI(n); setAsked(null) }
  const ask = () => {
    const t = input.trim()
    if (!t) return
    setI(closest(t))
    setAsked(t)
    setInput('')
  }
  const exportar = () => {
    let csv = ''
    if (cur.kind === 'bars') csv = 'Concepto,Valor\n' + (cur.data || []).map(([k, v]) => `"${k}",${v}`).join('\n')
    else if (cur.kind === 'group') csv = 'Carretera,Q2,Q3\n' + G.map(([k, a, b]) => `"${k}",${a},${b}`).join('\n')
    else if (cur.kind === 'table') csv = 'Zona,Disponibles,Requeridos,Diferencia\n' + ROWS.map(([z, d, r]) => `"${z}",${d},${r},${d - r}`).join('\n')
    else csv = 'Mes,Ingresos,Gastos\nAbr,12.1,8.6\nMay,12.4,8.7\nJun,12.6,8.9\nJul,12.9,9.0\nAgo,13.6,9.4\nSep,14.1,9.7'
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'asistente-ia.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const togglePin = () => setPinned(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })

  return (
    <Shell active="asistente" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px">
      <header style={sx('display:flex;flex-direction:column;gap:6px')}>
        <span className="lbl">Inteligencia artificial</span>
        <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Asistente IA</h1>
        <span style={sx('color:#5F6B7A;font-size:14px')}>Pregunta lo que necesites de la plataforma: servicios, custodios, flotilla, incidentes, clientes o finanzas. Responde con datos, gráficas y acciones.</span>
      </header>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <aside className="card" style={sx('flex:1 1 260px;padding:14px;display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl" style={sx('padding:4px 8px 8px')}>Preguntas sugeridas</span>
          {P.map((p, n) => (
            <button key={n} type="button" onClick={() => pick(n)} style={sx("text-align:left;min-height:44px;padding:10px 12px;border-radius:8px;cursor:pointer;font:400 14px 'IBM Plex Sans',sans-serif;line-height:1.4;" + (n === i && asked === null ? 'background:#FFF1DB;border:1px solid #F3D9A8;color:#121821' : 'background:transparent;border:1px solid transparent;color:#3E4A59'))}>{p.q}</button>
          ))}
          <span className="lbl" style={sx('padding:16px 8px 4px')}>Fuentes que consulta</span>
          <span style={sx('font-size:13px;color:#3E4A59;padding:0 8px;line-height:1.6')}>Servicios, custodios, telemetría Samsara y Ruptela, incidentes, flotilla, CRM y finanzas. Respeta los permisos del rol de quien pregunta.</span>
        </aside>

        <section className="card" style={sx('flex:999 1 560px;display:flex;flex-direction:column;gap:18px;padding:24px')}>
          <div style={sx('align-self:flex-end;max-width:80%;background:#121821;color:#FFFFFF;border-radius:14px 14px 4px 14px;padding:12px 16px;font-size:15px')}>{asked ?? cur.q}</div>

          <div style={sx('display:flex;gap:12px;align-items:flex-start')}>
            <span style={sx('width:36px;height:36px;border-radius:50%;background:#FFF1DB;display:flex;align-items:center;justify-content:center;flex:none')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
            </span>
            <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:16px')}>
              {asked !== null && (
                <span style={sx('font-size:13px;color:#5F6B7A')}>Respuesta más cercana: «{cur.q}»</span>
              )}
              <p style={sx('margin:0;font-size:15px;line-height:1.6;text-wrap:pretty')}>{cur.a}</p>

              {cur.kind === 'bars' && (
                <figure style={sx('margin:0;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px')}>
                  <figcaption className="lbl">{cur.title || ''}</figcaption>
                  {bars.map(b => (
                    <div key={b.k} style={sx('display:grid;grid-template-columns:170px minmax(0,1fr) 80px;gap:12px;align-items:center;font-size:14px')}>
                      <span>{b.k}</span>
                      <div style={sx('height:14px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(b.bar)}></div></div>
                      <span className="mono" style={sx('text-align:right')}>{b.v}</span>
                    </div>
                  ))}
                </figure>
              )}

              {cur.kind === 'group' && (
                <figure style={sx('margin:0;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px')}>
                  <figcaption style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap')}><span className="lbl">Incidentes por carretera · Q2 vs Q3 2026</span>
                    <span style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59')}><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#AEB8C4')}></span>Q2</span><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#D08A1C')}></span>Q3</span></span>
                  </figcaption>
                  {groups.map(g => (
                    <div key={g.k} style={sx('display:grid;grid-template-columns:170px minmax(0,1fr) 60px;gap:12px;align-items:center;font-size:14px')}>
                      <span>{g.k}</span>
                      <div style={sx('display:flex;flex-direction:column;gap:3px')}><div style={sx(g.b1)}></div><div style={sx(g.b2)}></div></div>
                      <span className="mono" style={sx('text-align:right')}>{g.v}</span>
                    </div>
                  ))}
                </figure>
              )}

              {cur.kind === 'line' && (
                <figure style={sx('margin:0;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:10px')}>
                  <figcaption style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap')}><span className="lbl">Ingresos vs gastos · millones MXN</span>
                    <span style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59')}><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:14px;height:3px;background:#D08A1C')}></span>Ingresos</span><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:14px;height:3px;background:#2B7FA8')}></span>Gastos</span></span>
                  </figcaption>
                  <svg viewBox="0 0 640 230" role="img" aria-label="Ingresos suben de 12.1 a 14.1 millones y gastos de 8.6 a 9.7 millones entre abril y septiembre" style={sx('width:100%;height:auto;display:block')}>
                    <g stroke="#E4E8ED" strokeWidth="1"><path d="M30 200H620M30 148.6H620M30 97.1H620M30 45.7H620"></path></g>
                    <g fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#5F6B7A"><text x="0" y="204">8</text><text x="0" y="152">10</text><text x="0" y="101">12</text><text x="0" y="49">14</text></g>
                    <polyline points="40,94.6 152,86.9 264,81.7 376,74 488,56 600,43.1" fill="none" stroke="#D08A1C" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></polyline>
                    <polyline points="40,184.6 152,182 264,176.9 376,174.3 488,164 600,156.3" fill="none" stroke="#2B7FA8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></polyline>
                    <g fill="#D08A1C"><circle cx="40" cy="94.6" r="4"></circle><circle cx="152" cy="86.9" r="4"></circle><circle cx="264" cy="81.7" r="4"></circle><circle cx="376" cy="74" r="4"></circle><circle cx="488" cy="56" r="4"></circle><circle cx="600" cy="43.1" r="4"></circle></g>
                    <g fill="#2B7FA8"><circle cx="40" cy="184.6" r="4"></circle><circle cx="152" cy="182" r="4"></circle><circle cx="264" cy="176.9" r="4"></circle><circle cx="376" cy="174.3" r="4"></circle><circle cx="488" cy="164" r="4"></circle><circle cx="600" cy="156.3" r="4"></circle></g>
                    <g fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#3E4A59" textAnchor="middle"><text x="40" y="224">Abr</text><text x="152" y="224">May</text><text x="264" y="224">Jun</text><text x="376" y="224">Jul</text><text x="488" y="224">Ago</text><text x="600" y="224">Sep</text></g>
                    <g fontFamily="IBM Plex Mono, monospace" fontSize="11" textAnchor="middle"><text x="600" y="32" fill="#8A5300">14.1</text><text x="600" y="145" fill="#1E6488">9.7</text></g>
                  </svg>
                </figure>
              )}

              {cur.kind === 'table' && (
                <div style={sx('overflow-x:auto;background:#F7F9FB;border:1px solid #E4E8ED;border-radius:10px;padding:8px')}>
                  <table className="tbl">
                    <thead><tr><th>Zona</th><th>Disponibles</th><th>Requeridos</th><th>Diferencia</th></tr></thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.z}><td>{r.z}</td><td className="mono">{r.d}</td><td className="mono">{r.r}</td><td><span className={r.cls}>{r.diff}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                <Link className="btn" to={cur.to}>{cur.act}</Link>
                <button type="button" className="btn" onClick={togglePin} style={sx(pinned.has(i) ? 'border-color:#F2A93B;color:#8A5300' : '')}>{pinned.has(i) ? 'Agregado al dashboard ✓' : 'Agregar al dashboard'}</button>
                <button type="button" className="btn" onClick={exportar}>Exportar</button>
              </div>
            </div>
          </div>

          <form style={sx('display:flex;gap:10px;border-top:1px solid #EEF1F4;padding-top:18px;flex-wrap:wrap')} onSubmit={e => { e.preventDefault(); ask() }}>
            <label style={sx('flex:1 1 320px;display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Pregunta para el asistente</span><input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ej. ¿qué custodios tienen documentos por vencer este mes?" style={sx("flex:1;min-height:48px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:10px;color:#121821;padding:0 14px;font:400 15px 'IBM Plex Sans',sans-serif")} /></label>
            <button type="submit" className="btn btn-pri" style={sx('min-height:48px')}>Preguntar</button>
          </form>
        </section>
      </div>
    </Shell>
  )
}
