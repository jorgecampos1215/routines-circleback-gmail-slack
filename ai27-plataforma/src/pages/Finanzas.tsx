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
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.k{font-family:'Archivo',sans-serif;font-size:26px;font-weight:600}
`

type By = 'cli' | 'srv' | 'uni'
type Row = [string, number, number]

const D: Record<By, [string, Row[]]> = {
  cli: ['Cliente', [['Alpura', 5.05, 3.13], ['Marsh', 3.85, 2.54], ['Farmacéutica Orión', 3.03, 2.15], ['Autopartes Saltillo', 2.26, 1.56], ['Electrónica del Bajío', 1.92, 1.29], ['Bebidas del Golfo', 1.10, 0.80]]],
  srv: ['Tipo de servicio', [['Por evento', 6.1, 4.05], ['Dedicado', 5.4, 3.89], ['Monitoreo', 2.6, 1.53]]],
  uni: ['Unidad', [['AU-3321', 0.41, 0.24], ['AU-1876', 0.38, 0.29], ['AU-2214', 0.35, 0.22], ['AU-2087', 0.29, 0.20], ['AU-1450', 0.12, 0.13]]],
}
const TABS: [By, string][] = [['cli', 'Por cliente'], ['srv', 'Por servicio'], ['uni', 'Por unidad']]

const EXP: [string, number][] = [['Nómina operativa', 4.9], ['Combustible', 1.8], ['Taller', 0.9], ['Viáticos', 0.8], ['Casetas', 0.7], ['Seguros', 0.6]]

const INV = [
  { id: 'F-9934', c: 'Alpura · septiembre', v: '$1.84M', s: 'Registrada', cls: 'pill p-mute' },
  { id: 'F-9921', c: 'Marsh · eventos', v: '$0.96M', s: 'Cobrada', cls: 'pill p-ok' },
  { id: 'F-9887', c: 'Farmacéutica Orión', v: '$1.12M', s: '45 días', cls: 'pill p-warn' },
  { id: 'F-9810', c: 'Bebidas del Golfo', v: '$0.62M', s: '74 días', cls: 'pill p-bad' },
  { id: 'F-9795', c: 'Grupo Textil Arrayán', v: '$0.48M', s: '81 días', cls: 'pill p-bad' },
]

const fmt = (n: number) => '$' + (n / 1e6).toFixed(2) + 'M'

function rowsFor(by: By) {
  return D[by][1].map(([n, r, c]) => {
    const m = r - c, p = m / r
    return {
      n, rev: fmt(r * 1e6), cost: fmt(c * 1e6), m: fmt(m * 1e6), pct: Math.round(p * 100) + '%',
      bar: 'height:100%;width:' + Math.max(2, Math.round(p * 100 / 0.45)) + '%;max-width:100%;background:' + (p < 0 ? '#F0605D' : p < 0.3 ? '#F2A93B' : '#4CC38A'),
    }
  })
}

/** Genera un CSV (separador coma, BOM para que Excel respete acentos) y lo descarga en el navegador. */
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportExcel() {
  const out: (string | number)[][] = [
    ['AI27 · Finanzas · septiembre 2026'], [],
    ['KPI', 'Valor', 'Nota'],
    ['Ingresos', '$14.1M', '+3.7% vs agosto'], ['Gastos', '$9.7M', '69% de ingresos'], ['Margen operativo', '31%', '$4.4M'],
    ['Cuentas por cobrar', '$18.2M', '$3.1M a más de 60 días'], ['Días de cobro', 38, 'meta 30'],
  ]
  for (const [by, label] of TABS) {
    out.push([], ['Rentabilidad ' + label.toLowerCase()], [D[by][0], 'Ingresos', 'Costo directo', 'Margen', '% margen'])
    rowsFor(by).forEach(r => out.push([r.n, r.rev, r.cost, r.m, r.pct]))
  }
  out.push([], ['Gastos por categoría'], ['Categoría', 'Monto'])
  EXP.forEach(([k, v]) => out.push([k, '$' + v.toFixed(1) + 'M']))
  out.push([], ['Cuentas por cobrar · antigüedad'], ['Al corriente', '1–30 d', '31–60 d', '+60 d'], ['$9.8M', '$3.6M', '$1.7M', '$3.1M'])
  out.push([], ['Factura', 'Concepto', 'Monto', 'Estatus'])
  INV.forEach(i => out.push([i.id, i.c, i.v, i.s]))
  downloadCSV('AI27_Finanzas_sep2026.csv', out)
}

export default function Finanzas() {
  const [by, setBy] = useState<By>('cli')
  const firstCol = D[by][0]
  const rows = rowsFor(by)

  return (
    <Shell active="finanzas" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">ERP ligero · septiembre 2026</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Finanzas</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>Registro de facturación sin timbrado CFDI en el demo</span>
        </div>
        <button type="button" className="btn" onClick={exportExcel}>Exportar a Excel</button>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · proyección de cobranza</span><span style={sx('font-size:14px;color:#3E4A59')}>Con el historial de pago de cada cliente, se esperan cobrar $7.9M en octubre. Bebidas del Golfo y Grupo Textil Arrayán concentran 71% del riesgo a más de 60 días: sugiero condicionar nuevos servicios a pago.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Cobranza acumulada proyectada por semana de octubre: 1.8, 3.9, 5.6 y 7.9 millones" style={sx('display:block')}><g><rect x="8" y="49" width="40" height="11" rx="2" fill="#2B9A66"></rect><rect x="60" y="36.3" width="40" height="23.7" rx="2" fill="#2B9A66"></rect><rect x="112" y="26" width="40" height="34" rx="2" fill="#9FD6BB"></rect><rect x="164" y="12" width="40" height="48" rx="2" fill="#9FD6BB"></rect></g><text x="166" y="9" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#17784A">$7.9M</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Cobranza acumulada de octubre · claro: proyectado</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsistenteIA}>Preguntarle a la IA</Link>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr));gap:12px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Ingresos</span><span className="k">$14.1M</span><span style={sx('font-size:13px;color:#17784A')}>+3.7% vs agosto</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Gastos</span><span className="k">$9.7M</span><span style={sx('font-size:13px;color:#5F6B7A')}>69% de ingresos</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Margen operativo</span><span className="k">31%</span><span style={sx('font-size:13px;color:#5F6B7A')}>$4.4M</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Cuentas por cobrar</span><span className="k">$18.2M</span><span style={sx('font-size:13px;color:#B42318')}>$3.1M a más de 60 días</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px')}><span className="lbl">Días de cobro</span><span className="k">38</span><span style={sx('font-size:13px;color:#5F6B7A')}>meta 30</span></div>
      </section>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Rentabilidad</h2>
          <div role="tablist" aria-label="Agrupar por" style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
            {TABS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={k === by} className="btn" style={sx(k === by ? 'background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : '')} onClick={() => setBy(k)}>{label}</button>
            ))}
          </div>
        </div>
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr><th>{firstCol}</th><th>Ingresos</th><th>Costo directo</th><th>Margen</th><th style={sx('min-width:200px')}>% margen</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.n}><td>{r.n}</td><td className="mono">{r.rev}</td><td className="mono">{r.cost}</td><td className="mono">{r.m}</td>
                  <td><div style={sx('display:flex;align-items:center;gap:10px')}><div style={sx('flex:1;height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(r.bar)}></div></div><span className="mono" style={sx('font-size:13px;min-width:40px;text-align:right')}>{r.pct}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr));gap:16px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
          <h2 style={sx("margin:0 0 4px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Gastos por categoría</h2>
          {EXP.map(([k, v]) => (
            <div key={k} style={sx('display:grid;grid-template-columns:150px minmax(0,1fr) 80px;gap:12px;align-items:center;font-size:14px')}>
              <span>{k}</span><div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.round(v / 4.9 * 100) + '%;background:#3FA7C9')}></div></div><span className="mono" style={sx('text-align:right')}>{'$' + v.toFixed(1) + 'M'}</span>
            </div>
          ))}
        </div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
          <h2 style={sx("margin:0 0 4px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Cuentas por cobrar</h2>
          <div style={sx('display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px')}>
            <div style={sx('background:#F3F5F8;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('font-size:12px;color:#5F6B7A')}>Al corriente</span><span className="mono">$9.8M</span></div>
            <div style={sx('background:#F3F5F8;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('font-size:12px;color:#5F6B7A')}>1–30 d</span><span className="mono">$3.6M</span></div>
            <div style={sx('background:#F3F5F8;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('font-size:12px;color:#5F6B7A')}>31–60 d</span><span className="mono">$1.7M</span></div>
            <div style={sx('background:#FDECEC;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:2px')}><span style={sx('font-size:12px;color:#B42318')}>+60 d</span><span className="mono">$3.1M</span></div>
          </div>
          {INV.map(i => (
            <div key={i.id} style={sx('display:grid;grid-template-columns:90px minmax(0,1fr) 100px auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
              <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{i.id}</span><span>{i.c}</span><span className="mono" style={sx('text-align:right')}>{i.v}</span><span className={i.cls}>{i.s}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  )
}
