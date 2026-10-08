/**
 * Datos del Dashboard (Main) derivados de seed.ts según los 4 filtros (periodo, zona, cliente, tipo).
 * Regla: con los filtros por defecto (Octubre 2026 · Todas · Todos · Todos) las cifras son exactamente las del diseño.
 * - Conteos (servicios activos, custodios, unidades, clientes, disponibles por zona) salen directo de seed.
 * - Importes y tasas que en seed no existen con ese valor (ingresos $14.8M, 1.4 inc/100, $8.4M recuperado…) se
 *   calculan como la cifra del diseño × la participación del subconjunto filtrado en seed, así filtran de verdad.
 */
import { custodios, servicios, unidades, incidentes, clientes, ZONAS, ZONA_PLANTILLA, type Zona, type Servicio, type Custodio, type Unidad, type Incidente, type TipoServicio } from './seed'
import { ROUTES } from '../lib/routes'

export type Periodo = 'Octubre 2026' | 'Septiembre 2026' | 'Q3 2026'
export type Filtros = { periodo: Periodo; zona: 'Todas' | Zona; cliente: 'Todos' | string; tipo: 'Todos' | TipoServicio }
export const FILTROS_DEFAULT: Filtros = { periodo: 'Octubre 2026', zona: 'Todas', cliente: 'Todos', tipo: 'Todos' }
export const PERIODOS: Periodo[] = ['Octubre 2026', 'Septiembre 2026', 'Q3 2026']
export const TIPOS: TipoServicio[] = ['Por evento', 'Dedicado', 'Monitoreo']

const mes = (iso: string) => parseInt(iso.slice(5, 7))
/** Meses de servicios que cuenta cada periodo (para ingresos y servicios). */
const MESES_PERIODO: Record<Periodo, number[]> = { 'Octubre 2026': [10], 'Septiembre 2026': [9], 'Q3 2026': [7, 8, 9] }
/** Meses que muestra la gráfica de ingresos (la de Octubre muestra la tendencia jul–oct, como el diseño). */
const MESES_GRAFICA: Record<Periodo, number[]> = { 'Octubre 2026': [7, 8, 9, 10], 'Septiembre 2026': [7, 8, 9], 'Q3 2026': [7, 8, 9] }
/** Ventana de incidentes: el dashboard mira el trimestre móvil (jul–oct) en el periodo actual. */
const MESES_INCIDENTES: Record<Periodo, number[]> = { 'Octubre 2026': [7, 8, 9, 10], 'Septiembre 2026': [9], 'Q3 2026': [7, 8, 9] }
const tipoDeId = (id: string): TipoServicio | null => id.includes('SRV-') ? 'Por evento' : id.includes('DED-') ? 'Dedicado' : id.includes('MON-') ? 'Monitoreo' : null
const ACTIVO = (s: Servicio) => s.estatus === 'Confirmado' || s.estatus === 'En tránsito'
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0)
/** Cifra del diseño escalada por la participación del subconjunto filtrado. */
const escala = (diseño: number, parte: number, total: number) => (total === 0 ? 0 : diseño * parte / total)

export function filtrarServicios(f: Filtros, periodo = true): Servicio[] {
  return servicios.filter(s => (!periodo || MESES_PERIODO[f.periodo].includes(mes(s.inicio))) && (f.zona === 'Todas' || s.zona === f.zona) && (f.cliente === 'Todos' || s.cliente === f.cliente) && (f.tipo === 'Todos' || s.tipo === f.tipo))
}
export function filtrarCustodios(f: Filtros): Custodio[] {
  return custodios.filter(c => (f.zona === 'Todas' || c.zona === f.zona) && (f.cliente === 'Todos' || c.asignacion.startsWith(f.cliente)) && (f.tipo === 'Todos' || f.tipo === 'Monitoreo' || tipoDeId(c.asignacion) === f.tipo))
}
export function filtrarUnidades(f: Filtros): Unidad[] {
  return unidades.filter(u => (f.zona === 'Todas' || u.zona === f.zona) && (f.cliente === 'Todos' || u.servicio.startsWith(f.cliente)) && (f.tipo === 'Todos' || f.tipo === 'Monitoreo' || tipoDeId(u.servicio) === f.tipo))
}
export function filtrarIncidentes(f: Filtros): Incidente[] {
  return incidentes.filter(i => MESES_INCIDENTES[f.periodo].includes(mes(i.fecha)) && (f.zona === 'Todas' || i.zona === f.zona) && (f.cliente === 'Todos' || i.cliente === f.cliente) && (f.tipo === 'Todos' || tipoDeId(i.servicio) === f.tipo))
}
const serviciosVentanaIncidentes = (f: Filtros) => servicios.filter(s => MESES_INCIDENTES[f.periodo].includes(mes(s.inicio)) && (f.zona === 'Todas' || s.zona === f.zona) && (f.cliente === 'Todos' || s.cliente === f.cliente) && (f.tipo === 'Todos' || s.tipo === f.tipo))

