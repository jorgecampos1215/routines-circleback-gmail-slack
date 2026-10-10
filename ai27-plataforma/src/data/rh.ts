/**
 * Datos de la pantalla Personas (RH) derivados de `seed.colaboradores` (486).
 * Las 10 personas del diseño van primero y sustituyen a un colaborador de su misma área en seed,
 * de modo que el total sigue siendo 486. No edita seed.ts.
 */
import { colaboradores, custodios, type Colaborador } from './seed'

export type Persona = {
  id: string
  name: string
  role: string
  area: string // nombre del diseño: Custodia, Monitoreo, …, RH
  site: string
  zona: string
  status: string // Activo | Vacaciones | Incapacidad | Onboarding | Baja en proceso
  ingreso: string // YYYY-MM-DD
  since: string // 'feb 2019'
  tenure: string // '7 años 8 meses'
  boss: string
  sueldo: number
  pay: string
  vac: [number, number] // [tomados, total]
  payHist: [string, string, string][]
  hist: [string, string][]
  contrato: string
}

export const HOY = new Date(2026, 9, 8) // 8 oct 2026 (fecha del demo)
export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Área de seed → nombre que usa el diseño. */
export const AREA_DISENO: Record<string, string> = { Custodios: 'Custodia', 'Recursos humanos': 'RH' }
export const areaNombre = (a: string) => AREA_DISENO[a] ?? a

export const JEFE_POR_AREA: Record<string, string> = {
  Custodia: 'Jorge Pérez', Monitoreo: 'Jorge Pérez', Reacción: 'Dirección de operaciones', Operaciones: 'Dirección de operaciones',
  'Flotilla y taller': 'Dirección de operaciones', Comercial: 'Dirección comercial', Finanzas: 'Dirección general', RH: 'Dirección general', Dirección: 'Consejo',
}

export const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
export const mesAnio = (iso: string) => { const [y, m] = iso.split('-').map(Number); return `${MES[(m || 1) - 1]} ${y}` }

/** Antigüedad legible entre `ingreso` y HOY. */
export function antiguedad(iso: string, hoy = HOY) {
  const [y, m, d] = iso.split('-').map(Number)
  const ing = new Date(y, (m || 1) - 1, d || 1)
  if (ing > hoy) return 'Ingresa ' + ing.getDate() + ' ' + MES[ing.getMonth()]
  let meses = (hoy.getFullYear() - ing.getFullYear()) * 12 + (hoy.getMonth() - ing.getMonth())
  if (hoy.getDate() < ing.getDate()) meses--
  if (meses < 1) { const dias = Math.max(1, Math.round((hoy.getTime() - ing.getTime()) / 86400000)); return dias < 7 ? dias + ' días' : Math.round(dias / 7) + (dias < 14 ? ' semana' : ' semanas') }
  const a = Math.floor(meses / 12), r = meses % 12
  const pa = a ? `${a} ${a === 1 ? 'año' : 'años'}` : ''
  const pm = r ? `${r} ${r === 1 ? 'mes' : 'meses'}` : ''
  return [pa, pm].filter(Boolean).join(' ')
}

/** Días de vacaciones por ley (LFT 2023) según años cumplidos. */
export function diasPorLey(iso: string, hoy = HOY) {
  const [y, m, d] = iso.split('-').map(Number)
  const ing = new Date(y, (m || 1) - 1, d || 1)
  let anios = hoy.getFullYear() - ing.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), ing.getMonth(), ing.getDate())) anios--
  if (anios < 1) return 12
  if (anios <= 5) return 12 + 2 * (anios - 1)
  return Math.min(32, 20 + 2 * Math.floor((anios - 5) / 5))
}

