import { useState } from 'react'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-mute{background:#EBEEF2;color:#4A5868}.p-info{background:#E3F2F8;color:#0B6A8A}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:8px 12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
`

const SR = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'
const SEL = "min-height:40px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif"

const MODS = ['Dashboard', 'Servicios', 'Asignación IA', 'Monitoreo', 'Reacción', 'Custodios (datos sensibles)', 'Flotilla y taller', 'Cotizador', 'CRM', 'RH', 'Finanzas', 'Usuarios y roles']
const ACTS = ['Ver', 'Crear', 'Editar', 'Aprobar']
const R: Record<string, string[]> = {
  'Dirección':        ['1111', '1111', '1111', '1111', '1111', '1001', '1001', '1111', '1111', '1001', '1111', '1111'],
  'Operaciones':      ['1000', '1111', '1111', '1110', '1110', '1010', '1000', '1000', '1000', '0000', '0000', '0000'],
  'Monitorista':      ['0000', '1010', '0000', '1110', '1100', '1000', '1000', '0000', '0000', '0000', '0000', '0000'],
  'Reacción':         ['0000', '1000', '0000', '1000', '1111', '1000', '0000', '0000', '0000', '0000', '0000', '0000'],
  'Flotilla / Taller':['0000', '1000', '0000', '1000', '0000', '0000', '1111', '0000', '0000', '0000', '1000', '0000'],
  'RH':               ['0000', '0000', '0000', '0000', '0000', '1111', '0000', '0000', '0000', '1111', '0000', '0000'],
  'Comercial':        ['1000', '1100', '0000', '0000', '0000', '0000', '0000', '1111', '1111', '0000', '1000', '0000'],
  'Finanzas':         ['1000', '1000', '0000', '0000', '1000', '0000', '1000', '1000', '1000', '0000', '1111', '0000'],
  'Portal cliente':   ['0000', '1000', '0000', '1000', '1000', '0000', '0000', '0000', '0000', '0000', '0000', '0000'],
}
type Perms = Record<string, boolean[][]>
const INITIAL: Perms = Object.fromEntries(Object.entries(R).map(([k, rows]) => [k, rows.map(s => s.split('').map(c => c === '1'))]))
const COUNTS: Record<string, number> = { 'Dirección': 4, 'Operaciones': 9, 'Monitorista': 18, 'Reacción': 6, 'Flotilla / Taller': 5, 'RH': 4, 'Comercial': 5, 'Finanzas': 4, 'Portal cliente': 3 }
const DESC: Record<string, string> = { 'Dirección': 'Acceso total con aprobación de tarifas, gastos y altas.', 'Operaciones': 'Coordina servicios y asignaciones; acepta o cambia la sugerencia de la IA.', 'Monitorista': 'Da seguimiento en vivo, registra bitácora y escala incidentes.', 'Reacción': 'Atiende incidentes, registra recuperación y evidencias.', 'Flotilla / Taller': 'Gestiona unidades, órdenes de taller y combustible.', 'RH': 'Reclutamiento, expedientes y datos sensibles de custodios.', 'Comercial': 'Cotiza, da seguimiento a leads y administra clientes.', 'Finanzas': 'Ingresos, cuentas por cobrar, gastos y rentabilidad.', 'Portal cliente': 'El cliente ve sus servicios en vivo y sus reportes.' }
const ZONAS = ['Todas las zonas', 'Centro', 'Bajío', 'Centro y Bajío', 'Noreste', 'Golfo', 'Occidente']
const CLIENTES = ['Todos los clientes', 'Clientes asignados', 'Solo su empresa', 'Marsh', 'Autopartes Saltillo']
type Scope = { zone: string; client: string }
const INITIAL_SCOPE: Record<string, Scope> = Object.fromEntries(Object.keys(COUNTS).map(r => [r, { zone: r === 'Monitorista' ? 'Centro y Bajío' : 'Todas las zonas', client: r === 'Portal cliente' ? 'Solo su empresa' : 'Todos los clientes' }]))
type Audit = { t: string; who: string; what: string }
const AUDIT: Audit[] = [
  { t: '07 oct 14:02', who: 'Dirección · A. Gómez', what: 'Aprobó tarifa base Bajío: $28.50/km → $30.00/km' },
  { t: '07 oct 13:41', who: 'RH · K. May', what: 'Actualizó evaluación de confianza de C-1240' },
  { t: '07 oct 12:15', who: 'Operaciones · J. Pérez', what: 'Cambió sugerencia IA en SRV-24822 (C-0612 → C-0654)' },
  { t: '07 oct 11:58', who: 'Sistema', what: 'Alta de usuario portal cliente para Marsh' },
  { t: '06 oct 19:20', who: 'Finanzas · L. Cruz', what: 'Marcó factura F-9921 como cobrada' },
]
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const stamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())} ${MES[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}` }

