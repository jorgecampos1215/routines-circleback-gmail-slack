/**
 * Asignaciones: la relación cliente ↔ servicio ↔ custodios ↔ unidades, con tiempo (inicio, fin, horas).
 * Es el modelo que une a Custodios (agenda por día y hora, historial), Flotilla (a quién está asignada
 * cada unidad) y Clientes (qué custodios y unidades tiene cada cliente).
 *
 * Reglas: a un cliente se le asignan uno o más custodios y una o más unidades; cada asignación tiene
 * un rango de tiempo. Las de servicios por evento duran horas; las dedicadas, semanas o meses; las de
 * monitoreo no llevan custodios ni unidades de AI27.
 *
 * Todo se deriva de seed.servicios de forma determinística; las que el usuario crea viven en store.asignaciones.
 */
import { custodios, unidades, servicios, type Servicio, type TipoServicio } from './seed'

export type EstatusAsignacion = 'Programada' | 'En curso' | 'Terminada' | 'Cancelada'
export type Asignacion = {
  id: string
  cliente: string
  servicio: string
  tipo: TipoServicio
  ruta: string
  custodios: string[] // ids C-xxxx
  unidades: string[] // ids AU-xxxx
  inicio: string // ISO
  fin: string // ISO
  horas: number
  estatus: EstatusAsignacion
  resultado?: 'Sin novedad' | 'Con incidente' | 'Retraso'
  notas?: string
}

const HOY = new Date('2026-10-07T14:32:00-06:00')
const h = (ms: number) => ms / 3_600_000
const iso = (d: Date) => d.toISOString()

// hash determinístico simple para repartir custodios/unidades por servicio
const hash = (s: string) => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x }

function generar(): Asignacion[] {
  const out: Asignacion[] = []
  const porZona = (z: string) => custodios.filter(c => c.zona === z && c.estatus !== 'Incapacidad' && c.estatus !== 'Vacaciones')
  const unidadesOperando = unidades.filter(u => u.estatus === 'Operando' || u.estatus === 'Disponible')
  servicios.forEach((s: Servicio, i) => {
    const seed = hash(s.id)
    const inicio = new Date(s.inicio)
    let fin: Date, horas: number, custIds: string[] = [], uniIds: string[] = []
    const candidatos = porZona(s.zona)
    const nCust = s.tipo === 'Monitoreo' ? 0 : s.tipo === 'Dedicado' ? 2 + (seed % 2) : 1 + (seed % 2)
    const nUni = s.tipo === 'Monitoreo' ? 0 : 1 + ((seed >> 3) % 2)
    for (let k = 0; k < nCust && candidatos.length; k++) custIds.push(candidatos[(seed + k * 7) % candidatos.length].id)
    for (let k = 0; k < nUni; k++) uniIds.push(unidadesOperando[(seed + k * 11 + i) % unidadesOperando.length].id)
    if (s.tipo === 'Por evento') { horas = 6 + (seed % 14); fin = new Date(inicio.getTime() + horas * 3_600_000) }
    else if (s.tipo === 'Dedicado') { fin = new Date(inicio.getTime() + (20 + (seed % 40)) * 86_400_000); horas = Math.round(h(fin.getTime() - inicio.getTime()) * 8 / 24) }
    else { fin = new Date(inicio.getTime() + 30 * 86_400_000); horas = 0 }
    const estatus: EstatusAsignacion = s.estatus === 'Confirmado' ? 'Programada' : s.estatus === 'En tránsito' ? 'En curso' : 'Terminada'
    const resultado = estatus === 'Terminada' ? (s.estatus === 'Con incidente' ? 'Con incidente' : seed % 9 === 0 ? 'Retraso' : 'Sin novedad') : undefined
    out.push({ id: 'ASG-' + String(5000 + i), cliente: s.cliente, servicio: s.id, tipo: s.tipo, ruta: s.ruta, custodios: custIds, unidades: uniIds, inicio: iso(inicio), fin: iso(fin), horas, estatus, resultado })
  })
  // Historial más profundo para los custodios del diseño (meses anteriores)
  const hero = ['C-1102', 'C-0877', 'C-1043', 'C-1188', 'C-0654', 'C-0712', 'C-1240', 'C-0398', 'C-0931']
  hero.forEach((cid, j) => {
    for (let k = 0; k < 10; k++) {
      const s = servicios[(hash(cid) + k * 13) % servicios.length]
      const ini = new Date(HOY.getTime() - (10 + k * 9 + j) * 86_400_000); ini.setHours(5 + (k % 10), 0, 0, 0)
      const horas = 6 + ((hash(cid) + k) % 12)
      out.push({ id: `ASG-H${j}${k}`, cliente: s.cliente, servicio: s.id, tipo: 'Por evento', ruta: s.ruta, custodios: [cid], unidades: [unidadesOperando[(hash(cid) + k) % unidadesOperando.length].id], inicio: iso(ini), fin: iso(new Date(ini.getTime() + horas * 3_600_000)), horas, estatus: 'Terminada', resultado: k % 7 === 3 ? 'Retraso' : 'Sin novedad' })
    }
  })
  // Agenda de esta semana para los custodios del diseño (para que la vista por día/hora tenga contenido)
  const semana = inicioSemana(HOY)
  hero.forEach((cid, j) => {
    const c = custodios.find(x => x.id === cid)!
    c.turnos.split('').forEach((t, d) => {
      if (t !== 's') return
      const ini = new Date(semana.getTime() + d * 86_400_000); ini.setHours(6 + ((j + d) % 3) * 2, 0, 0, 0)
      const horas = 8 + ((j + d) % 3) * 2
      const s = servicios[(hash(cid) + d) % 86]
      if (out.some(a => a.custodios.includes(cid) && seSolapan(a, ini, horas))) return
      out.push({ id: `ASG-S${j}${d}`, cliente: s.cliente, servicio: s.id, tipo: s.tipo === 'Monitoreo' ? 'Por evento' : s.tipo, ruta: s.ruta, custodios: [cid], unidades: [unidadesOperando[(hash(cid) + d + 3) % unidadesOperando.length].id], inicio: iso(ini), fin: iso(new Date(ini.getTime() + horas * 3_600_000)), horas, estatus: ini < HOY ? (ini.getTime() + horas * 3_600_000 > HOY.getTime() ? 'En curso' : 'Terminada') : 'Programada', resultado: ini.getTime() + horas * 3_600_000 < HOY.getTime() ? 'Sin novedad' : undefined })
    })
  })
  return out.sort((a, b) => b.inicio.localeCompare(a.inicio))
}

