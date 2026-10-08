/**
 * Datos de Finanzas derivados de seed: rentabilidad por cliente (clientes.ingresosMes/margen), por servicio
 * (servicios.monto por tipo), por unidad (unidades.costoMes) y cuentas por cobrar (clientes.cxc/diasCobro).
 * Los KPI "hero" del diseño (septiembre 2026: $14.1M ingresos, CxC $18.2M…) se conservan; las facturas del diseño van primero.
 */
import { clientes, servicios, unidades } from './seed'

export type Periodo = 'Septiembre 2026' | 'Agosto 2026' | 'Q3 2026 (jul–sep)' | 'Año 2026'
export const PERIODOS: Periodo[] = ['Septiembre 2026', 'Agosto 2026', 'Q3 2026 (jul–sep)', 'Año 2026']
/** Factor contra septiembre (mes del diseño): agosto = 1/1.037 (sept creció 3.7% vs agosto). */
export const FACTOR: Record<Periodo, number> = { 'Septiembre 2026': 1, 'Agosto 2026': 1 / 1.037, 'Q3 2026 (jul–sep)': 2.9, 'Año 2026': 8.6 }
export const ETIQUETA: Record<Periodo, string> = { 'Septiembre 2026': 'septiembre 2026', 'Agosto 2026': 'agosto 2026', 'Q3 2026 (jul–sep)': 'Q3 2026', 'Año 2026': 'año 2026' }

export type Renta = { n: string; rev: number; cost: number; detalle?: string }

/** Por cliente: ingresos mensuales y margen de seed (Alpura $5.05M · 38% → costo $3.13M, como el diseño). */
export const rentaPorCliente: Renta[] = [...clientes]
  .sort((a, b) => b.ingresosMes - a.ingresosMes)
  .map(c => ({ n: c.nombre, rev: c.ingresosMes, cost: c.ingresosMes * (1 - c.margen / 100), detalle: `${c.serviciosTrimestre} servicios en el trimestre` }))

/** Por tipo de servicio: monto del trimestre entre 3 = mensual; costo directo con el margen típico del tipo. */
const MARGEN_TIPO: Record<string, number> = { 'Por evento': 0.336, Dedicado: 0.28, Monitoreo: 0.41 }
export const rentaPorServicio: Renta[] = (['Por evento', 'Dedicado', 'Monitoreo'] as const).map(t => {
  const sv = servicios.filter(s => s.tipo === t)
  const rev = sv.reduce((a, s) => a + s.monto, 0) / 3
  return { n: t, rev, cost: rev * (1 - MARGEN_TIPO[t]), detalle: `${sv.length} servicios · ${sv.filter(s => ['Confirmado', 'En tránsito'].includes(s.estatus)).length} activos` }
})

/** Por unidad: las 5 del diseño primero; después las unidades operando por costo mensual (seed.unidades.costoMes). */
const UNIDADES_DISENO: [string, number, number][] = [['AU-3321', 0.41e6, 0.24e6], ['AU-1876', 0.38e6, 0.29e6], ['AU-2214', 0.35e6, 0.22e6], ['AU-2087', 0.29e6, 0.20e6], ['AU-1450', 0.12e6, 0.13e6]]
export const rentaPorUnidad: Renta[] = [
  ...UNIDADES_DISENO.map(([n, rev, cost]) => { const u = unidades.find(x => x.id === n); return { n, rev, cost, detalle: u ? `${u.vehiculo} · ${u.placas} · ${u.estatus}` : undefined } }),
  ...unidades
    .filter(u => u.estatus === 'Operando' && !UNIDADES_DISENO.some(d => d[0] === u.id))
    .sort((a, b) => b.costoMes - a.costoMes)
    .map(u => {
      // Ingreso atribuible: los servicios que usan la unidad (mensualizados) o, si no hay, costo con margen típico según rendimiento
      const sv = servicios.filter(s => s.unidad === u.id)
      const revSv = sv.reduce((a, s) => a + s.monto, 0) / 3
      const rev = revSv > u.costoMes * 1.1 ? revSv : u.costoMes / (1 - (0.22 + Math.min(0.2, (u.rendimiento - 7.5) / 17)))
      return { n: u.id, rev, cost: u.costoMes, detalle: `${u.vehiculo} · ${u.placas} · ${u.km.toLocaleString('es-MX')} km · ${u.rendimiento} km/l` }
    }),
]