/** Ingresos del diseño por mes y tipo (millones MXN): Jul $12.9M · Ago $13.6M · Sep $14.1M · Oct* $14.8M. */
const INGRESOS_DISEÑO: Record<number, [string, number, number, number]> = { 7: ['Jul', 5.6, 5.1, 2.2], 8: ['Ago', 5.9, 5.3, 2.4], 9: ['Sep', 6.1, 5.4, 2.6], 10: ['Oct*', 6.4, 5.6, 2.8] }

export function ingresosPorMes(f: Filtros, meses = MESES_GRAFICA[f.periodo]) {
  return meses.map(m => {
    const [name, e, d, mo] = INGRESOS_DISEÑO[m]
    const todos = servicios.filter(s => mes(s.inicio) === m)
    const filt = filtrarServicios(f, false).filter(s => mes(s.inicio) === m)
    const parte = (t: TipoServicio, diseño: number) => escala(diseño, sum(filt.filter(s => s.tipo === t), s => s.monto), sum(todos.filter(s => s.tipo === t), s => s.monto))
    const evt = parte('Por evento', e), ded = parte('Dedicado', d), mon = parte('Monitoreo', mo)
    return { name, mes: m, evt, ded, mon, total: evt + ded + mon, enPeriodo: MESES_PERIODO[f.periodo].includes(m) }
  })
}

export function kpis(f: Filtros) {
  const svc = filtrarServicios(f)
  const esOct = f.periodo === 'Octubre 2026'
  const act = esOct ? svc.filter(ACTIVO) : svc
  const porTipo = (t: TipoServicio) => act.filter(s => s.tipo === t).length

  const cus = filtrarCustodios(f)
  const plantilla = custodios.filter(c => f.zona === 'Todas' || c.zona === f.zona).length
  const enServicio = cus.filter(c => c.estatus === 'En servicio' || c.estatus === 'Asignado').length

  const inc = filtrarIncidentes(f)
  const svcVentana = serviciosVentanaIncidentes(f)
  const incTodos = incidentes.filter(i => MESES_INCIDENTES[f.periodo].includes(mes(i.fecha)))
  const svcTodos = servicios.filter(s => MESES_INCIDENTES[f.periodo].includes(mes(s.inicio)))
  // 1.4 incidentes por cada 100 servicios en el diseño; se escala por la tasa relativa del subconjunto.
  const tasa = svcVentana.length === 0 ? 0 : 1.4 * (inc.length / Math.max(1, incTodos.length)) / (svcVentana.length / Math.max(1, svcTodos.length))
  const incPor100 = Math.round(tasa * 10) / 10

  const uni = filtrarUnidades(f)
  const uniTotal = f.cliente === 'Todos' && f.tipo === 'Todos' ? uni.length : unidades.filter(u => f.zona === 'Todas' || u.zona === f.zona).length
  const operando = uni.filter(u => u.estatus === 'Operando').length
  const taller = unidades.filter(u => (f.zona === 'Todas' || u.zona === f.zona) && u.estatus === 'En taller').length

  const meses = ingresosPorMes(f)
  const ingresos = sum(meses.filter(m => m.enPeriodo), m => m.total)
  // Margen 31% del diseño ponderado por el margen de los clientes del subconjunto.
  const margenPond = (xs: Servicio[]) => { const t = sum(xs, s => s.monto); return t === 0 ? 0 : sum(xs, s => s.monto * (clientes.find(c => c.nombre === s.cliente)?.margen ?? 30)) / t }
  const margen = svc.length === 0 ? 0 : Math.round(escala(31, margenPond(svc), margenPond(servicios.filter(s => MESES_PERIODO[f.periodo].includes(mes(s.inicio))))))

  return {
    activos: act.length, esOct, evento: porTipo('Por evento'), dedicado: porTipo('Dedicado'), monitoreo: porTipo('Monitoreo'),
    enServicio, plantilla, utilizacion: plantilla === 0 ? 0 : Math.round(enServicio / plantilla * 100),
    sinIncidente: Math.round((100 - incPor100) * 10) / 10, incPor100,
    operando, uniTotal, taller, pctOperando: uniTotal === 0 ? 0 : Math.round(operando / uniTotal * 100),
    ingresos, margen, meses,
  }
}

