/**
 * Respuestas del Asistente IA calculadas desde seed (margen por cliente, incidentes por carretera, cobertura por
 * zona, combustible anómalo, documentos por vencer) y un mini-store de "insights" fijados al dashboard.
 * Ingresos vs gastos de 6 meses no está en seed: se conserva la serie del diseño.
 */
import { useSyncExternalStore } from 'react'
import { clientes, incidentes, cargasCombustible, unidades, custodios, ZONAS, type Zona } from './seed'
import { coberturaPorZona, sugerirCobertura } from './cobertura'
import { docsPorVencer, DIAS_DOCS } from './dashboard'

const M = (v: number) => '$' + (v / 1e6).toFixed(2) + 'M'
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1])
const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

// ── Margen por cliente (septiembre): ingresosMes × margen de cada cliente en seed ──
export function margenPorCliente() {
  const filas = clientes.map(c => ({ cliente: c.nombre, margen: c.ingresosMes * c.margen / 100, pct: c.margen, servicios: c.serviciosTrimestre, incidentes: c.incidentes })).sort((a, b) => b.margen - a.margen)
  const total = filas.reduce((a, f) => a + f.margen, 0)
  const top5 = filas.slice(0, 5).reduce((a, f) => a + f.margen, 0)
  const t = filas[0]
  const texto = `${t.cliente} fue el cliente con más margen: ${M(t.margen)} (${t.pct}%) con ${t.servicios} servicios en el trimestre${t.incidentes === 0 ? ' sin incidentes' : ` y ${t.incidentes} incidente${t.incidentes > 1 ? 's' : ''}`}. Le siguen ${filas[1].cliente} (${M(filas[1].margen)}, ${filas[1].pct}%) y ${filas[2].cliente} (${M(filas[2].margen)}, ${filas[2].pct}%). Los 5 primeros concentran el ${Math.round(top5 / total * 100)}% del margen del mes.`
  return { filas, data: filas.slice(0, 5).map(f => [f.cliente, Math.round(f.margen / 1e4) / 100] as [string, number]), texto }
}

// ── Incidentes por carretera: Q3 desde seed; Q2 (periodo anterior, fuera de seed) como línea base ──
const Q2_BASE: Record<string, number> = { 'Arco Norte': 3, 'Méx–Puebla–Orizaba': 4, 'Méx–Querétaro': 4, 'Querétaro–SLP': 2, 'Guadalajara–Lagos': 3, 'Monterrey–Nuevo Laredo': 5, 'Puebla–Veracruz': 2 }
export function incidentesPorCarretera() {
  const q3 = incidentes.filter(i => parseInt(i.fecha.slice(5, 7)) <= 9)
  const filas = Object.keys(Q2_BASE).map(k => ({ k, a: Q2_BASE[k], b: q3.filter(i => i.carretera === k).length })).sort((a, b) => (b.b - b.a) - (a.b - a.a))
  const top = filas[0]
  const noct = q3.filter(i => i.carretera === top.k && (parseInt(i.hora.slice(0, 2)) >= 22 || parseInt(i.hora.slice(0, 2)) < 4)).length
  const texto = `${top.k} pasó de ${top.a} a ${top.b} incidentes${noct ? `, ${noct} de ellos entre 22:00 y 04:00` : ''}. Recomiendo subir su factor de riesgo de 1.2 a 1.4 y exigir 2 custodios en horario nocturno.${filas.filter(f => f.b < f.a).length ? ` Bajaron ${filas.filter(f => f.b < f.a).map(f => f.k).join(' y ')}.` : ''}`
  return { filas: filas.slice(0, 5), max: Math.max(...filas.map(f => Math.max(f.a, f.b))), texto }
}

// ── Cobertura por zona mañana (seed: disponibles reales) ──
export function coberturaManana() {
  const cob = coberturaPorZona()
  const faltan = cob.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff)
  const texto = faltan.length
    ? faltan.map(f => { const sug = sugerirCobertura(f.zona, -f.diff, cob); return `Mañana faltan ${-f.diff} custodios en ${f.zona} (${f.requeridos} servicios, ${f.disponibles} disponibles)${sug.length ? `: puedes mover ${lista(sug.map(s => `${s.n} de ${s.zona}`))}` : ''}.` }).join(' ') + ` ${cob.filter(c => c.diff > 0).map(c => `${c.zona} tiene ${c.diff} de excedente`).join(', ')}.`
    : 'Todas las zonas tienen cobertura completa para mañana.'
  return { filas: cob, texto }
}

