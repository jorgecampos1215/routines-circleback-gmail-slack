/**
 * Genera supabase/demo_completo.sql: el esquema (supabase/migrations/*.sql) más toda la seed data del demo
 * como INSERTs idempotentes (ON CONFLICT ... DO UPDATE). Sirve para pegarlo tal cual en el SQL Editor de
 * Supabase y tener la base lista sin CLI, tokens ni GitHub Actions.
 *
 * Uso (desde ai27-plataforma/):  npm run sql:demo
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZONAS, ZONA_PLANTILLA, clientes, custodios, unidades, ordenesTaller, cargasCombustible, servicios, incidentes, colaboradores } from '../src/data/seed'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirMigraciones = join(raiz, 'supabase', 'migrations')
const salida = join(raiz, 'supabase', 'demo_completo.sql')

type Valor = string | number | boolean | null | undefined
type Fila = Record<string, Valor | string[] | object>

function lit(v: Valor | string[] | object): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
  if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
    return v.length ? `ARRAY[${v.map(x => lit(x)).join(',')}]::text[]` : `'{}'::text[]`
  }
  const json = JSON.stringify(v)
  return json.includes('$json$') ? `${lit(json)}::jsonb` : `$json$${json}$json$::jsonb`
}

function insertar(tabla: string, pk: string, filas: Fila[], lote = 100): string {
  if (!filas.length) return ''
  const cols = Object.keys(filas[0])
  const set = cols.filter(c => c !== pk).map(c => `${c} = excluded.${c}`).join(', ')
  const partes: string[] = [`-- ${tabla}: ${filas.length} filas`]
  for (let i = 0; i < filas.length; i += lote) {
    const valores = filas.slice(i, i + lote).map(f => `  (${cols.map(c => lit(f[c] as Valor)).join(', ')})`).join(',\n')
    partes.push(`insert into ${tabla} (${cols.join(', ')}) values\n${valores}\non conflict (${pk}) do update set ${set};`)
  }
  return partes.join('\n') + '\n'
}

const esquema = readdirSync(dirMigraciones).filter(f => f.endsWith('.sql')).sort()
  .map(f => `-- ── ${f} ──\n${readFileSync(join(dirMigraciones, f), 'utf8').trim()}\n`).join('\n')

const seed = [
  insertar('zonas', 'nombre', ZONAS.map(z => ({ nombre: z, plantilla: ZONA_PLANTILLA[z].total, disponibles: ZONA_PLANTILLA[z].disponibles }))),
  insertar('clientes', 'nombre', clientes.map(c => ({ nombre: c.nombre, sector: c.sector, contacto: c.contacto, correo: c.correo, telefono: c.telefono, servicios_activos: c.serviciosActivos, servicios_trimestre: c.serviciosTrimestre, ingresos_mes: Math.round(c.ingresosMes), margen: c.margen, incidentes: c.incidentes, portal_en_vivo: c.portalEnVivo, desde: c.desde, cxc: c.cxc, dias_cobro: c.diasCobro }))),
  insertar('custodios', 'id', custodios.map(c => ({ id: c.id, nombre: c.nombre, zona: c.zona, base: c.base, estatus: c.estatus, asignacion: c.asignacion, horas_semana: c.horasSemana, calificacion: c.calificacion, docs: c.docs, documentos: c.documentos, telefono: c.telefono, ingreso: c.ingreso, servicios_acumulados: c.serviciosAcumulados, incidentes: c.incidentes, certificaciones: c.certificaciones, portacion: c.portacion, turnos: c.turnos }))),
  insertar('unidades', 'id', unidades.map(u => ({ id: u.id, vehiculo: u.vehiculo, placas: u.placas, zona: u.zona, custodio: u.custodio, servicio: u.servicio, gps: u.gps, poliza: u.poliza, poliza_vence: u.polizaVence, verificacion: u.verificacion, estatus: u.estatus, km: u.km, rendimiento: u.rendimiento, costo_mes: u.costoMes, anio: u.anio, vin: u.vin }))),
  insertar('ordenes_taller', 'id', ordenesTaller.map(o => ({ id: o.id, unidad: o.unidad, tipo: o.tipo, falla: o.falla, proveedor: o.proveedor, costo: o.costo, dias_fuera: o.diasFuera, estatus: o.estatus, fecha: o.fecha }))),
  // Las cargas no tienen id natural: se reemplazan completas y se reajusta la secuencia.
  'delete from cargas_combustible;\n' +
  insertar('cargas_combustible', 'id', cargasCombustible.map((c, i) => ({ id: i + 1, unidad: c.unidad, fecha: c.fecha, litros: c.litros, costo: c.costo, km_gps: c.kmGps, rendimiento: c.rendimiento, anomalo: c.anomalo }))) +
  `select setval('cargas_combustible_id_seq', (select coalesce(max(id), 1) from cargas_combustible));\n`,
  insertar('servicios', 'id', servicios.map(s => ({ id: s.id, cliente: s.cliente, tipo: s.tipo, zona: s.zona, ruta: s.ruta, estatus: s.estatus, custodios: s.custodios, unidad: s.unidad, monitorista: s.monitorista, inicio: s.inicio, monto: s.monto, fuente: s.fuente }))),
  insertar('incidentes', 'id', incidentes.map(x => ({ id: x.id, fecha: x.fecha, hora: x.hora, tipo: x.tipo, carretera: x.carretera, zona: x.zona, servicio: x.servicio, cliente: x.cliente, resultado: x.resultado, valor_carga: x.valorCarga, valor_recuperado: x.valorRecuperado, tiempo_reaccion_min: x.tiempoReaccionMin }))),
  insertar('colaboradores', 'id', colaboradores.map(c => ({ id: c.id, nombre: c.nombre, area: c.area, puesto: c.puesto, sede: c.sede, zona: c.zona, ingreso: c.ingreso, sueldo: c.sueldo, vacaciones_disponibles: c.vacacionesDisponibles, estatus: c.estatus }))),
].join('\n')

const encabezado = `-- ============================================================================
-- AI27 · Base de datos del demo, lista para pegar en Supabase
-- ----------------------------------------------------------------------------
-- Cómo usarlo: Supabase → tu proyecto → SQL Editor → New query → pega TODO este
-- archivo → Run. Tarda unos segundos. Crea las tablas, la seguridad del demo y
-- carga la seed data: ${custodios.length} custodios, ${unidades.length} unidades, ${servicios.length} servicios,
-- ${incidentes.length} incidentes, ${colaboradores.length} colaboradores, ${clientes.length} clientes, ${ordenesTaller.length} órdenes de taller y
-- ${cargasCombustible.length} cargas de combustible.
--
-- Se puede volver a ejecutar las veces que quieras: no duplica nada.
-- Generado por scripts/exportar-sql.ts a partir de supabase/migrations/ y src/data/seed.ts.
-- ============================================================================

begin;

`

const pie = `
commit;

-- Listo. Comprueba con:  select count(*) from custodios;   -- debe dar ${custodios.length}
`

mkdirSync(dirname(salida), { recursive: true })
writeFileSync(salida, encabezado + esquema + '\n-- ───────────────────────── Seed data ─────────────────────────\n' + seed + pie)
const kb = Math.round(Buffer.byteLength(readFileSync(salida)) / 1024)
console.log(`✓ ${salida} (${kb} KB)`)