export function custodiosPorZona(f: Filtros) {
  const zonas = f.zona === 'Todas' ? [...ZONAS] : [f.zona]
  const filas = zonas.map(z => {
    const cz = custodios.filter(c => c.zona === z)
    return { name: z, avail: cz.filter(c => c.estatus === 'Disponible').length, total: cz.length }
  })
  const fuera = custodios.filter(c => (f.zona === 'Todas' || c.zona === f.zona) && (c.estatus === 'Descanso' || c.estatus === 'Vacaciones' || c.estatus === 'Incapacidad')).length
  return { filas, fuera }
}

export type Alerta = { level: 'Crítica' | 'Alta' | 'Media' | 'Baja'; cls: string; title: string; detail: string; when: string; to: string; zona?: Zona; cliente?: string; tipo?: TipoServicio }

/** Documentos de custodios que vencen en ≤ 20 días (en seed son 14 con todos los filtros, como en el diseño). */
export const DIAS_DOCS = 20
export const docsPorVencer = (cs: Custodio[]) => cs.flatMap(c => c.documentos.filter(d => { const m = /vence en (\d+)/.exec(d.v); return m && parseInt(m[1]) <= DIAS_DOCS }).map(d => ({ custodio: c, doc: d })))

export function alertas(f: Filtros): Alerta[] {
  const cs = filtrarCustodios(f)
  const docs = docsPorVencer(custodios.filter(c => f.zona === 'Todas' || c.zona === f.zona))
  const fijas: Alerta[] = [
    { level: 'Crítica', cls: 'pill p-bad', title: 'Desvío de ruta · SRV-24817 · Alpura', detail: 'Méx–Qro km 142 · 1.6 km fuera de geocerca · Samsara', when: 'hace 2 min', to: ROUTES.Monitoreo, zona: 'Centro', cliente: 'Alpura', tipo: 'Por evento' },
    { level: 'Alta', cls: 'pill p-bad', title: 'Separación custodio–tráiler 1.8 km', detail: 'SRV-24803 · Marsh · Arco Norte', when: 'hace 6 min', to: ROUTES.Monitoreo, zona: 'Centro', cliente: 'Marsh', tipo: 'Por evento' },
    { level: 'Alta', cls: 'pill p-warn', title: 'Pérdida de señal GPS 9 min', detail: 'Unidad C-214 · Puebla–Orizaba · Ruptela', when: 'hace 9 min', to: ROUTES.Monitoreo, zona: 'Centro', cliente: 'Bebidas del Golfo', tipo: 'Por evento' },
    { level: 'Media', cls: 'pill p-warn', title: 'Hueco de cobertura en Bajío', detail: 'Mañana: 18 servicios, 12 custodios disponibles', when: 'IA', to: ROUTES.AsignacionIA, zona: 'Bajío' },
  ]
  const out = fijas.filter(a => (f.zona === 'Todas' || a.zona === f.zona) && (f.cliente === 'Todos' || !a.cliente || a.cliente === f.cliente) && (f.tipo === 'Todos' || !a.tipo || a.tipo === f.tipo))
  if (docs.length && f.cliente === 'Todos' && f.tipo === 'Todos') out.push({ level: 'Media', cls: 'pill p-mute', title: `${docs.length} documentos vencen en ${DIAS_DOCS} días`, detail: 'Portación, licencia federal y evaluación de confianza', when: 'hoy', to: ROUTES.Custodios })
  // Derivadas de seed (bajas): aparecen al pedir "ver más" o cuando los filtros dejan fuera a las fijas.
  const exceso = cs.filter(c => c.docs === 'Exceso de horas')
  if (exceso.length) out.push({ level: 'Baja', cls: 'pill p-mute', title: `${exceso.length} custodio${exceso.length > 1 ? 's' : ''} con exceso de horas`, detail: exceso.slice(0, 3).map(c => `${c.nombre} (${c.horasSemana} h)`).join(' · '), when: 'semana', to: ROUTES.Custodios })
  const sinAsignar = cs.filter(c => c.docs.startsWith('Sin asignar'))
  if (sinAsignar.length) out.push({ level: 'Baja', cls: 'pill p-mute', title: `${sinAsignar.length} custodio${sinAsignar.length > 1 ? 's' : ''} sin asignar más de 5 días`, detail: sinAsignar.slice(0, 3).map(c => `${c.nombre} · ${c.base}`).join(' · '), when: 'hoy', to: ROUTES.Custodios })
  const polizas = filtrarUnidades(f).filter(u => u.poliza.startsWith('vence') && u.estatus !== 'Baja')
  if (polizas.length) out.push({ level: 'Baja', cls: 'pill p-mute', title: `${polizas.length} pólizas de unidades vencen en el trimestre`, detail: polizas.slice(0, 3).map(u => `${u.id} ${u.poliza}`).join(' · '), when: 'flotilla', to: ROUTES.Flotilla })
  const conInc = filtrarServicios(f).filter(s => s.estatus === 'Con incidente')
  if (conInc.length) out.push({ level: 'Baja', cls: 'pill p-warn', title: `${conInc.length} servicio${conInc.length > 1 ? 's' : ''} con incidente en el periodo`, detail: conInc.slice(0, 3).map(s => `${s.id} · ${s.cliente}`).join(' · '), when: 'periodo', to: ROUTES.Reaccion })
  return out
}