function desdeSeed(c: Colaborador): Persona {
  const area = areaNombre(c.area)
  const cu = c.area === 'Custodios' ? custodios.find(x => x.id === c.id) : undefined
  const status = cu?.estatus === 'Vacaciones' || cu?.estatus === 'Incapacidad' ? cu.estatus : c.ingreso > '2026-09-24' ? 'Onboarding' : 'Activo'
  const total = diasPorLey(c.ingreso)
  const disp = Math.min(c.vacacionesDisponibles, total)
  const anio = Number(c.ingreso.slice(0, 4))
  const payHist: [string, string, string][] = anio >= 2026 ? [[mesAnio(c.ingreso), 'Contratación', fmtPesos(c.sueldo)]] : [['ene 2026', 'Ajuste anual', fmtPesos(c.sueldo)], ...(anio <= 2024 ? [['ene 2025', 'Ajuste anual', fmtPesos(c.sueldo / 1.06)] as [string, string, string]] : [])]
  const hist: [string, string][] = [[mesAnio(c.ingreso), status === 'Onboarding' ? 'Ingreso · onboarding en curso' : `Ingreso como ${c.puesto}`]]
  if (cu) {
    if (cu.certificaciones.includes('Carga alto valor') && anio < 2025) hist.push([`nov ${Math.min(2025, anio + 2)}`, 'Certificación carga de alto valor'])
    if (cu.incidentes > 0) hist.push(['oct 2026', `${cu.incidentes} ${cu.incidentes === 1 ? 'incidente atendido' : 'incidentes atendidos'} · actuación correcta`])
    if (cu.estatus === 'Incapacidad') hist.push(['sep 2026', 'Incapacidad registrada'])
    if (cu.estatus === 'Vacaciones') hist.push(['oct 2026', 'Vacaciones en curso'])
  } else if (c.puesto.match(/Supervisor|Gerente|Coordinador|Jefe|Director/) && anio < 2024) hist.push([`${MES[(anio * 7) % 12]} ${anio + 2}`, `Promoción a ${c.puesto}`])
  return {
    id: c.id, name: c.nombre, role: cu && cu.portacion ? 'Custodio armado' : c.puesto, area, site: c.sede, zona: c.zona, status, ingreso: c.ingreso,
    since: mesAnio(c.ingreso), tenure: antiguedad(c.ingreso), boss: area === 'Custodia' ? `Coordinación ${c.zona}` : JEFE_POR_AREA[area] ?? 'Dirección general',
    sueldo: c.sueldo, pay: fmtPesos(c.sueldo), vac: [total - disp, total], payHist, hist, contrato: anio >= 2026 ? 'Determinado · 3 meses' : 'Indefinido',
  }
}