/** Lista legible de los cambios entre lo guardado y lo editado. */
function diff(saved: Perms, cur: Perms, savedScope: Record<string, Scope>, curScope: Record<string, Scope>): Audit[] {
  const out: Audit[] = []
  for (const role of Object.keys(cur)) {
    const plus: string[] = [], minus: string[] = []
    cur[role].forEach((row, i) => row.forEach((on, j) => {
      if (on !== saved[role][i][j]) (on ? plus : minus).push(`${ACTS[j]} ${MODS[i]}`)
    }))
    const parts: string[] = []
    if (plus.length) parts.push('otorgó ' + plus.join(', '))
    if (minus.length) parts.push('retiró ' + minus.join(', '))
    if (curScope[role].zone !== savedScope[role].zone) parts.push(`zona: ${savedScope[role].zone} → ${curScope[role].zone}`)
    if (curScope[role].client !== savedScope[role].client) parts.push(`cliente: ${savedScope[role].client} → ${curScope[role].client}`)
    if (parts.length) out.push({ t: stamp(), who: 'Dirección · Tú', what: `Rol ${role}: ` + parts.join(' · ') })
  }
  return out
}

export default function Usuarios() {
  const [role, setRole] = useState('Monitorista')
  const [perms, setPerms] = useState<Perms>(INITIAL)
  const [saved, setSaved] = useState<Perms>(INITIAL)
  const [scope, setScope] = useState(INITIAL_SCOPE)
  const [savedScope, setSavedScope] = useState(INITIAL_SCOPE)
  const [audit, setAudit] = useState<Audit[]>(AUDIT)

  const changes = diff(saved, perms, savedScope, scope)
  const toggle = (i: number, j: number) => {
    const p = { ...perms }
    p[role] = p[role].map(r => r.slice())
    p[role][i][j] = !p[role][i][j]
    setPerms(p)
  }
  const setRoleScope = (k: keyof Scope, v: string) => setScope({ ...scope, [role]: { ...scope[role], [k]: v } })
  const guardar = () => {
    if (!changes.length) return
    setAudit([...changes, ...audit])
    setSaved(perms)
    setSavedScope(scope)
  }
  const cur = scope[role]

  return (
    <Shell active="usuarios" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Administración</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Usuarios y roles</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>58 usuarios · 9 roles · permisos por módulo, acción, zona y cliente</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap;align-items:center')}>
          {changes.length > 0 && <span className="pill p-warn">{changes.length} {changes.length === 1 ? 'rol con cambios' : 'roles con cambios'} sin guardar</span>}
          <button type="button" className="btn">Invitar usuario</button>
          <button type="button" className="btn btn-pri" onClick={guardar}>Guardar cambios</button>
        </div>
      </header>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <nav aria-label="Roles" className="card" style={sx('flex:1 1 240px;padding:10px;display:flex;flex-direction:column;gap:4px')}>
          {Object.keys(COUNTS).map(name => (
            <button key={name} type="button" aria-current={name === role ? 'true' : undefined} onClick={() => setRole(name)}
              style={sx("display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 12px;border-radius:8px;border:0;cursor:pointer;font:500 14px 'IBM Plex Sans',sans-serif;text-align:left;" + (name === role ? 'background:#FFF1DB;color:#8A5300' : 'background:transparent;color:#2A3442'))}>
              <span>{name}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{COUNTS[name]}</span>
            </button>
          ))}
        </nav>

        <section className="card" style={sx('flex:999 1 560px;display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:20px;font-weight:600")}>{role}</h2>
              <span style={sx('font-size:13px;color:#5F6B7A')}>{DESC[role]}</span>
            </div>
            <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
              <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Alcance por zona<select style={sx(SEL)} value={cur.zone} onChange={e => setRoleScope('zone', e.target.value)}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></label>
              <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Alcance por cliente<select style={sx(SEL)} value={cur.client} onChange={e => setRoleScope('client', e.target.value)}>{CLIENTES.map(c => <option key={c}>{c}</option>)}</select></label>
            </div>
          </div>
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr><th>Módulo</th>{ACTS.map(a => <th key={a} style={sx('text-align:center')}>{a}</th>)}</tr></thead>
              <tbody>
                {MODS.map((mod, i) => (
                  <tr key={mod}><td>{mod}</td>
                    {ACTS.map((a, j) => (
                      <td key={a} style={sx('text-align:center')}><label style={sx('display:inline-flex;min-width:44px;min-height:36px;align-items:center;justify-content:center;cursor:pointer')}><span style={sx(SR)}>{a + ' ' + mod}</span><input type="checkbox" checked={perms[role][i][j]} onChange={() => toggle(i, j)} style={sx('width:18px;height:18px;accent-color:#F2A93B')} /></label></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:10px')}>
        <h2 style={sx("margin:0 0 4px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Bitácora de auditoría</h2>
        {audit.map((a, k) => (
          <div key={audit.length - k} style={sx('display:grid;grid-template-columns:140px 160px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
            <span className="mono" style={sx('color:#5F6B7A;font-size:13px')}>{a.t}</span><span>{a.who}</span><span style={sx('color:#3E4A59')}>{a.what}</span>
          </div>
        ))}
      </section>
    </Shell>
  )
}