const CARRETERAS_DISEÑO: [string, number][] = [['Arco Norte', 7], ['Méx–Puebla–Orizaba', 6], ['Méx–Querétaro', 5], ['Querétaro–SLP', 4]]
export function seguridad(f: Filtros) {
  const inc = filtrarIncidentes(f)
  const todos = incidentes.filter(i => MESES_INCIDENTES[FILTROS_DEFAULT.periodo].includes(mes(i.fecha)))
  const avg = (xs: Incidente[]) => (xs.length ? sum(xs, i => i.tiempoReaccionMin) / xs.length : 0)
  const recup = (xs: Incidente[]) => { const robos = xs.filter(i => i.tipo === 'Robo'); return robos.length ? robos.filter(i => i.resultado !== 'Pérdida').length / robos.length : 0 }
  const carreteras = CARRETERAS_DISEÑO.map(([name, n]) => ({ name, n: Math.round(escala(n, inc.filter(i => i.carretera === name).length, todos.filter(i => i.carretera === name).length)) }))
  // Otras carreteras de seed que sí tienen incidentes en el subconjunto pero no están en el diseño
  const otras = [...new Set(inc.map(i => i.carretera))].filter(c => !CARRETERAS_DISEÑO.some(([n]) => n === c)).map(name => ({ name, n: Math.round(escala(4, inc.filter(i => i.carretera === name).length, todos.filter(i => i.carretera === name).length)) })).filter(x => x.n > 0)
  return {
    n: inc.length,
    reaccion: inc.length ? Math.round(escala(18, avg(inc), avg(todos))) : 0,
    recuperacion: inc.length ? Math.round(escala(72, recup(inc) || recup(todos), recup(todos))) : 0,
    recuperado: escala(8.4, sum(inc, i => i.valorRecuperado), sum(todos, i => i.valorRecuperado)),
    perdido: escala(3.2, sum(inc, i => i.valorCarga - i.valorRecuperado), sum(todos, i => i.valorCarga - i.valorRecuperado)),
    carreteras: [...carreteras, ...otras].sort((a, b) => b.n - a.n).slice(0, 4),
  }
}