function seSolapan(a: Asignacion, ini: Date, horas: number) {
  const fin = ini.getTime() + horas * 3_600_000
  return new Date(a.inicio).getTime() < fin && new Date(a.fin).getTime() > ini.getTime()
}

/** Lunes 00:00 de la semana de `d`. */
export function inicioSemana(d: Date) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x
}

export const asignaciones: Asignacion[] = generar()

export const asignacionesDeCustodio = (id: string, lista: Asignacion[] = asignaciones) => lista.filter(a => a.custodios.includes(id))
export const asignacionesDeUnidad = (id: string, lista: Asignacion[] = asignaciones) => lista.filter(a => a.unidades.includes(id))
export const asignacionesDeCliente = (cliente: string, lista: Asignacion[] = asignaciones) => lista.filter(a => a.cliente === cliente)

/** Horas trabajadas por un custodio en la semana que contiene `ref` (para la agenda por día). */
export function horasSemana(id: string, ref = HOY, lista: Asignacion[] = asignaciones) {
  const ini = inicioSemana(ref).getTime(), fin = ini + 7 * 86_400_000
  return asignacionesDeCustodio(id, lista).reduce((acc, a) => {
    const s = Math.max(ini, new Date(a.inicio).getTime()), e = Math.min(fin, new Date(a.fin).getTime())
    return acc + (e > s ? (e - s) / 3_600_000 : 0)
  }, 0)
}

/* ───────────── Combustible y kilometraje diario por unidad ─────────────
 * Se calcula al vuelo (600 unidades × 30 días sería demasiado para la seed). Determinístico por unidad y fecha.
 */
export type ConsumoDia = { fecha: string; km: number; litros: number; costo: number; rendimiento: number; cargo: boolean }
export function consumoDiario(unidadId: string, dias = 30, hasta = HOY): ConsumoDia[] {
  const u = unidades.find(x => x.id === unidadId)
  const base = u ? u.rendimiento : 9
  const out: ConsumoDia[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hasta.getTime() - i * 86_400_000)
    const fecha = d.toISOString().slice(0, 10)
    const hsh = hash(unidadId + fecha)
    const trabajo = (hsh % 7) !== 0 && u?.estatus === 'Operando'
    const km = trabajo ? 120 + (hsh % 420) : 0
    const rend = Math.round((base + ((hsh >> 4) % 21 - 10) / 10) * 10) / 10
    const litros = km ? Math.round((km / rend) * 10) / 10 : 0
    const cargo = litros > 0 && (hsh >> 2) % 3 === 0 // ~1 de cada 3 días carga tanque
    out.push({ fecha, km, litros, costo: Math.round(litros * 24.2), rendimiento: km ? rend : 0, cargo })
  }
  return out
}
export const HOY_DEMO = HOY
