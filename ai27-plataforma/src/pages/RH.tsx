import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { sx } from '../lib/sx'
import { ROUTES } from '../lib/routes'
import { useStore, actions, type SolicitudVacaciones } from '../lib/store'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EEF1F4;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl td{padding:12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#FFFFFF;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.k{font-family:'Archivo',sans-serif;font-size:26px;font-weight:600}
.sel{min-height:40px;background:#FFFFFF;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif}
`

const SR = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'

const areaColor: Record<string, string> = { 'Custodia': '#2B7FA8', 'Monitoreo': '#6A5ACD', 'Reacción': '#C0492F', 'Operaciones': '#B36B00', 'Flotilla y taller': '#4A5868', 'Comercial': '#2B9A66', 'Finanzas': '#8A4FA0', 'RH': '#D08A1C', 'Dirección': '#121821' }
const st: Record<string, string> = { 'Activo': 'pill p-ok', 'Vacaciones': 'pill p-info', 'Incapacidad': 'pill p-warn', 'Onboarding': 'pill p-warn', 'Baja en proceso': 'pill p-bad' }

type Persona = { name: string; role: string; area: string; site: string; status: string; id: string; since: string; tenure: string; boss: string; pay: string; vac: [number, number]; payHist: [string, string, string][]; hist: [string, string][] }

const P: Persona[] = [
  { name: 'Karla May', role: 'Gerente de RH', area: 'RH', site: 'Cuautitlán', status: 'Activo', id: 'E-0042', since: 'feb 2019', tenure: '7 años 8 meses', boss: 'Dirección general', pay: '$42,000', vac: [10, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$42,000'], ['ene 2025', 'Ajuste anual', '$39,500'], ['jun 2023', 'Promoción', '$36,000']], hist: [['feb 2019', 'Ingreso como Coordinadora de reclutamiento'], ['jun 2023', 'Promoción a Gerente de RH'], ['mar 2026', 'Evaluación anual: sobresaliente']] },
  { name: 'Luis Herrera', role: 'Monitorista Sr', area: 'Monitoreo', site: 'Cuautitlán', status: 'Activo', id: 'E-0188', since: 'may 2021', tenure: '5 años 5 meses', boss: 'Jorge Pérez', pay: '$16,000', vac: [4, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$16,000'], ['ago 2024', 'Promoción a Sr', '$15,000']], hist: [['may 2021', 'Ingreso como Monitorista'], ['ago 2024', 'Promoción a Monitorista Sr'], ['oct 2026', 'Atendió INC-0412 (recuperación total)']] },
  { name: 'Raúl Medina', role: 'Custodio armado', area: 'Custodia', site: 'Cuautitlán', status: 'Activo', id: 'C-1043', since: 'mar 2022', tenure: '4 años 7 meses', boss: 'Jorge Pérez', pay: '$14,500', vac: [6, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$14,500'], ['ene 2025', 'Ajuste anual', '$13,800']], hist: [['mar 2022', 'Ingreso como Custodio'], ['nov 2024', 'Certificación carga de alto valor'], ['oct 2026', 'Incidente INC-0412 · actuación correcta']] },
  { name: 'Gabriel Pacheco', role: 'Jefe de reacción', area: 'Reacción', site: 'Querétaro', status: 'Activo', id: 'E-0071', since: 'ago 2018', tenure: '8 años 2 meses', boss: 'Dirección de operaciones', pay: '$32,000', vac: [12, 18],
    payHist: [['ene 2026', 'Ajuste anual', '$32,000'], ['ene 2025', 'Ajuste anual', '$30,500']], hist: [['ago 2018', 'Ingreso como elemento de reacción'], ['jan 2022', 'Promoción a Jefe de reacción'], ['oct 2026', '3 recuperaciones totales en el trimestre']] },
  { name: 'Laura Cruz', role: 'Contadora general', area: 'Finanzas', site: 'Cuautitlán', status: 'Vacaciones', id: 'E-0103', since: 'oct 2020', tenure: '6 años', boss: 'Dirección general', pay: '$38,000', vac: [11, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$38,000']], hist: [['oct 2020', 'Ingreso como Contadora'], ['jan 2024', 'Promoción a Contadora general']] },
  { name: 'Jorge Pérez', role: 'Coordinador de operaciones', area: 'Operaciones', site: 'Cuautitlán', status: 'Activo', id: 'E-0095', since: 'jul 2020', tenure: '6 años 3 meses', boss: 'Dirección de operaciones', pay: '$35,000', vac: [8, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$35,000']], hist: [['jul 2020', 'Ingreso como Monitorista'], ['sep 2023', 'Promoción a Coordinador']] },
  { name: 'Ana Domínguez', role: 'Ejecutiva comercial', area: 'Comercial', site: 'Monterrey', status: 'Activo', id: 'E-0211', since: 'ene 2023', tenure: '3 años 9 meses', boss: 'Dirección comercial', pay: '$22,000 + comisión', vac: [5, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$22,000']], hist: [['ene 2023', 'Ingreso'], ['dic 2025', 'Cerró renovación Autopartes Saltillo']] },
  { name: 'Ricardo Salas', role: 'Jefe de taller', area: 'Flotilla y taller', site: 'Cuautitlán', status: 'Activo', id: 'E-0150', since: 'abr 2021', tenure: '5 años 6 meses', boss: 'Dirección de operaciones', pay: '$26,000', vac: [7, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$26,000']], hist: [['abr 2021', 'Ingreso como Mecánico'], ['feb 2024', 'Promoción a Jefe de taller']] },
  { name: 'Luis Canché', role: 'Custodio', area: 'Custodia', site: 'Querétaro', status: 'Onboarding', id: 'C-1311', since: 'oct 2026', tenure: '1 semana', boss: 'Jorge Pérez', pay: '$13,800', vac: [0, 12],
    payHist: [['oct 2026', 'Contratación', '$13,800']], hist: [['oct 2026', 'Ingreso · onboarding en curso']] },
  { name: 'Daniel Soto', role: 'Custodio armado', area: 'Custodia', site: 'Monterrey', status: 'Incapacidad', id: 'C-0566', since: 'jun 2019', tenure: '7 años 4 meses', boss: 'Coordinación Noreste', pay: '$14,500', vac: [9, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$14,500']], hist: [['jun 2019', 'Ingreso como Custodio'], ['sep 2026', 'Incapacidad registrada']] },
]

const ini = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('')
const av = (a: string, size: number) => 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:600;font-size:' + Math.round(size * 0.36) + 'px;background:' + (areaColor[a] ?? '#4A5868')

const TABS: [string, string][] = [['dir', 'Directorio'], ['mov', 'Altas y bajas'], ['on', 'Onboarding'], ['off', 'Offboarding'], ['vac', 'Vacaciones'], ['rec', 'Reclutamiento']]
const LABELS = ['Expediente digital y contrato', 'Pruebas de confianza registradas', 'Capacitación en protocolo de custodia', 'Uniforme, radio y equipo', 'Alta en nómina e IMSS', 'Alta en Samsara y en la plataforma', 'Asignación de unidad']
const V: [string, string, string, string, boolean?][] = [['Laura Cruz', 'Contadora general', '6–17 oct · 10 días', 'Cubre: Pedro Ruiz', true], ['Iván Cetina', 'Custodio · Centro', '20–24 oct · 5 días', 'Sin impacto: Centro +9'], ['Marco Ríos', 'Custodio · Bajío', '13–17 oct · 5 días', 'Bajío queda −7'], ['Sofía Campos', 'Monitorista', '27–31 oct · 5 días', 'Cubre: M. Quintal'], ['Ana Domínguez', 'Ejecutiva comercial', '3–7 nov · 5 días', 'Sin impacto']]

const MONTHS: [string, number, number][] = [['Abr', 9, 4], ['May', 11, 6], ['Jun', 10, 6], ['Jul', 12, 8], ['Ago', 15, 8], ['Sep', 14, 9]]
const AREAS: [string, number][] = [['Custodia', 400], ['Monitoreo', 24], ['Operaciones', 14], ['Flotilla y taller', 13], ['Reacción', 12], ['Finanzas', 8], ['Comercial', 7], ['RH', 5], ['Dirección', 3]]
const MOVES = [
  ['06 oct', 'Luis Canché', 'Custodio', 'Custodia', 'Alta', 'Vacante VAC-118 Bajío'], ['03 oct', 'Mariana Ek', 'Analista de cobranza', 'Finanzas', 'Alta', 'Nueva posición'],
  ['02 oct', 'Rafael Gómez', 'Custodio', 'Custodia', 'Baja', 'Mejor oferta económica'], ['30 sep', 'Ernesto Lara', 'Monitorista', 'Monitoreo', 'Baja', 'Cambio de ciudad'],
  ['29 sep', 'Patricia Vela', 'Ejecutiva comercial', 'Comercial', 'Alta', 'Expansión Bajío'], ['26 sep', 'Omar Chi', 'Custodio', 'Custodia', 'Baja', 'No aprobó evaluación de confianza'],
  ['22 sep', 'Diego Ramos', 'Mecánico', 'Flotilla y taller', 'Alta', 'Reemplazo'], ['19 sep', 'Hugo Navarro', 'Custodio', 'Custodia', 'Baja', 'Desempeño'],
].map(([d, n, r, a, t, why]) => ({ d, n, r, a, t, why, cls: t === 'Alta' ? 'pill p-ok' : 'pill p-bad' }))
const step = (t: string) => ({ t, cls: t === 'Listo' ? 'pill p-ok' : (t === 'Pendiente' ? 'pill p-warn' : 'pill p-mute') })
const OFF = [
  { n: 'Rafael Gómez', r: 'Custodio · Centro', d: '02 oct', why: 'Mejor oferta', steps: ['Listo', 'Listo', 'Listo', 'Pendiente', 'Listo'].map(step) },
  { n: 'Ernesto Lara', r: 'Monitorista', d: '30 sep', why: 'Cambio de ciudad', steps: ['Listo', 'No aplica', 'Listo', 'Listo', 'Listo'].map(step) },
  { n: 'Omar Chi', r: 'Custodio · Golfo', d: '26 sep', why: 'Evaluación de confianza', steps: ['Pendiente', 'Listo', 'Listo', 'Pendiente', 'Pendiente'].map(step) },
]
const card = (name: string, meta: string, tag: string, cls: string) => ({ name, meta, tag, cls: 'pill ' + cls })
const COLS = [
  { name: 'Solicitud', n: 14, cards: [card('Juan Pablo Euán', 'Custodio · León', 'Nuevo', 'p-mute'), card('Fernanda Ruiz', 'Monitorista · Cuautitlán', 'Referida', 'p-info')] },
  { name: 'Entrevista', n: 6, cards: [card('Mario Tun', 'Custodio · Irapuato', 'Agendada', 'p-info'), card('Carlos Ibarra', 'Analista de nómina', 'Aprobada', 'p-ok')] },
  { name: 'Pruebas de confianza', n: 5, cards: [card('Alan Vega', 'Poligrafía y toxicológico', 'En proceso', 'p-warn')] },
  { name: 'Documentos', n: 3, cards: [card('Rodrigo Pool', 'Falta licencia federal', 'Incompleto', 'p-bad')] },
  { name: 'Contratación', n: 2, cards: [card('Sergio Ávila', 'Ingresa 13 oct', 'Oferta firmada', 'p-ok')] },
]

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** '2026-10-19' + '2026-10-23' → '19–23 oct' (o '30 oct–3 nov'). */
function rango(desde: string, hasta: string) {
  const [, m1, d1] = desde.split('-').map(Number)
  const [, m2, d2] = hasta.split('-').map(Number)
  if (!m1 || !m2) return desde + ' – ' + hasta
  return m1 === m2 ? `${d1}–${d2} ${MES[m1 - 1]}` : `${d1} ${MES[m1 - 1]}–${d2} ${MES[m2 - 1]}`
}

function VacRow({ n, r, d, cover, state, ok, no }: { n: string; r: string; d: string; cover: string; state: string | null; ok: () => void; no: () => void }) {
  return (
    <div style={sx('display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
      <span style={sx('display:flex;flex-direction:column;min-width:200px')}><span style={sx('font-weight:500')}>{n}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{r}</span></span>
      <span className="mono" style={sx('min-width:180px')}>{d}</span>
      <span style={sx('min-width:150px;color:#3E4A59')}>{cover}</span>
      {!state && <span style={sx('display:flex;gap:8px')}><button type="button" className="btn btn-pri" onClick={ok}>Aprobar</button><button type="button" className="btn" onClick={no}>Rechazar</button></span>}
      {state && <span className={state === 'Aprobada' ? 'pill p-ok' : 'pill p-bad'}>{state}</span>}
    </div>
  )
}

export default function RH() {
  const [tab, setTab] = useState('dir')
  const [sel, setSel] = useState(0)
  const [ck, setCk] = useState([true, true, true, false, true, false, false])
  const [vac, setVac] = useState<Record<number, string>>({})
  const [q, setQ] = useState('')
  const [fArea, setFArea] = useState('Todas las áreas')
  const [fSede, setFSede] = useState('Todas las sedes')
  const solicitudes = useStore(s => s.vacaciones)

  const p0 = P[sel]
  const done = ck.filter(Boolean).length
  const onb = ([['Luis Canché', 'Custodio · Bajío', '1 oct', done / 7], ['Mariana Ek', 'Analista de cobranza', '3 oct', 0.85], ['Patricia Vela', 'Ejecutiva comercial', '29 sep', 1], ['Mario Tun', 'Custodio · Bajío', '13 oct', 0.15], ['Sergio Ávila', 'Custodio · Bajío', '13 oct', 0.3]] as [string, string, string, number][])
    .map(([n, r, d, p]) => ({ n, r, d, p: Math.round(p * 100) + '%', bar: 'height:100%;width:' + Math.round(p * 100) + '%;background:' + (p >= 1 ? '#2B9A66' : '#D08A1C') }))

  const qn = q.trim().toLowerCase()
  const areaMatch = (a: string) => fArea === 'Todas las áreas' || a === fArea ||(fArea === 'Finanzas y administración' && a === 'Finanzas')
  const people = P.map((p, i) => ({ p, i })).filter(({ p }) =>
    (!qn || (p.name + ' ' + p.role + ' ' + p.id).toLowerCase().includes(qn)) && areaMatch(p.area) && (fSede === 'Todas las sedes' || p.site === fSede))

  const pendStore = solicitudes.filter(v => v.estatus === 'Pendiente').length
  const pendDesign = V.filter(([, , , , d0], i) => !(vac[i] || d0)).length

  return (
    <Shell active="rh" css={CSS} mainStyle="flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px">
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Recursos humanos · toda la empresa</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Personas</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>486 colaboradores en 9 áreas y 4 sedes</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <Link className="btn" to={ROUTES.PortalColaborador}>Portal del colaborador</Link>
          <button type="button" className="btn">Exportar plantilla</button>
          <button type="button" className="btn btn-pri">Alta de colaborador</button>
        </div>
      </header>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:12px')}>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px;padding:16px')}><span className="lbl">Headcount</span><span className="k">486</span><span style={sx('font-size:13px;color:#5F6B7A')}>+5 vs agosto</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px;padding:16px')}><span className="lbl">Altas del mes</span><span className="k" style={sx('color:#17784A')}>14</span><span style={sx('font-size:13px;color:#5F6B7A')}>11 custodios · 3 oficina</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px;padding:16px')}><span className="lbl">Bajas del mes</span><span className="k" style={sx('color:#B42318')}>9</span><span style={sx('font-size:13px;color:#5F6B7A')}>7 voluntarias</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px;padding:16px')}><span className="lbl">Rotación</span><span className="k">3.1%</span><span style={sx('font-size:13px;color:#5F6B7A')}>mensual</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px;padding:16px')}><span className="lbl">De vacaciones hoy</span><span className="k">12</span><span style={sx('font-size:13px;color:#5F6B7A')}>{pendStore + pendDesign} solicitudes por aprobar</span></div>
        <div className="card" style={sx('display:flex;flex-direction:column;gap:6px;padding:16px')}><span className="lbl">Vacantes</span><span className="k">23</span><span style={sx('font-size:13px;color:#5F6B7A')}>19 días para contratar</span></div>
      </section>

      <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:16px')}>
        <figure className="card" style={sx('margin:0;display:flex;flex-direction:column;gap:12px')}>
          <figcaption style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap')}><span style={sx("font-family:'Archivo',sans-serif;font-size:16px;font-weight:600")}>Altas y bajas por mes</span>
            <span style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59')}><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#2B9A66')}></span>Altas</span><span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#D9534F')}></span>Bajas</span></span>
          </figcaption>
          <div style={sx('display:flex;gap:18px;align-items:flex-end;height:130px')}>
            {MONTHS.map(([n, a, b]) => (
              <div key={n} style={sx('flex:1;display:flex;flex-direction:column;align-items:center;gap:6px')}>
                <div style={sx('display:flex;gap:3px;align-items:flex-end;height:104px')}><div title={`Altas ${a}`} style={sx('width:14px;border-radius:3px 3px 0 0;background:#2B9A66;height:' + a * 6 + 'px')}></div><div title={`Bajas ${b}`} style={sx('width:14px;border-radius:3px 3px 0 0;background:#D9534F;height:' + b * 6 + 'px')}></div></div>
                <span style={sx('font-size:12px;color:#5F6B7A')}>{n}</span>
              </div>
            ))}
          </div>
        </figure>
        <figure className="card" style={sx('margin:0;display:flex;flex-direction:column;gap:10px')}>
          <figcaption style={sx("font-family:'Archivo',sans-serif;font-size:16px;font-weight:600")}>Colaboradores por área</figcaption>
          {AREAS.map(([n, v]) => (
            <div key={n} style={sx('display:grid;grid-template-columns:150px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:13px')}>
              <span>{n}</span><div style={sx('height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx('height:100%;width:' + Math.max(2, Math.round(Math.sqrt(v / 400) * 100)) + '%;background:' + areaColor[n])}></div></div><span className="mono" style={sx('text-align:right')}>{v}</span>
            </div>
          ))}
        </figure>
      </section>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · riesgo de rotación</span><span style={sx('font-size:14px;color:#3E4A59')}>7 colaboradores muestran el patrón previo a una baja: exceso de horas 3 semanas seguidas, vacaciones sin tomar y sin ajuste de sueldo en más de 18 meses. 5 son custodios de Bajío y 2 monitoristas.</span></div>
        <Link className="btn" to={ROUTES.AsistenteIA}>Ver a quiénes</Link>
      </section>

      <div role="tablist" aria-label="Sección de personas" style={sx('display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #E4E8ED;padding-bottom:12px')}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={k === tab} className="btn" style={sx(k === tab ? 'background:#FFF1DB;border-color:#F2A93B;color:#8A5300' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dir' && (
        <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
          <section style={sx('flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:14px')}>
            <div style={sx('display:flex;gap:10px;flex-wrap:wrap')}>
              <label style={sx('display:flex;flex:1 1 240px')}><span style={sx(SR)}>Buscar persona</span><input type="search" className="sel" placeholder="Buscar por nombre, puesto o número" style={sx('flex:1')} value={q} onChange={e => setQ(e.target.value)} /></label>
              <label style={sx('display:flex')}><span style={sx(SR)}>Área</span><select className="sel" value={fArea} onChange={e => setFArea(e.target.value)}><option>Todas las áreas</option><option>Custodia</option><option>Monitoreo</option><option>Reacción</option><option>Operaciones</option><option>Flotilla y taller</option><option>Comercial</option><option>Finanzas y administración</option><option>RH</option><option>Dirección</option></select></label>
              <label style={sx('display:flex')}><span style={sx(SR)}>Sede</span><select className="sel" value={fSede} onChange={e => setFSede(e.target.value)}><option>Todas las sedes</option><option>Cuautitlán</option><option>Querétaro</option><option>Monterrey</option><option>Veracruz</option></select></label>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr));gap:12px')}>
              {people.map(({ p, i }) => (
                <button key={p.id} type="button" onClick={() => setSel(i)} style={sx('display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:10px;cursor:pointer;font-family:inherit;color:#121821;background:#FFFFFF;border:1px solid ' + (i === sel ? '#F2A93B;box-shadow:0 0 0 2px #FFF1DB' : '#E4E8ED'))}>
                  <span style={sx(av(p.area, 48))}>{ini(p.name)}</span>
                  <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;text-align:left')}>
                    <span style={sx('font-weight:600;font-size:14px')}>{p.name}</span>
                    <span style={sx('font-size:13px;color:#3E4A59')}>{p.role}</span>
                    <span style={sx('font-size:12px;color:#5F6B7A')}>{p.area} · {p.site}</span>
                    <span className={st[p.status]} style={sx('align-self:flex-start;margin-top:4px')}>{p.status}</span>
                  </span>
                </button>
              ))}
            </div>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Mostrando {people.length} de 486 · las iniciales se reemplazan por la foto del expediente</span>
          </section>

          <aside className="card" aria-label="Perfil" style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:18px')}>
            <div style={sx('display:flex;gap:16px;align-items:center')}>
              <span style={sx(av(p0.area, 80))}>{ini(p0.name)}</span>
              <div style={sx('display:flex;flex-direction:column;gap:3px;min-width:0')}>
                <span style={sx("font-family:'Archivo',sans-serif;font-size:20px;font-weight:600")}>{p0.name}</span>
                <span style={sx('font-size:14px;color:#3E4A59')}>{p0.role}</span>
                <span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{p0.id} · {p0.area} · {p0.site}</span>
              </div>
            </div>
            <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}><button type="button" className="btn">Cambiar foto</button><button type="button" className="btn">Editar</button><button type="button" className="btn">Iniciar baja</button></div>
            <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
              <div><dt className="lbl">Ingreso</dt><dd style={sx('margin:4px 0 0')}>{p0.since}</dd></div>
              <div><dt className="lbl">Antigüedad</dt><dd style={sx('margin:4px 0 0')}>{p0.tenure}</dd></div>
              <div><dt className="lbl">Jefe directo</dt><dd style={sx('margin:4px 0 0')}>{p0.boss}</dd></div>
              <div><dt className="lbl">Contrato</dt><dd style={sx('margin:4px 0 0')}>Indefinido</dd></div>
            </dl>
            <section style={sx('display:flex;flex-direction:column;gap:10px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center')}><span className="lbl">Compensación</span><span className="pill p-mute">Visible para RH y Dirección</span></div>
              <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:baseline')}><span style={sx('font-size:14px')}>Sueldo mensual bruto</span><span className="mono" style={sx('font-size:20px;font-weight:500')}>{p0.pay}</span></div>
              {p0.payHist.map(([d, why, v]) => (
                <div key={d + why} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:13px;color:#3E4A59')}><span>{d} · {why}</span><span className="mono">{v}</span></div>
              ))}
            </section>
            <section style={sx('display:flex;flex-direction:column;gap:10px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Vacaciones 2026</span>
              <div style={sx('height:10px;border-radius:5px;background:#EBEEF2;overflow:hidden;display:flex')}><div style={sx('height:100%;background:#2B7FA8;width:' + Math.round(p0.vac[0] / p0.vac[1] * 100) + '%')}></div></div>
              <div style={sx('display:flex;justify-content:space-between;font-size:13px;color:#3E4A59')}><span>{p0.vac[0]} tomados</span><span>{p0.vac[1] - p0.vac[0]} disponibles de {p0.vac[1]}</span></div>
            </section>
            <section style={sx('display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Historial</span>
              <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column')}>
                {p0.hist.map(([d, t]) => (
                  <li key={d + t} style={sx('display:grid;grid-template-columns:80px 12px minmax(0,1fr);gap:10px;padding:6px 0;font-size:13px')}><span className="mono" style={sx('color:#5F6B7A')}>{d}</span><span style={sx('width:8px;height:8px;border-radius:50%;background:#D08A1C;margin-top:5px')}></span><span>{t}</span></li>
                ))}
              </ol>
            </section>
            <section style={sx('display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEF1F4;padding-top:14px')}>
              <span className="lbl">Documentos</span>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}><span className="pill p-ok">INE</span><span className="pill p-ok">Contrato</span><span className="pill p-ok">Comprobante de domicilio</span><span className="pill p-ok">Constancia fiscal</span><span className={p0.status === 'Incapacidad' ? 'pill p-warn' : 'pill p-ok'}>{p0.area === 'Custodia' ? 'Portación y licencia federal' : 'Evaluación anual'}</span></div>
            </section>
          </aside>
        </div>
      )}

      {tab === 'mov' && (
        <section className="card" style={sx('padding:8px 8px 0')}>
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Persona</th><th>Puesto</th><th>Área</th><th>Movimiento</th><th>Motivo</th></tr></thead>
              <tbody>
                {MOVES.map(m => (
                  <tr key={m.d + m.n}><td className="mono">{m.d}</td><td>{m.n}</td><td>{m.r}</td><td>{m.a}</td><td><span className={m.cls}>{m.t}</span></td><td>{m.why}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'on' && (
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:16px')}>
          <section className="card" style={sx('display:flex;flex-direction:column;gap:12px')}>
            <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Ingresos en curso</h2>
            {onb.map(o => (
              <div key={o.n} style={sx('display:grid;grid-template-columns:minmax(0,1fr) 120px 44px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #EEF1F4;font-size:14px')}>
                <span style={sx('display:flex;flex-direction:column')}><span style={sx('font-weight:500')}>{o.n}</span><span style={sx('font-size:12px;color:#5F6B7A')}>{o.r} · ingresa {o.d}</span></span>
                <div style={sx('height:8px;border-radius:4px;background:#EBEEF2;overflow:hidden')}><div style={sx(o.bar)}></div></div>
                <span className="mono" style={sx('font-size:13px;text-align:right')}>{o.p}</span>
              </div>
            ))}
          </section>
          <section className="card" style={sx('display:flex;flex-direction:column;gap:8px')}>
            <h2 style={sx("margin:0 0 4px;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Checklist · Luis Canché</h2>
            <span style={sx('font-size:13px;color:#5F6B7A')}>Custodio · Bajío · {done} de 7 completos</span>
            {LABELS.map((label, i) => (
              <label key={label} style={sx('display:flex;gap:12px;align-items:center;min-height:40px;font-size:14px;border-top:1px solid #EEF1F4;cursor:pointer')}>
                <input type="checkbox" checked={ck[i]} onChange={() => { const n = ck.slice(); n[i] = !n[i]; setCk(n) }} style={sx('width:18px;height:18px;accent-color:#D08A1C')} />
                <span style={sx(ck[i] ? 'color:#5F6B7A;text-decoration:line-through' : '')}>{label}</span>
              </label>
            ))}
          </section>
        </div>
      )}

      {tab === 'off' && (
        <section className="card" style={sx('padding:8px 8px 0')}>
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr><th>Persona</th><th>Último día</th><th>Motivo</th><th>Equipo y uniforme</th><th>Unidad</th><th>Accesos y Samsara</th><th>Finiquito</th><th>Entrevista de salida</th></tr></thead>
              <tbody>
                {OFF.map(o => (
                  <tr key={o.n}><td>{o.n}<br /><span style={sx('font-size:12px;color:#5F6B7A')}>{o.r}</span></td><td className="mono">{o.d}</td><td>{o.why}</td>
                    {o.steps.map((s, j) => <td key={j}><span className={s.cls}>{s.t}</span></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'vac' && (
        <section className="card" style={sx('display:flex;flex-direction:column;gap:6px')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Solicitudes de vacaciones y permisos</h2>
          <span style={sx('font-size:13px;color:#5F6B7A;margin-bottom:8px')}>Llegan desde el <Link to={ROUTES.PortalColaborador}>portal del colaborador</Link>, ya aprobadas por el jefe directo.</span>
          {solicitudes.map((v: SolicitudVacaciones) => (
            <VacRow key={v.id} n={v.colaborador} r={v.area + ' · ' + v.id} d={rango(v.desde, v.hasta) + ' · ' + v.dias + (v.dias === 1 ? ' día' : ' días')}
              cover={v.motivo || 'Desde Mi portal'} state={v.estatus === 'Pendiente' ? null : v.estatus}
              ok={() => actions.resolverVacaciones(v.id, 'Aprobada')} no={() => actions.resolverVacaciones(v.id, 'Rechazada')} />
          ))}
          {V.map(([n, r, d, cover, done0], i) => (
            <VacRow key={'d' + i} n={n} r={r} d={d} cover={cover} state={vac[i] || (done0 ? 'Aprobada' : null)}
              ok={() => setVac({ ...vac, [i]: 'Aprobada' })} no={() => setVac({ ...vac, [i]: 'Rechazada' })} />
          ))}
        </section>
      )}

      {tab === 'rec' && (
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:12px;min-width:1040px')}>
            {COLS.map(c => (
              <div key={c.name} style={sx('background:#F3F5F8;border:1px solid #E4E8ED;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px')}>
                <div style={sx('display:flex;justify-content:space-between')}><span style={sx('font-weight:600;font-size:14px')}>{c.name}</span><span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{c.n}</span></div>
                {c.cards.map(p => (
                  <div key={p.name} style={sx('background:#FFFFFF;border:1px solid #E4E8ED;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px')}>
                    <span style={sx('font-weight:500;font-size:14px')}>{p.name}</span>
                    <span style={sx('font-size:12px;color:#5F6B7A')}>{p.meta}</span>
                    <span className={p.cls} style={sx('align-self:flex-start')}>{p.tag}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  )
}