export const GASTOS: [string, number][] = [['Nómina operativa', 4.9e6], ['Combustible', 1.8e6], ['Taller', 0.9e6], ['Viáticos', 0.8e6], ['Casetas', 0.7e6], ['Seguros', 0.6e6]]

// ───────────── Cuentas por cobrar ─────────────
export type Factura = { id: string; cliente: string; concepto: string; monto: number; dias: number; estatus: 'Registrada' | 'Cobrada' | 'Vencida' | 'Por vencer'; fecha: string }
const FACT_DISENO: [string, string, string, number, string][] = [
  ['F-9934', 'Alpura', 'Alpura · septiembre', 1.84e6, 'Registrada'],
  ['F-9921', 'Marsh', 'Marsh · eventos', 0.96e6, 'Cobrada'],
  ['F-9887', 'Farmacéutica Orión', 'Farmacéutica Orión', 1.12e6, '45 días'],
  ['F-9810', 'Bebidas del Golfo', 'Bebidas del Golfo', 0.62e6, '74 días'],
  ['F-9795', 'Grupo Textil Arrayán', 'Grupo Textil Arrayán', 0.48e6, '81 días'],
]
const TOTAL_CXC = 18.2e6
const fechaDe = (dias: number) => { const d = new Date(2026, 9, 8); d.setDate(d.getDate() - dias); return d.toISOString().slice(0, 10) }
const estatusDe = (dias: number): Factura['estatus'] => (dias > 30 ? 'Vencida' : dias > 20 ? 'Por vencer' : 'Registrada')

export const facturasIniciales: Factura[] = (() => {
  const hero: Factura[] = FACT_DISENO.map(([id, cliente, concepto, monto, s]) => {
    const dias = s === 'Cobrada' ? 0 : s === 'Registrada' ? 8 : parseInt(s)
    return { id, cliente, concepto, monto, dias, estatus: s === 'Cobrada' ? 'Cobrada' : s === 'Registrada' ? 'Registrada' : 'Vencida', fecha: fechaDe(dias) }
  })
  const heroClientes = new Set(FACT_DISENO.map(f => f[1]))
  const resto = clientes.filter(c => !heroClientes.has(c.nombre))
  // Escala los saldos de seed para que el total de la cartera sea el del diseño ($18.2M)
  const pendiente = hero.filter(f => f.estatus !== 'Cobrada').reduce((a, f) => a + f.monto, 0)
  const k = (TOTAL_CXC - pendiente) / resto.reduce((a, c) => a + c.cxc, 0)
  return [...hero, ...resto.map((c, i) => {
    const monto = Math.round(c.cxc * k / 1000) * 1000
    return { id: 'F-' + (9790 - i * 3), cliente: c.nombre, concepto: `${c.nombre} · ${c.serviciosActivos > 0 ? 'servicios septiembre' : 'cierre de trimestre'}`, monto, dias: c.diasCobro, estatus: estatusDe(c.diasCobro), fecha: fechaDe(c.diasCobro) }
  })]
})()

export type Buckets = { corriente: number; d30: number; d60: number; mas60: number; total: number }
export function antiguedad(fs: Factura[]): Buckets {
  const b: Buckets = { corriente: 0, d30: 0, d60: 0, mas60: 0, total: 0 }
  for (const f of fs) {
    if (f.estatus === 'Cobrada') continue
    b.total += f.monto
    if (f.dias <= 0 || f.estatus === 'Registrada') b.corriente += f.monto
    else if (f.dias <= 30) b.d30 += f.monto
    else if (f.dias <= 60) b.d60 += f.monto
    else b.mas60 += f.monto
  }
  return b
}

export const diasCobroPromedio = (fs: Factura[]) => {
  const p = fs.filter(f => f.estatus !== 'Cobrada')
  return p.length ? Math.round(p.reduce((a, f) => a + f.dias * f.monto, 0) / p.reduce((a, f) => a + f.monto, 0)) : 0
}
