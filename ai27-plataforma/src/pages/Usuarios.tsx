import { useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { Field, Modal, btnPriStyle, btnStyle, inputStyle, useToast } from '../components/ui'
import { usuarios as USUARIOS_SEED, type Usuario } from '../data/usuarios'
import { descargar, toCSV } from '../data/rh'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-mute{background:#EBEEF2;color:#4A5868}.p-info{background:#E3F2F8;color:#0B6A8A}.p-bad{background:#FDE8E8;color:#B42318}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:8px 12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.btn-sm{min-height:32px;padding:0 10px;font-size:13px}
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
const DESC0: Record<string, string> = { 'Dirección': 'Acceso total con aprobación de tarifas, gastos y altas.', 'Operaciones': 'Coordina servicios y asignaciones; acepta o cambia la sugerencia de la IA.', 'Monitorista': 'Da seguimiento en vivo, registra bitácora y escala incidentes.', 'Reacción': 'Atiende incidentes, registra recuperación y evidencias.', 'Flotilla / Taller': 'Gestiona unidades, órdenes de taller y combustible.', 'RH': 'Reclutamiento, expedientes y datos sensibles de custodios.', 'Comercial': 'Cotiza, da seguimiento a leads y administra clientes.', 'Finanzas': 'Ingresos, cuentas por cobrar, gastos y rentabilidad.', 'Portal cliente': 'El cliente ve sus servicios en vivo y sus reportes.' }
const ZONAS = ['Todas las zonas', 'Centro', 'Bajío', 'Centro y Bajío', 'Noreste', 'Golfo', 'Occidente', 'Sureste', 'Noroeste']
const CLIENTES = ['Todos los clientes', 'Clientes asignados', 'Solo su empresa', 'Marsh', 'Autopartes Saltillo']
type Scope = { zone: string; client: string }
const INITIAL_SCOPE: Record<string, Scope> = Object.fromEntries(Object.keys(R).map(r => [r, { zone: r === 'Monitorista' ? 'Centro y Bajío' : 'Todas las zonas', client: r === 'Portal cliente' ? 'Solo su empresa' : 'Todos los clientes' }]))
type Audit = { t: string; who: string; what: string }
const AUDIT: Audit[] = [
  { t: '07 oct 14:02', who: 'Dirección · A. Gómez', what: 'Aprobó tarifa base Bajío: $28.50/km → $30.00/km' },
  { t: '07 oct 13:41', who: 'RH · K. May', what: 'Actualizó evaluación de confianza de C-1240' },
  { t: '07 oct 12:15', who: 'Operaciones · J. Pérez', what: 'Cambió sugerencia IA en SRV-24822 (C-0612 → C-0654)' },
  { t: '07 oct 11:58', who: 'Sistema', what: 'Alta de usuario portal cliente para Marsh' },
  { t: '06 oct 19:20', who: 'Finanzas · L. Cruz', what: 'Marcó factura F-9921 como cobrada' },
  { t: '06 oct 16:05', who: 'Monitorista · S. Campos', what: 'Escaló alerta de desvío en SRV-24817 a Reacción' },
  { t: '06 oct 10:48', who: 'Flotilla / Taller · R. Salas', what: 'Cerró orden OT-1188 (AU-1450, suspensión)' },
  { t: '05 oct 17:30', who: 'Comercial · A. Domínguez', what: 'Envió cotización COT-2291 a Farmacéutica Orión' },
  { t: '05 oct 09:02', who: 'Sistema', what: 'Respaldo diario completado · 1.8 GB' },
  { t: '04 oct 12:40', who: 'RH · K. May', what: 'Registró alta de C-1311 (Luis Canché)' },
]
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const stamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())} ${MES[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}` }
const actor = (who: string) => who.split(' · ')[0]
const ini = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('')

/** Lista legible de los cambios entre lo guardado y lo editado. */
function diff(saved: Perms, cur: Perms, savedScope: Record<string, Scope>, curScope: Record<string, Scope>): Audit[] {
  const out: Audit[] = []
  for (const role of Object.keys(cur)) {
    if (!saved[role]) continue
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
  const toast = useToast()
  const [role, setRole] = useState('Monitorista')
  const [perms, setPerms] = useState<Perms>(INITIAL)
  const [saved, setSaved] = useState<Perms>(INITIAL)
  const [scope, setScope] = useState(INITIAL_SCOPE)
  const [savedScope, setSavedScope] = useState(INITIAL_SCOPE)
  const [desc, setDesc] = useState(DESC0)
  const [audit, setAudit] = useState<Audit[]>(AUDIT)
  const [users, setUsers] = useState<Usuario[]>(USUARIOS_SEED)
  const [modal, setModal] = useState<null | 'invitar' | 'rol' | 'usuarios'>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [fActor, setFActor] = useState('Todos')
  const [fQ, setFQ] = useState('')
  const [uQ, setUQ] = useState('')

  const roles = Object.keys(perms)
  const counts = useMemo(() => Object.fromEntries(roles.map(r => [r, users.filter(u => u.rol === r && u.estatus !== 'Inactivo').length])), [roles, users])
  const changes = diff(saved, perms, savedScope, scope)
  const toggle = (i: number, j: number) => {
    const p = { ...perms }
    p[role] = p[role].map(r => r.slice())
    p[role][i][j] = !p[role][i][j]
    setPerms(p)
  }
  const setRoleScope = (k: keyof Scope, v: string) => setScope({ ...scope, [role]: { ...scope[role], [k]: v } })
  const guardar = () => {
    if (!changes.length) { toast('No hay cambios pendientes', 'info'); return }
    setAudit([...changes, ...audit])
    setSaved(perms)
    setSavedScope(scope)
    toast(`Permisos guardados · ${changes.length} ${changes.length === 1 ? 'rol actualizado' : 'roles actualizados'}`)
  }
  const descartar = () => { setPerms(saved); setScope(savedScope); toast('Cambios descartados', 'info') }
  const cur = scope[role]

  const open = (m: typeof modal, f: Record<string, string> = {}) => { setForm(f); setModal(m) }
  const F = (k: string) => form[k] ?? ''
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const invitar = () => {
    const nombre = F('nombre').trim(), correo = F('correo').trim()
    if (!nombre || !correo.includes('@')) { toast('Captura nombre y un correo válido', 'warn'); return }
    const rol = F('rol') || role
    const u: Usuario = { id: 'U-' + String(100 + users.length), nombre, correo, rol, zona: F('zona') || 'Todas las zonas', ultimoAcceso: 'sin acceso aún', estatus: 'Invitado' }
    setUsers(us => [u, ...us])
    setAudit(a => [{ t: stamp(), who: 'Dirección · Tú', what: `Invitó a ${nombre} (${correo}) con rol ${rol}` }, ...a])
    setModal(null); setRole(rol)
    toast(`Invitación enviada a ${correo} · rol ${rol}`)
  }
  const crearRol = () => {
    const nombre = F('nombre').trim()
    if (!nombre) { toast('Escribe el nombre del rol', 'warn'); return }
    if (perms[nombre]) { toast('Ya existe un rol con ese nombre', 'warn'); return }
    const base = F('base') || 'Monitorista'
    const p = perms[base].map(r => r.slice())
    setPerms({ ...perms, [nombre]: p }); setSaved({ ...saved, [nombre]: p })
    setScope({ ...scope, [nombre]: { ...scope[base] } }); setSavedScope({ ...savedScope, [nombre]: { ...scope[base] } })
    setDesc({ ...desc, [nombre]: F('desc').trim() || `Rol basado en ${base}.` })
    setAudit(a => [{ t: stamp(), who: 'Dirección · Tú', what: `Creó el rol ${nombre} a partir de ${base}` }, ...a])
    setRole(nombre); setModal(null)
    toast(`Rol "${nombre}" creado · ajusta sus permisos y guarda`)
  }
  const toggleUser = (u: Usuario) => {
    const next: Usuario['estatus'] = u.estatus === 'Inactivo' ? 'Activo' : 'Inactivo'
    setUsers(us => us.map(x => (x.id === u.id ? { ...x, estatus: next } : x)))
    setAudit(a => [{ t: stamp(), who: 'Dirección · Tú', what: `${next === 'Inactivo' ? 'Desactivó' : 'Reactivó'} al usuario ${u.nombre} (${u.rol})` }, ...a])
    toast(`${u.nombre} ${next === 'Inactivo' ? 'desactivado' : 'reactivado'}`, next === 'Inactivo' ? 'warn' : 'ok')
  }
  const reenviar = (u: Usuario) => { setAudit(a => [{ t: stamp(), who: 'Sistema', what: `Reenvió invitación a ${u.correo}` }, ...a]); toast(`Invitación reenviada a ${u.correo}`) }

  const actores = ['Todos', ...Array.from(new Set(audit.map(a => actor(a.who))))]
  const fq = fQ.trim().toLowerCase()
  const auditView = audit.filter(a => (fActor === 'Todos' || actor(a.who) === fActor) && (!fq || (a.who + ' ' + a.what + ' ' + a.t).toLowerCase().includes(fq)))
  const exportar = () => { descargar('bitacora-auditoria.csv', toCSV([['Fecha', 'Quién', 'Qué'], ...auditView.map(a => [a.t, a.who, a.what])])); toast(`Bitácora exportada · ${auditView.length} eventos (CSV)`) }

  const uq = uQ.trim().toLowerCase()
  const usersRol = users.filter(u => u.rol === role && (!uq || (u.nombre + ' ' + u.correo + ' ' + u.zona).toLowerCase().includes(uq)))
  const activos = users.filter(u => u.estatus !== 'Inactivo').length

  return (
    <Shell active="usuarios" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Administración</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Usuarios y roles</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>{activos} usuarios · {roles.length} roles · permisos por módulo, acción, zona y cliente</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap;align-items:center')}>
          {changes.length > 0 && <button type="button" className="pill p-warn" onClick={descartar} title="Descartar cambios" style={sx('border:0;cursor:pointer;font-family:inherit')}>{changes.length} {changes.length === 1 ? 'rol con cambios' : 'roles con cambios'} sin guardar · descartar</button>}
          <button type="button" className="btn" onClick={() => open('rol', { base: role })}>Nuevo rol</button>
          <button type="button" className="btn" onClick={() => open('invitar', { rol: role, zona: scope[role].zone })}>Invitar usuario</button>
          <button type="button" className="btn btn-pri" onClick={guardar}>Guardar cambios</button>
        </div>
      </header>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <nav aria-label="Roles" className="card" style={sx('flex:1 1 240px;padding:10px;display:flex;flex-direction:column;gap:4px')}>
          {roles.map(name => (
            <button key={name} type="button" aria-current={name === role ? 'true' : undefined} onClick={() => setRole(name)}
              style={sx("display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 12px;border-radius:8px;border:0;cursor:pointer;font:500 14px 'IBM Plex Sans',sans-serif;text-align:left;" + (name === role ? 'background:#FFF1DB;color:#8A5300' : 'background:transparent;color:#2A3442'))}>
              <span>{name}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{counts[name]}</span>
            </button>
          ))}
        </nav>

        <section className="card" style={sx('flex:999 1 560px;display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:20px;font-weight:600")}>{role}</h2>
              <span style={sx('font-size:13px;color:#5F6B7A')}>{desc[role]} <button type="button" onClick={() => { setUQ(''); setModal('usuarios') }} style={sx('background:none;border:0;padding:0;cursor:pointer;color:#B36B00;font:inherit;text-decoration:underline')}>Ver {counts[role]} {counts[role] === 1 ? 'usuario' : 'usuarios'}</button></span>
            </div>
            <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
              <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Alcance por zona<select style={sx(SEL)} value={cur.zone} onChange={e => setRoleScope('zone', e.target.value)}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></label>
              <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#5F6B7A')}>Alcance por cliente<select style={sx(SEL)} value={cur.client} onChange={e => setRoleScope('client', e.target.value)}>{CLIENTES.map(c => <option key={c}>{c}</option>)}</select></label>
            </div>
          </div>
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr><th>Módulo</th>{ACTS.map((a, j) => <th key={a} style={sx('text-align:center;cursor:pointer')} title={`Marcar/desmarcar “${a}” en todos los módulos`} onClick={() => { const all = perms[role].every(r => r[j]); const p = { ...perms, [role]: perms[role].map(r => { const c = r.slice(); c[j] = !all; return c }) }; setPerms(p) }}>{a}</th>)}</tr></thead>
              <tbody>
                {MODS.map((mod, i) => (
                  <tr key={mod}><td style={sx('cursor:pointer')} title="Marcar/desmarcar toda la fila" onClick={() => { const all = perms[role][i].every(Boolean); const p = { ...perms, [role]: perms[role].map((r, k) => (k === i ? r.map(() => !all) : r)) }; setPerms(p) }}>{mod}</td>
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
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0 0 4px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Bitácora de auditoría</h2>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
            <label style={sx('display:flex')}><span style={sx(SR)}>Buscar en bitácora</span><input type="search" placeholder="Buscar en la bitácora" value={fQ} onChange={e => setFQ(e.target.value)} style={sx(SEL + ';min-width:220px')} /></label>
            <label style={sx('display:flex')}><span style={sx(SR)}>Filtrar por actor</span><select style={sx(SEL)} value={fActor} onChange={e => setFActor(e.target.value)}>{actores.map(a => <option key={a}>{a}</option>)}</select></label>
            <button type="button" className="btn" onClick={exportar}>Exportar</button>
          </div>
        </div>
        {auditView.length === 0 && <span style={sx('font-size:14px;color:#5F6B7A;padding:8px 0;border-top:1px solid #EEF1F4')}>Sin eventos para ese filtro.</span>}
        {auditView.map((a, k) => (
          <div key={a.t + a.what + k} style={sx('display:grid;grid-template-columns:140px 180px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
            <span className="mono" style={sx('color:#5F6B7A;font-size:13px')}>{a.t}</span><span>{a.who}</span><span style={sx('color:#3E4A59')}>{a.what}</span>
          </div>
        ))}
        <span style={sx('font-size:12px;color:#5F6B7A')}>{auditView.length} de {audit.length} eventos</span>
      </section>

      <Modal open={modal === 'invitar'} onClose={() => setModal(null)} title="Invitar usuario" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={invitar}>Enviar invitación</button></>}>
        <Field label="Nombre completo"><input style={sx(inputStyle)} value={F('nombre')} onChange={set('nombre')} placeholder="Ej. Sofía Campos" autoFocus /></Field>
        <Field label="Correo"><input type="email" style={sx(inputStyle)} value={F('correo')} onChange={set('correo')} placeholder="nombre@ai27.mx" /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Rol"><select style={sx(inputStyle)} value={F('rol')} onChange={set('rol')}>{roles.map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Zona"><select style={sx(inputStyle)} value={F('zona')} onChange={set('zona')}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></Field>
        </div>
        <span style={sx('font-size:13px;color:#5F6B7A')}>Recibe un correo con liga de acceso válida 48 horas. Hereda los permisos del rol.</span>
      </Modal>

      <Modal open={modal === 'rol'} onClose={() => setModal(null)} title="Nuevo rol" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setModal(null)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={crearRol}>Crear rol</button></>}>
        <Field label="Nombre del rol"><input style={sx(inputStyle)} value={F('nombre')} onChange={set('nombre')} placeholder="Ej. Supervisor de monitoreo" autoFocus /></Field>
        <Field label="Copiar permisos de"><select style={sx(inputStyle)} value={F('base')} onChange={set('base')}>{roles.map(r => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Descripción"><textarea rows={2} style={sx(inputStyle + ';padding:10px 12px;min-height:60px')} value={F('desc')} onChange={set('desc')} placeholder="Qué puede hacer este rol" /></Field>
      </Modal>

      <Modal open={modal === 'usuarios'} onClose={() => setModal(null)} title={`Usuarios con rol ${role}`} width={720} footer={<><button type="button" style={sx(btnStyle)} onClick={() => { setModal(null); open('invitar', { rol: role, zona: scope[role].zone }) }}>Invitar usuario</button><button type="button" style={sx(btnPriStyle)} onClick={() => setModal(null)}>Listo</button></>}>
        <label style={sx('display:flex')}><span style={sx(SR)}>Buscar usuario</span><input type="search" placeholder="Buscar por nombre, correo o zona" value={uQ} onChange={e => setUQ(e.target.value)} style={sx(inputStyle)} /></label>
        <div style={sx('overflow-x:auto')}>
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Correo</th><th>Zona / cliente</th><th>Último acceso</th><th>Estatus</th><th></th></tr></thead>
            <tbody>
              {usersRol.map(u => (
                <tr key={u.id}>
                  <td><span style={sx('display:flex;gap:8px;align-items:center')}><span style={sx('width:28px;height:28px;border-radius:50%;background:#6A5ACD;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600')}>{ini(u.nombre)}</span>{u.nombre}</span></td>
                  <td className="mono" style={sx('font-size:13px')}>{u.correo}</td><td>{u.zona}</td><td className="mono" style={sx('font-size:13px')}>{u.ultimoAcceso}</td>
                  <td><span className={'pill ' + (u.estatus === 'Activo' ? 'p-ok' : u.estatus === 'Invitado' ? 'p-info' : 'p-mute')}>{u.estatus}</span></td>
                  <td><span style={sx('display:flex;gap:6px')}>{u.estatus === 'Invitado' && <button type="button" className="btn btn-sm" onClick={() => reenviar(u)}>Reenviar</button>}<button type="button" className="btn btn-sm" onClick={() => toggleUser(u)}>{u.estatus === 'Inactivo' ? 'Reactivar' : 'Desactivar'}</button></span></td>
                </tr>
              ))}
              {usersRol.length === 0 && <tr><td colSpan={6} style={sx('color:#5F6B7A')}>Sin usuarios con ese criterio.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>
    </Shell>
  )
}
