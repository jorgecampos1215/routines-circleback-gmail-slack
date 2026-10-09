/**
 * Carga la seed data del demo (400 custodios, 600 unidades, 300 servicios, 40 incidentes, 486 colaboradores,
 * 25 clientes, taller y combustible) a tu proyecto de Supabase.
 *
 * Uso (desde ai27-plataforma/):
 *   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run seed:supabase
 * o con un archivo .env.local que tenga esas dos variables.
 *
 * Usa la llave service_role (solo en tu máquina, nunca en el navegador) porque las tablas tienen RLS.
 * Es idempotente: vuelve a correrlo las veces que quieras (upsert por id).
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { ZONAS, ZONA_PLANTILLA, clientes, custodios, unidades, ordenesTaller, cargasCombustible, servicios, incidentes, colaboradores } from '../src/data/seed'

config({ path: '.env.local', override: false })

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en el entorno o en .env.local).')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

async function upsert(tabla: string, filas: Record<string, unknown>[], onConflict = 'id') {
  for (let i = 0; i < filas.length; i += 500) {
    const lote = filas.slice(i, i + 500)
    const { error } = await db.from(tabla).upsert(lote, { onConflict })
    if (error) throw new Error(`${tabla}: ${error.message}`)
  }
  console.log(`✓ ${tabla}: ${filas.length} filas`)
}

async function main() {
  await upsert('zonas', ZONAS.map(z => ({ nombre: z, plantilla: ZONA_PLANTILLA[z].total, disponibles: ZONA_PLANTILLA[z].disponibles })), 'nombre')
  await upsert('clientes', clientes.map(c => ({ nombre: c.nombre, sector: c.sector, contacto: c.contacto, correo: c.correo, telefono: c.telefono, servicios_activos: c.serviciosActivos, servicios_trimestre: c.serviciosTrimestre, ingresos_mes: Math.round(c.ingresosMes), margen: c.margen, incidentes: c.incidentes, portal_en_vivo: c.portalEnVivo, desde: c.desde, cxc: c.cxc, dias_cobro: c.diasCobro })), 'nombre')
  await upsert('custodios', custodios.map(c => ({ id: c.id, nombre: c.nombre, zona: c.zona, base: c.base, estatus: c.estatus, asignacion: c.asignacion, horas_semana: c.horasSemana, calificacion: c.calificacion, docs: c.docs, documentos: c.documentos, telefono: c.telefono, ingreso: c.ingreso, servicios_acumulados: c.serviciosAcumulados, incidentes: c.incidentes, certificaciones: c.certificaciones, portacion: c.portacion, turnos: c.turnos })))
  await upsert('unidades', unidades.map(u => ({ id: u.id, vehiculo: u.vehiculo, placas: u.placas, zona: u.zona, custodio: u.custodio, servicio: u.servicio, gps: u.gps, poliza: u.poliza, poliza_vence: u.polizaVence, verificacion: u.verificacion, estatus: u.estatus, km: u.km, rendimiento: u.rendimiento, costo_mes: u.costoMes, anio: u.anio, vin: u.vin })))
  await upsert('ordenes_taller', ordenesTaller.map(o => ({ id: o.id, unidad: o.unidad, tipo: o.tipo, falla: o.falla, proveedor: o.proveedor, costo: o.costo, dias_fuera: o.diasFuera, estatus: o.estatus, fecha: o.fecha })))
  // cargas no tienen id natural: se reemplazan completas
  await db.from('cargas_combustible').delete().neq('id', 0)
  await upsert('cargas_combustible', cargasCombustible.map((c, i) => ({ id: i + 1, unidad: c.unidad, fecha: c.fecha, litros: c.litros, costo: c.costo, km_gps: c.kmGps, rendimiento: c.rendimiento, anomalo: c.anomalo })))
  await upsert('servicios', servicios.map(s => ({ id: s.id, cliente: s.cliente, tipo: s.tipo, zona: s.zona, ruta: s.ruta, estatus: s.estatus, custodios: s.custodios, unidad: s.unidad, monitorista: s.monitorista, inicio: s.inicio, monto: s.monto, fuente: s.fuente })))
  await upsert('incidentes', incidentes.map(x => ({ id: x.id, fecha: x.fecha, hora: x.hora, tipo: x.tipo, carretera: x.carretera, zona: x.zona, servicio: x.servicio, cliente: x.cliente, resultado: x.resultado, valor_carga: x.valorCarga, valor_recuperado: x.valorRecuperado, tiempo_reaccion_min: x.tiempoReaccionMin })))
  await upsert('colaboradores', colaboradores.map(c => ({ id: c.id, nombre: c.nombre, area: c.area, puesto: c.puesto, sede: c.sede, zona: c.zona, ingreso: c.ingreso, sueldo: c.sueldo, vacaciones_disponibles: c.vacacionesDisponibles, estatus: c.estatus })))
  console.log('Listo: la base tiene la seed data del demo.')
}

main().catch(e => { console.error(e.message); process.exit(1) })
