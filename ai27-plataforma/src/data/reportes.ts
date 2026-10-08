/**
 * Cifras de los reportes a partir de seed (servicios, incidentes, custodios, colaboradores, clientes, cartera).
 * Los filtros de la pantalla (periodo, zona, cliente, tipo) filtran de verdad las listas de seed; los reportes
 * sin base en seed (puntualidad, costo por km, rotación) conservan las cifras del diseño y se recortan proporcionalmente.
 */
import { ZONAS, colaboradores, custodios, incidentes, servicios, clientes, type Zona } from './seed'
import { antiguedad, facturasIniciales } from './finanzas'

export type Filtros = { periodo: string; zona: string; cliente: string; tipo: string }
export type Serie = [string, number][]
export type Resultado = { data: Serie; kpis?: [string, string][]; nota?: string }

const esSep = (iso: string) => iso.slice(5, 7) === '09'
const factorPeriodo = (p: string) => (p.startsWith('Año') ? 3.3 : 1)
const tipoDeId = (id: string) => (id.startsWith('DED') ? 'Dedicado' : id.startsWith('MON') ? 'Monitoreo' : 'Por evento')

function filtrarServicios(f: Filtros) {
  return servicios.filter(s =>
    (f.zona === 'Todas las zonas' || s.zona === f.zona) &&
    (f.cliente === 'Todos los clientes' || s.cliente === f.cliente) &&
    (f.tipo === 'Todos' || s.tipo === f.tipo) &&
    (!f.periodo.startsWith('Septiembre') || esSep(s.inicio)))
}
function filtrarIncidentes(f: Filtros) {
  return incidentes.filter(i =>
    (f.zona === 'Todas las zonas' || i.zona === f.zona) &&
    (f.cliente === 'Todos los clientes' || i.cliente === f.cliente) &&
    (f.tipo === 'Todos' || tipoDeId(i.servicio) === f.tipo) &&
    (!f.periodo.startsWith('Septiembre') || esSep(i.fecha)))
}
const zonas = (f: Filtros): Zona[] => (f.zona === 'Todas las zonas' ? [...ZONAS] : [f.zona as Zona])
const pct = (n: number) => n.toFixed(1) + '%'
const round1 = (n: number) => Math.round(n * 10) / 10

/** Reportes con base en seed. Devuelve null si el reporte no se calcula desde seed. */
export function desdeSeed(id: string, f: Filtros): Resultado | null {
  const k = factorPeriodo(f.periodo)
  switch (id) {
    case 'srv': {
      const sv = filtrarServicios(f)
      const conInc = new Set(filtrarIncidentes(f).map(i => i.servicio))
      const tipos = ['Por evento', 'Dedicado', 'Monitoreo'] as const
      const data: Serie = tipos.filter(t => f.tipo === 'Todos' || f.tipo === t).map(t => [t, Math.round(sv.filter(s => s.tipo === t).length * k)])
      const n = sv.length
      return { data, kpis: [['Servicios', String(Math.round(n * k))], ['Sin incidente', n ? pct(100 - sv.filter(s => conInc.has(s.id) || s.estatus === 'Con incidente').length / n * 100) : '—'], ['Activos', String(sv.filter(s => ['Confirmado', 'En tránsito'].includes(s.estatus)).length)]] }
    }
    case 'inc': {
      const inc = filtrarIncidentes(f)
      const porCarretera = new Map<string, number>()
      inc.forEach(i => porCarretera.set(i.carretera, (porCarretera.get(i.carretera) ?? 0) + 1))
      const data: Serie = [...porCarretera.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => [c, Math.round(n * k)])
      const robos = inc.filter(i => i.tipo === 'Robo')
      const rec = robos.length ? Math.round(robos.reduce((a, i) => a + i.valorRecuperado, 0) / robos.reduce((a, i) => a + i.valorCarga, 0) * 100) : 100
      const sv = filtrarServicios(f).length
      return { data, kpis: [['Incidentes', String(Math.round(inc.length * k))], ['Por 100 servicios', sv ? round1(inc.length / sv * 100).toFixed(1) : '—'], ['Recuperación', rec + '%']] }
    }
    case 'rea': {
      const inc = filtrarIncidentes(f)
      const data: Serie = zonas(f).map(z => { const xs = inc.filter(i => i.zona === z); return [z, xs.length ? Math.round(xs.reduce((a, i) => a + i.tiempoReaccionMin, 0) / xs.length) : 0] as [string, number] }).filter(d => d[1] > 0)
      const prom = inc.length ? Math.round(inc.reduce((a, i) => a + i.tiempoReaccionMin, 0) / inc.length) : 0
      const fuera = data.filter(d => d[1] > 20).map(d => d[0])
      return { data, kpis: [['Promedio', prom + ' min'], ['Meta', '20 min'], ['Fuera de meta', fuera.length ? fuera.join(', ') : 'Ninguna']] }
    }
    case 'uti': {
      const zs = zonas(f)
      const data: Serie = zs.map(z => { const cs = custodios.filter(c => c.zona === z); return [z, Math.round(cs.filter(c => c.estatus === 'En servicio' || c.estatus === 'Asignado').length / cs.length * 100)] })
      const cs = custodios.filter(c => zs.includes(c.zona))
      const docs = cs.filter(c => c.docs !== 'Al día' && !c.docs.startsWith('Sin asignar') && c.docs !== 'Exceso de horas').length
      return { data, kpis: [['Promedio', Math.round(cs.filter(c => c.estatus === 'En servicio' || c.estatus === 'Asignado').length / cs.length * 100) + '%'], ['Disponibles', String(cs.filter(c => c.estatus === 'Disponible').length)], ['Docs por vencer', String(docs)]] }
    }
    case 'cxc': {
      const fs = f.cliente === 'Todos los clientes' ? facturasIniciales : facturasIniciales.filter(x => x.cliente === f.cliente)
      const b = antiguedad(fs)
      const data: Serie = [['Al corriente', b.corriente / 1e6], ['1–30 días', b.d30 / 1e6], ['31–60 días', b.d60 / 1e6], ['+60 días', b.mas60 / 1e6]]
      const dias = fs.filter(x => x.estatus !== 'Cobrada')
      const dp = dias.length ? Math.round(dias.reduce((a, x) => a + x.dias * x.monto, 0) / Math.max(1, b.total)) : 0
      return { data, kpis: [['Por cobrar', '$' + (b.total / 1e6).toFixed(1) + 'M'], ['Días de cobro', String(dp)], ['+60 días', '$' + (b.mas60 / 1e6).toFixed(1) + 'M']] }
    }
    case 'hc': {
      const porArea = new Map<string, number>()
      colaboradores.filter(c => f.zona === 'Todas las zonas' || c.zona === f.zona).forEach(c => porArea.set(c.area, (porArea.get(c.area) ?? 0) + 1))
      const data: Serie = [...porArea.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => [a, n])
      const total = data.reduce((a, d) => a + d[1], 0)
      return { data, kpis: [['Headcount', String(total)], ['Custodios', String(porArea.get('Custodios') ?? 0)], ['Áreas', String(data.length)]] }
    }
    default:
      return null
  }
}

export const CLIENTES_FILTRO = ['Todos los clientes', ...clientes.map(c => c.nombre)]
export const ZONAS_FILTRO = ['Todas las zonas', ...ZONAS]