type Diseno = Omit<Persona, 'zona' | 'sueldo' | 'ingreso' | 'contrato'> & { seedArea: string; ingreso: string }
const DISENO: Diseno[] = [
  { id: 'E-0042', name: 'Karla May', role: 'Gerente de RH', area: 'RH', seedArea: 'Recursos humanos', site: 'Cuautitlán', status: 'Activo', ingreso: '2019-02-04', since: 'feb 2019', tenure: '7 años 8 meses', boss: 'Dirección general', pay: '$42,000', vac: [10, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$42,000'], ['ene 2025', 'Ajuste anual', '$39,500'], ['jun 2023', 'Promoción', '$36,000']], hist: [['feb 2019', 'Ingreso como Coordinadora de reclutamiento'], ['jun 2023', 'Promoción a Gerente de RH'], ['mar 2026', 'Evaluación anual: sobresaliente']] },
  { id: 'E-0188', name: 'Luis Herrera', role: 'Monitorista Sr', area: 'Monitoreo', seedArea: 'Monitoreo', site: 'Cuautitlán', status: 'Activo', ingreso: '2021-05-03', since: 'may 2021', tenure: '5 años 5 meses', boss: 'Jorge Pérez', pay: '$16,000', vac: [4, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$16,000'], ['ago 2024', 'Promoción a Sr', '$15,000']], hist: [['may 2021', 'Ingreso como Monitorista'], ['ago 2024', 'Promoción a Monitorista Sr'], ['oct 2026', 'Atendió INC-0412 (recuperación total)']] },
  { id: 'C-1043', name: 'Raúl Medina', role: 'Custodio armado', area: 'Custodia', seedArea: 'Custodios', site: 'Cuautitlán', status: 'Activo', ingreso: '2022-03-14', since: 'mar 2022', tenure: '4 años 7 meses', boss: 'Jorge Pérez', pay: '$14,500', vac: [6, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$14,500'], ['ene 2025', 'Ajuste anual', '$13,800']], hist: [['mar 2022', 'Ingreso como Custodio'], ['nov 2024', 'Certificación carga de alto valor'], ['oct 2026', 'Incidente INC-0412 · actuación correcta']] },
  { id: 'E-0071', name: 'Gabriel Pacheco', role: 'Jefe de reacción', area: 'Reacción', seedArea: 'Reacción', site: 'Querétaro', status: 'Activo', ingreso: '2018-08-06', since: 'ago 2018', tenure: '8 años 2 meses', boss: 'Dirección de operaciones', pay: '$32,000', vac: [12, 18],
    payHist: [['ene 2026', 'Ajuste anual', '$32,000'], ['ene 2025', 'Ajuste anual', '$30,500']], hist: [['ago 2018', 'Ingreso como elemento de reacción'], ['ene 2022', 'Promoción a Jefe de reacción'], ['oct 2026', '3 recuperaciones totales en el trimestre']] },
  { id: 'E-0103', name: 'Laura Cruz', role: 'Contadora general', area: 'Finanzas', seedArea: 'Finanzas', site: 'Cuautitlán', status: 'Vacaciones', ingreso: '2020-10-05', since: 'oct 2020', tenure: '6 años', boss: 'Dirección general', pay: '$38,000', vac: [11, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$38,000']], hist: [['oct 2020', 'Ingreso como Contadora'], ['ene 2024', 'Promoción a Contadora general']] },
  { id: 'E-0095', name: 'Jorge Pérez', role: 'Coordinador de operaciones', area: 'Operaciones', seedArea: 'Operaciones', site: 'Cuautitlán', status: 'Activo', ingreso: '2020-07-06', since: 'jul 2020', tenure: '6 años 3 meses', boss: 'Dirección de operaciones', pay: '$35,000', vac: [8, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$35,000']], hist: [['jul 2020', 'Ingreso como Monitorista'], ['sep 2023', 'Promoción a Coordinador']] },
  { id: 'E-0211', name: 'Ana Domínguez', role: 'Ejecutiva comercial', area: 'Comercial', seedArea: 'Comercial', site: 'Monterrey', status: 'Activo', ingreso: '2023-01-09', since: 'ene 2023', tenure: '3 años 9 meses', boss: 'Dirección comercial', pay: '$22,000 + comisión', vac: [5, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$22,000']], hist: [['ene 2023', 'Ingreso'], ['dic 2025', 'Cerró renovación Autopartes Saltillo']] },
  { id: 'E-0150', name: 'Ricardo Salas', role: 'Jefe de taller', area: 'Flotilla y taller', seedArea: 'Flotilla y taller', site: 'Cuautitlán', status: 'Activo', ingreso: '2021-04-12', since: 'abr 2021', tenure: '5 años 6 meses', boss: 'Dirección de operaciones', pay: '$26,000', vac: [7, 14],
    payHist: [['ene 2026', 'Ajuste anual', '$26,000']], hist: [['abr 2021', 'Ingreso como Mecánico'], ['feb 2024', 'Promoción a Jefe de taller']] },
  { id: 'C-1311', name: 'Luis Canché', role: 'Custodio', area: 'Custodia', seedArea: 'Custodios', site: 'Querétaro', status: 'Onboarding', ingreso: '2026-10-01', since: 'oct 2026', tenure: '1 semana', boss: 'Jorge Pérez', pay: '$13,800', vac: [0, 12],
    payHist: [['oct 2026', 'Contratación', '$13,800']], hist: [['oct 2026', 'Ingreso · onboarding en curso']] },
  { id: 'C-0566', name: 'Daniel Soto', role: 'Custodio armado', area: 'Custodia', seedArea: 'Custodios', site: 'Monterrey', status: 'Incapacidad', ingreso: '2019-06-10', since: 'jun 2019', tenure: '7 años 4 meses', boss: 'Coordinación Noreste', pay: '$14,500', vac: [9, 16],
    payHist: [['ene 2026', 'Ajuste anual', '$14,500']], hist: [['jun 2019', 'Ingreso como Custodio'], ['sep 2026', 'Incapacidad registrada']] },
]

const ZONA_SEDE: Record<string, string> = { Cuautitlán: 'Centro', Querétaro: 'Bajío', Monterrey: 'Noreste', Veracruz: 'Golfo' }

/** 486 personas: las 10 del diseño primero, el resto desde seed. */
export const personas: Persona[] = (() => {
  const usados = new Set<string>()
  const out: Persona[] = []
  for (const d of DISENO) {
    // Toma el lugar de un colaborador de la misma área (el que tenga su id, o el último libre de esa área)
    const mismo = colaboradores.find(c => c.id === d.id)
    const sustituto = mismo ?? [...colaboradores].reverse().find(c => c.area === d.seedArea && !usados.has(c.id))
    if (sustituto) usados.add(sustituto.id)
    const sueldo = Number(d.pay.replace(/[^0-9]/g, '')) || sustituto?.sueldo || 20000
    const { seedArea: _a, ...rest } = d
    void _a
    out.push({ ...rest, zona: ZONA_SEDE[d.site] ?? sustituto?.zona ?? 'Centro', sueldo, contrato: d.status === 'Onboarding' ? 'Determinado · 3 meses' : 'Indefinido' })
  }
  for (const c of colaboradores) if (!usados.has(c.id)) out.push(desdeSeed(c))
  return out
})()

export const AREAS_DISENO = ['Custodia', 'Monitoreo', 'Reacción', 'Operaciones', 'Flotilla y taller', 'Comercial', 'Finanzas', 'RH', 'Dirección']
export const sedes = [...new Set(personas.map(p => p.site))].sort((a, b) => a.localeCompare(b, 'es'))

/** Conteo por área, en el orden del diseño pero ordenado por tamaño. */
export const porArea = (lista: Persona[] = personas) => AREAS_DISENO.map(a => [a, lista.filter(p => p.area === a).length] as [string, number]).sort((x, y) => y[1] - x[1])

// ───────────────────────── Altas y bajas ─────────────────────────
export type Movimiento = { fecha: string; nombre: string; puesto: string; area: string; tipo: 'Alta' | 'Baja'; motivo: string; id?: string }

let s = 4181
const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const NOMBRES_BAJA = ['Rafael Gómez', 'Ernesto Lara', 'Omar Chi', 'Hugo Navarro', 'Pablo Dzul', 'Saúl Mena', 'Tomás Briceño', 'Noé Calderón', 'Elías Puc', 'Abel Tamayo', 'Joel Escamilla', 'Isaac Loría', 'Adrián Cob', 'Gilberto Mex', 'Rogelio Ávila', 'Benjamín Chan', 'Efraín Noh', 'Ulises Tec', 'Cristian Balam', 'Moisés Ake', 'René Caamal', 'Fabián Dzib', 'Lorenzo Ek', 'Octavio May', 'Simón Poot', 'Martín Chuc', 'Nicolás Tun', 'Damián Couoh', 'Emilio Pat', 'Leonel Cauich', 'Aarón Chi', 'Julio Kú', 'Gustavo Pool', 'Amado Canul', 'Horacio Moo', 'Ismael Xool', 'Teodoro Yam', 'Walter Ucán', 'Ángel Chablé', 'Bernardo Ic']
const MOTIVOS_VOL = ['Mejor oferta económica', 'Cambio de ciudad', 'Motivos personales', 'Proyecto propio', 'Estudios']
const MOTIVOS_INV = ['No aprobó evaluación de confianza', 'Desempeño', 'Fin de contrato', 'Abandono de trabajo']
const PUESTO_BAJA = ['Custodio', 'Custodio', 'Custodio', 'Custodio', 'Monitorista', 'Mecánico', 'Analista de cobranza', 'Ejecutivo comercial']
const AREA_PUESTO: Record<string, string> = { Custodio: 'Custodia', Monitorista: 'Monitoreo', Mecánico: 'Flotilla y taller', 'Analista de cobranza': 'Finanzas', 'Ejecutivo comercial': 'Comercial' }

/** Bajas del semestre (seed no trae bajas): ~60% de las altas de cada mes, deterministas. Las 4 del diseño van primero. */
export const bajas: Movimiento[] = (() => {
  const out: Movimiento[] = [
    { fecha: '2026-10-02', nombre: 'Rafael Gómez', puesto: 'Custodio', area: 'Custodia', tipo: 'Baja', motivo: 'Mejor oferta económica' },
    { fecha: '2026-09-30', nombre: 'Ernesto Lara', puesto: 'Monitorista', area: 'Monitoreo', tipo: 'Baja', motivo: 'Cambio de ciudad' },
    { fecha: '2026-09-26', nombre: 'Omar Chi', puesto: 'Custodio', area: 'Custodia', tipo: 'Baja', motivo: 'No aprobó evaluación de confianza' },
    { fecha: '2026-09-19', nombre: 'Hugo Navarro', puesto: 'Custodio', area: 'Custodia', tipo: 'Baja', motivo: 'Desempeño' },
  ]
  let k = 4
  for (let m = 1; m <= 10; m++) {
    const mm = String(m).padStart(2, '0')
    const altas = personas.filter(p => p.ingreso.slice(0, 7) === `2026-${mm}`).length
    const ya = out.filter(b => b.fecha.slice(5, 7) === mm).length
    const objetivo = Math.max(1, Math.round(altas * 0.6 + (m % 3 === 0 ? 1 : 0)))
    for (let i = ya; i < objetivo && k < NOMBRES_BAJA.length; i++) {
      const puesto = pick(PUESTO_BAJA)
      const vol = rnd() < 0.7
      out.push({ fecha: `2026-${mm}-${String(int(1, m === 10 ? 7 : 28)).padStart(2, '0')}`, nombre: NOMBRES_BAJA[k++], puesto, area: AREA_PUESTO[puesto], tipo: 'Baja', motivo: vol ? pick(MOTIVOS_VOL) : pick(MOTIVOS_INV) })
    }
  }
  return out
})()

export const esVoluntaria = (motivo: string) => MOTIVOS_VOL.includes(motivo)

export const altas = (lista: Persona[] = personas): Movimiento[] => lista.filter(p => p.ingreso >= '2026-01-01' && p.ingreso <= '2026-10-08').map(p => ({ fecha: p.ingreso, nombre: p.name, puesto: p.role, area: p.area, tipo: 'Alta' as const, motivo: p.status === 'Onboarding' ? 'Onboarding en curso' : p.area === 'Custodia' ? `Vacante ${p.zona}` : 'Nueva posición', id: p.id }))

/** Altas y bajas de los últimos 6 meses cerrados (abr–sep 2026). */
export const porMes = (lista: Persona[] = personas, bajasLista: Movimiento[] = bajas): [string, number, number][] =>
  [4, 5, 6, 7, 8, 9].map(m => { const mm = `2026-${String(m).padStart(2, '0')}`; return [MES[m - 1][0].toUpperCase() + MES[m - 1].slice(1), lista.filter(p => p.ingreso.startsWith(mm)).length, bajasLista.filter(b => b.fecha.startsWith(mm)).length] })

export const fechaCorta = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${String(d).padStart(2, '0')} ${MES[m - 1]}` }

export const toCSV = (rows: (string | number)[][]) => rows.map(r => r.map(v => { const t = String(v); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t }).join(',')).join('\n')
export function descargar(nombre: string, contenido: string | Blob, tipo = 'text/csv;charset=utf-8') {
  const blob = contenido instanceof Blob ? contenido : new Blob(['﻿' + contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ───────────── Evolución del equipo (headcount por mes, con filtro de área) ─────────────
 * Headcount al cierre de cada mes = personas con ingreso ≤ fin de mes que todavía no habían causado baja.
 * Las bajas solo existen en 2026 (seed), por lo que antes de enero el equipo solo crece con los ingresos.
 */
export type PuntoHeadcount = { mes: string; etiqueta: string; headcount: number; altas: number; bajas: number }
export function headcountMensual(area = 'Todas las áreas', meses = 12, lista: Persona[] = personas, bajasLista: Movimiento[] = bajas): PuntoHeadcount[] {
  const hoyIso = `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, '0')}-${String(HOY.getDate()).padStart(2, '0')}`
  // quien ya está en la plantilla cuenta como presente hoy aunque su fecha de ingreso en la seed sea posterior
  const ps = (area === 'Todas las áreas' ? lista : lista.filter(p => p.area === area)).map(p => (p.ingreso > hoyIso ? { ...p, ingreso: hoyIso } : p))
  const bs = area === 'Todas las áreas' ? bajasLista : bajasLista.filter(b => b.area === area)
  const out: PuntoHeadcount[] = []
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(HOY.getFullYear(), HOY.getMonth() - i + 1, 0) // último día del mes
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const fin = `${ym}-${String(d.getDate()).padStart(2, '0')}`
    const activos = ps.filter(p => p.ingreso <= fin).length + bs.filter(b => b.fecha > fin && b.fecha.startsWith('2026')).length
    out.push({ mes: ym, etiqueta: `${MES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, headcount: activos, altas: ps.filter(p => p.ingreso.startsWith(ym)).length, bajas: bs.filter(b => b.fecha.startsWith(ym)).length })
  }
  return out
}
