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
.tbl td{padding:10px 12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.cus-row{cursor:pointer}
.cus-row:hover td{background:#FAFBFC}
`

const CLS: Record<string, string> = { 'Disponible': 'pill p-ok', 'Asignado': 'pill p-info', 'En servicio': 'pill p-info', 'Descanso': 'pill p-mute', 'Vacaciones': 'pill p-mute', 'Incapacidad': 'pill p-warn', 'Baja': 'pill p-bad' }
const COUNTS: [string, number][] = [['Todos', 400], ['Disponible', 65], ['Asignado', 54], ['En servicio', 258], ['Descanso', 14], ['Vacaciones', 6], ['Incapacidad', 3]]
const DATA = [
  ['C-1102', 'Hugo Salazar', 'Centro', 'Cuautitlán', 'Disponible', '—', '32', '4.9', 'Al día'],
  ['C-0877', 'Iván Cetina', 'Centro', 'Tepotzotlán', 'Disponible', '—', '38', '4.8', 'Al día'],
  ['C-1043', 'Raúl Medina', 'Centro', 'Cuautitlán', 'En servicio', 'Alpura · SRV-24817', '44', '4.6', 'Al día'],
  ['C-1188', 'Ernesto Villa', 'Centro', 'Ecatepec', 'En servicio', 'Alpura · SRV-24817', '47', '4.4', 'Licencia 12 días'],
  ['C-0654', 'Marco Ríos', 'Bajío', 'Celaya', 'Asignado', 'Orión · SRV-24822', '40', '4.7', 'Al día'],
  ['C-0712', 'Jesús Ordaz', 'Bajío', 'León', 'En servicio', 'Electrónica del Bajío · DED-0412', '52', '4.5', 'Exceso de horas'],
  ['C-1240', 'Óscar Bautista', 'Bajío', 'Querétaro', 'Disponible', '—', '29', '4.3', 'Confianza 21 días'],
  ['C-0398', 'Felipe Arce', 'Golfo', 'Veracruz', 'Descanso', '—', '46', '4.6', 'Al día'],
  ['C-0931', 'Rafael Uc', 'Centro', 'Tultitlán', 'Disponible', '—', '41', '4.2', 'Sin asignar 9 días'],
  ['C-0566', 'Daniel Soto', 'Noreste', 'Monterrey', 'Incapacidad', '—', '0', '4.7', 'Portación 30 días'],
]
const ROWS = DATA.map(([id, name, zone, base, status, asg, h, perf, docs]) => ({
  id, name, zone, base, status, asg, h, perf, docs, cls: CLS[status],
  docCls: docs === 'Al día' ? 'pill p-ok' : (docs.indexOf('días') > 0 && parseInt(docs.replace(/\D/g, '')) <= 14 ? 'pill p-bad' : 'pill p-warn'),
}))
const sh = (pat: string) => pat.split('').map(c => 'height:32px;border-radius:4px;background:' + (c === 's' ? '#3FA7C9' : c === 'd' ? '#CBD3DD' : '#4CC38A'))
const SHIFTS = [
  { name: 'Hugo Salazar', days: sh('ssdllss') },
  { name: 'Iván Cetina', days: sh('sssdlsl') },
  { name: 'Raúl Medina', days: sh('dsssssd') },
  { name: 'Ernesto Villa', days: sh('ssssssd') },
  { name: 'Rafael Uc', days: sh('llllssd') },
]
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Custodios() {
  const [f, setF] = useState('Todos')
  const [selId, setSelId] = useState('C-1102')
  const [q, setQ] = useState('')

  const nq = norm(q.trim())
  const rows = ROWS
    .filter(r => f === 'Todos' || r.status === f)
    .filter(r => !nq || norm(r.name + ' ' + r.id + ' ' + r.zone + ' ' + r.base).includes(nq))
  const sel = ROWS.find(r => r.id === selId) || ROWS[0]
  const docs = [
    { k: 'Licencia federal', v: sel.id === 'C-1188' ? 'vence en 12 días' : 'vigente · 2028', cls: sel.id === 'C-1188' ? 'pill p-bad' : 'pill p-ok' },
    { k: 'Portación / permiso', v: sel.id === 'C-0566' ? 'vence en 30 días' : 'vigente · 2027', cls: sel.id === 'C-0566' ? 'pill p-warn' : 'pill p-ok' },
    { k: 'Evaluación de confianza', v: sel.id === 'C-1240' ? 'vence en 21 días' : 'abr 2026', cls: sel.id === 'C-1240' ? 'pill p-warn' : 'pill p-ok' },
    { k: 'Certificación carga alto valor', v: 'vigente', cls: 'pill p-ok' },
    { k: 'Alta en Samsara', v: 'activo', cls: 'pill p-ok' },
  ]

  return (
    <Shell active="custodios" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Recursos</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Custodios</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>400 custodios en 7 zonas · utilización 78% · 41 h promedio por semana</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <label style={sx('display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Buscar custodio</span><input type="search" placeholder="Buscar por nombre, ID o zona" value={q} onChange={e => setQ(e.target.value)} style={sx("min-height:40px;min-width:260px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif")} /></label>
          <button type="button" className="btn btn-pri">Alta de custodio</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · fatiga y cobertura</span><span style={sx('font-size:14px;color:#3E4A59')}>J. Ordaz lleva 52 h esta semana y 3 custodios de Bajío acumulan semanas sin descanso completo. Rafael Uc lleva 9 días sin asignar: sugiero asignarlo al hueco de Bajío de mañana.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Utilización semanal de custodios en las últimas 6 semanas: 72, 74, 76, 79, 77 y 78 por ciento" style={sx('display:block')}><path d="M10 60H210" stroke="#E4E8ED"></path><path d="M10 12.8H210" stroke="#F3D9A8" strokeDasharray="4 3"></path><polyline points="10,46.4 50,36.8 90,27.2 130,12.8 170,22.4 210,17.6" fill="none" stroke="#2B7FA8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline><circle cx="210" cy="17.6" r="4" fill="#2B7FA8"></circle><text x="176" y="34" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#1E6488">78%</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Utilización semanal · línea punteada: tope sano</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsignacionIA}>Abrir asignación</Link>
      </section>

      <div role="group" aria-label="Filtrar por estatus" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr));gap:10px')}>
        {COUNTS.map(([label, n]) => (
          <button key={label} type="button" aria-pressed={label === f} onClick={() => setF(label)} style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;border-radius:10px;cursor:pointer;font-family:inherit;color:#121821;text-align:left;background:#FFFFFF;border:1px solid ' + (label === f ? '#F2A93B' : '#E4E8ED'))}>
            <span style={sx('font-size:12px;color:#5F6B7A')}>{label}</span>
            <span style={sx("font-family:'Archivo',sans-serif;font-size:24px;font-weight:600")}>{n}</span>
          </button>
        ))}
      </div>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <section className="card" style={sx('flex:999 1 560px;padding:8px 8px 0')}>
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr><th>Custodio</th><th>Zona</th><th>Estatus</th><th>Asignación actual</th><th>Horas sem.</th><th>Desempeño</th><th>Docs</th><th><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Acción</span></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="cus-row" aria-selected={r.id === selId} style={sx(r.id === selId ? 'background:#F3F5F8' : '')} onClick={() => setSelId(r.id)}>
                    <td><span style={sx('display:flex;flex-direction:column')}><span>{r.name}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{r.id}</span></span></td>
                    <td>{r.zone}</td><td><span className={r.cls}>{r.status}</span></td><td>{r.asg}</td><td className="mono">{r.h}</td><td className="mono">{r.perf}</td><td><span className={r.docCls}>{r.docs}</span></td>
                    <td><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={e => { e.stopPropagation(); setSelId(r.id) }}>Expediente</button></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin custodios {f === 'Todos' ? '' : 'con estatus “' + f + '” '}{nq ? 'que coincidan con “' + q.trim() + '” ' : ''}en esta vista.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card" aria-label="Expediente" style={sx('flex:1 1 320px;display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;gap:14px;align-items:center')}>
            <div style={sx('width:64px;height:64px;border-radius:10px;background:#FFF1DB;border:1px dashed #D5DBE3;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A')}>Foto</div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span style={sx('font-weight:600;font-size:18px')}>{sel.name}</span>
              <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{sel.id} · {sel.zone}</span>
              <span className={sel.cls} style={sx('align-self:flex-start')}>{sel.status}</span>
            </div>
          </div>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
            <div><dt className="lbl">Base</dt><dd style={sx('margin:4px 0 0')}>{sel.base}</dd></div>
            <div><dt className="lbl">Cobertura</dt><dd style={sx('margin:4px 0 0')}>{sel.zone}, Bajío</dd></div>
            <div><dt className="lbl">Ingreso</dt><dd style={sx('margin:4px 0 0')}>mar 2022</dd></div>
            <div><dt className="lbl">Desempeño</dt><dd style={sx('margin:4px 0 0')}>{sel.perf} / 5</dd></div>
          </dl>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Documentos y vigencias</span>
            {docs.map(d => (
              <div key={d.k} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4')}><span>{d.k}</span><span className={d.cls}>{d.v}</span></div>
            ))}
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Historial reciente</span>
            <span style={sx('font-size:14px;color:#3E4A59')}>SRV-24803 Marsh · en curso · 2 custodios</span>
            <span style={sx('font-size:14px;color:#3E4A59')}>SRV-24760 Alpura · entregado sin incidente</span>
            <span style={sx('font-size:14px;color:#3E4A59')}>SRV-24711 Orión · parada no autorizada (justificada)</span>
          </div>
        </aside>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Turnos · Centro · semana 41</h2>
          <div style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59;flex-wrap:wrap')}>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#3FA7C9')}></span>En servicio</span>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#CBD3DD')}></span>Descanso</span>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#4CC38A')}></span>Libre</span>
          </div>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:160px repeat(7,minmax(70px,1fr));gap:4px;min-width:720px;font-size:13px')}>
            <span></span><span className="lbl" style={sx('text-align:center')}>Lun 5</span><span className="lbl" style={sx('text-align:center')}>Mar 6</span><span className="lbl" style={sx('text-align:center')}>Mié 7</span><span className="lbl" style={sx('text-align:center')}>Jue 8</span><span className="lbl" style={sx('text-align:center')}>Vie 9</span><span className="lbl" style={sx('text-align:center')}>Sáb 10</span><span className="lbl" style={sx('text-align:center')}>Dom 11</span>
            {SHIFTS.map(s => [
              <span key={s.name} style={sx('display:flex;align-items:center')}>{s.name}</span>,
              ...s.days.map((d, j) => <span key={s.name + j} style={sx(d)}></span>),
            ])}
          </div>
        </div>
      </section>
    </Shell>
  )
}