// ── Combustible: rendimiento por unidad desde las cargas de seed ──
export function combustibleAnomalo() {
  const por: Record<string, { l: number; km: number; n: number }> = {}
  for (const c of cargasCombustible) { const b = (por[c.unidad] ??= { l: 0, km: 0, n: 0 }); b.l += c.litros; b.km += c.kmGps; b.n++ }
  const filas = Object.entries(por).map(([id, b]) => ({ id, rend: Math.round(b.km / b.l * 10) / 10, cargas: b.n, vehiculo: unidades.find(u => u.id === id)?.vehiculo ?? '' })).sort((a, b) => a.rend - b.rend)
  const prom = Math.round(filas.reduce((a, f) => a + f.rend, 0) / filas.length * 10) / 10
  const malas = filas.filter(f => f.rend < 6.5)
  const texto = `${malas.slice(0, 2).map(f => f.id).join(' y ')} rinden ${malas.slice(0, 2).map(f => f.rend.toFixed(1)).join(' y ')} km/l, ${Math.round((1 - malas[0].rend / prom) * 100)}% por debajo del promedio de la flotilla (${prom} km/l); ${malas.length} unidades tienen cargas que no cuadran con sus kilómetros GPS. Sugiero revisión en taller y auditoría de tarjeta.`
  return { data: [...filas.slice(0, 2), ...filas.slice(-3)].map(f => [f.id, f.rend] as [string, number]), malas, texto, prom }
}

// ── Documentos por vencer este mes ──
export function documentosPorVencer() {
  const docs = docsPorVencer(custodios).sort((a, b) => parseInt(/\d+/.exec(a.doc.v)![0]) - parseInt(/\d+/.exec(b.doc.v)![0]))
  const texto = `${docs.length} documentos de ${new Set(docs.map(d => d.custodio.id)).size} custodios vencen en los próximos ${DIAS_DOCS} días: ${pl(docs.filter(d => d.doc.k.startsWith('Licencia')).length, 'licencia federal', 'licencias federales')}, ${pl(docs.filter(d => d.doc.k.startsWith('Portación')).length, 'portación', 'portaciones')} y ${pl(docs.filter(d => d.doc.k.startsWith('Evaluación')).length, 'evaluación de confianza', 'evaluaciones de confianza')}. ${docs.filter(d => d.doc.estado === 'bad').length} vencen en menos de 2 semanas; conviene programar renovación ya.`
  return { docs, texto }
}

/** Zona mencionada en una pregunta libre, si la hay. */
export function zonaEnTexto(t: string): Zona | null {
  const n = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return ZONAS.find(z => n.includes(z.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))) ?? null
}
export function disponiblesEnZona(z: Zona) {
  const cz = custodios.filter(c => c.zona === z)
  const disp = cz.filter(c => c.estatus === 'Disponible')
  return { disp, texto: `En ${z} hay ${disp.length} custodios disponibles ahora de una plantilla de ${cz.length} (${cz.filter(c => c.estatus === 'En servicio').length} en servicio, ${cz.filter(c => c.estatus === 'Asignado').length} asignados, ${cz.filter(c => c.estatus === 'Descanso').length} en descanso). Los mejor calificados: ${[...disp].sort((a, b) => b.calificacion - a.calificacion).slice(0, 3).map(c => `${c.nombre} (${c.calificacion.toFixed(1)}, ${c.base})`).join(', ')}.` }
}

// ── Insights fijados al dashboard ("Agregar al dashboard") ──
export type Insight = { key: string; q: string; a: string; to: string }
const KEY = 'ai27-asistente-pins-v1'
let pins: Insight[] = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } })()
const subs = new Set<() => void>()
const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(pins)) } catch { /* sin storage */ } subs.forEach(s => s()) }
export const usePins = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => pins)
export function togglePin(p: Insight) {
  pins = pins.some(x => x.key === p.key) ? pins.filter(x => x.key !== p.key) : [...pins, p]
  emit()
}