export function comercial(f: Filtros) {
  const svcZona = servicios.filter(s => f.zona === 'Todas' || s.zona === f.zona).filter(s => f.tipo === 'Todos' || s.tipo === f.tipo)
  const cl = clientes.filter(c => (f.cliente === 'Todos' || c.nombre === f.cliente) && svcZona.some(s => s.cliente === c.nombre))
  const top5 = (xs: typeof clientes) => { const ing = xs.map(c => c.ingresosMes).sort((a, b) => b - a); const t = sum(ing, x => x); return t ? sum(ing.slice(0, 5), x => x) / t : 0 }
  const dias = (xs: typeof clientes) => (xs.length ? sum(xs, c => c.diasCobro) / xs.length : 0)
  const plantillaZona = f.zona === 'Todas' ? 400 : ZONA_PLANTILLA[f.zona].total
  return {
    clientesActivos: cl.length,
    top5: Math.round(escala(47, top5(cl), top5(clientes))),
    diasCobro: Math.round(escala(38, dias(cl), dias(clientes))),
    cierre: f.cliente === 'Todos' ? 42 : Math.min(100, Math.round(escala(42, cl[0]?.margen ?? 31, 31))),
    vacantes: Math.round(23 * plantillaZona / 400),
    rotacion: 3.1,
  }
}

export const fmtM = (v: number) => '$' + v.toFixed(1) + 'M'

/** CSV con todo lo visible del dashboard para el botón Exportar. */
export function csvDashboard(f: Filtros) {
  const k = kpis(f), z = custodiosPorZona(f), s = seguridad(f), c = comercial(f)
  const L: string[][] = [['AI27 · Operación hoy', `${f.periodo} · ${f.zona} · ${f.cliente} · ${f.tipo}`]]
  L.push([], ['KPI', 'Valor', 'Detalle'])
  L.push([k.esOct ? 'Servicios activos' : 'Servicios del periodo', String(k.activos), `${k.evento} evento · ${k.dedicado} dedicado · ${k.monitoreo} monitoreo`])
  L.push(['Utilización custodios', k.utilizacion + '%', `${k.enServicio} de ${k.plantilla} en servicio`])
  L.push(['Entregas sin incidente', k.sinIncidente + '%', ''], ['Incidentes / 100 servicios', String(k.incPor100), ''])
  L.push(['Unidades operando', k.pctOperando + '%', `${k.operando} de ${k.uniTotal} · ${k.taller} en taller`])
  L.push(['Ingresos del periodo', fmtM(k.ingresos), `Margen ${k.margen}%`])
  L.push([], ['Zona', 'Disponibles', 'Plantilla'], ...z.filas.map(r => [r.name, String(r.avail), String(r.total)]))
  L.push([], ['Mes', 'Por evento', 'Dedicado', 'Monitoreo', 'Total'], ...k.meses.map(m => [m.name, m.evt.toFixed(2), m.ded.toFixed(2), m.mon.toFixed(2), m.total.toFixed(2)]))
  L.push([], ['Seguridad', 'Valor'], ['Tiempo de reacción (min)', String(s.reaccion)], ['% recuperación', String(s.recuperacion)], ['Recuperado (M)', s.recuperado.toFixed(2)], ['Perdido (M)', s.perdido.toFixed(2)], ...s.carreteras.map(r => ['Incidentes · ' + r.name, String(r.n)]))
  L.push([], ['Comercial y RH', 'Valor'], ['Cierre cotizaciones', c.cierre + '%'], ['Clientes activos', String(c.clientesActivos)], ['Top 5 concentración', c.top5 + '%'], ['Días de cobro', String(c.diasCobro)], ['Vacantes abiertas', String(c.vacantes)], ['Rotación mensual', c.rotacion + '%'])
  L.push([], ['Nivel', 'Alerta', 'Detalle', 'Cuándo'], ...alertas(f).map(a => [a.level, a.title, a.detail, a.when]))
  return L.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function descargarCSV(nombre: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
