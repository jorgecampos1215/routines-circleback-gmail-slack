/**
 * Datos del CRM derivados de seed (clientes, servicios, incidentes) + clientes dados de alta en el store.
 * Las cifras "hero" del diseño (Alpura $14.6M · 38% · 14 activos, etc.) se conservan para los 10 clientes del diseño.
 */
import { clientes as seedClientes, servicios, incidentes, type Cliente, type Servicio, type Incidente } from './seed'
import type { ClienteNuevo } from '../lib/store'

export type Modelo = 'Por evento' | 'Dedicado' | 'Monitoreo' | 'Evento + monitoreo'
export type ClienteCRM = {
  nombre: string
  modelo: Modelo
  sector: string
  desde: string // año
  activos: number
  trimestre: number // MXN facturado en el trimestre
  ingresosMes: number
  margen: number // %
  incidentes: number
  cobranza: string // 'Al corriente' | 'N días'
  diasCobro: number
  cxc: number
  ultimo: string // 'hoy' | 'ayer' | 'hace N días' | 'continuo'
  contacto: string
  contacto2: string
  correo: string
  telefono: string
  rutas: string
  tarifa: string
  requisitos: string
  portal: boolean
  nuevo?: boolean
}

/** Filas del diseño: [modelo, activos, trimestre $M, margen, cobranza, último, contacto1 rol, contacto2 rol, rutas, tarifa, requisitos, desde] */
const DISENO: Record<string, [Modelo, number, number, number, string, string, string, string, string, string, string, string]> = {
  'Alpura': ['Por evento', 14, 14.6, 38, 'Al corriente', 'hoy', 'Gerente de logística', 'Seguridad corporativa', 'Cuautitlán–Guadalajara, Cuautitlán–Querétaro, Cuautitlán–Puebla', '$30.50/km · 2 custodios nocturno', 'Cadena de frío: check-in de temperatura en cada parada', '2019'],
  'Marsh': ['Evento + monitoreo', 9, 11.2, 34, 'Al corriente', 'hoy', 'Riesgos de transporte', 'Siniestros', 'Arco Norte, Méx–SLP', '$31.00/km · monitoreo $900/unidad', 'Reporte post-incidente en 24 h para aseguradora', '2021'],
  'Farmacéutica Orión': ['Por evento', 6, 8.4, 29, '45 días', 'hoy', 'Distribución', 'Compras', 'Toluca–Monterrey, Toluca–Guadalajara', '$29.00/km', 'Custodios con certificación de carga farmacéutica', '2020'],
  'Electrónica del Bajío': ['Dedicado', 2, 5.6, 33, 'Al corriente', 'continuo', 'Seguridad patrimonial', '—', 'León–Lázaro Cárdenas', '$48,000/mes por custodio', 'Rotación de custodios cada 6 meses', '2022'],
  'Logística Pacífico Norte': ['Monitoreo', 1, 3.9, 41, 'Al corriente', 'continuo', 'Torre de control', '—', '48 unidades propias', '$900/unidad/mes', 'SLA 5 minutos 24/7', '2024'],
  'Bebidas del Golfo': ['Por evento', 3, 3.2, 27, '74 días', 'ayer', 'Logística', '—', 'Veracruz–Puebla, Veracruz–CDMX', '$27.50/km', 'Ventanas de entrega nocturnas', '2024'],
  'Grupo Textil Arrayán': ['Por evento', 0, 1.4, 22, '81 días', 'hace 12 días', 'Logística', '—', 'Puebla–Manzanillo, Puebla–Lázaro Cárdenas', '$28.00/km', 'Cobranza vencida 81 días: revisar antes de nuevos eventos', '2025'],
  'Distribuidora Peninsular': ['Por evento', 1, 1.1, 30, 'Al corriente', 'hace 3 días', 'Operaciones', '—', 'Mérida–Cancún, Mérida–Villahermosa', '$28.50/km', 'Evaluando custodio dedicado (4 custodios)', '2025'],
  'Química del Norte': ['Monitoreo', 1, 0.9, 36, 'Al corriente', 'continuo', 'Seguridad industrial', '—', '22 unidades propias', '$880/unidad/mes', 'Materiales peligrosos: protocolo de reacción especial', '2024'],
}

/** Autopartes Saltillo aparece en el diseño (lista lateral y pipeline) pero no está en seed: se conserva como ficha fija. */
export const AUTOPARTES: ClienteCRM = {
  nombre: 'Autopartes Saltillo', modelo: 'Dedicado', sector: 'Automotriz', desde: '2023', activos: 4, trimestre: 6.8e6, ingresosMes: 2.26e6, margen: 31, incidentes: 0,
  cobranza: 'Al corriente', diasCobro: 28, cxc: 1.56e6, ultimo: 'continuo', contacto: 'Planta Ramos Arizpe · Gerardo Salinas', contacto2: '—', correo: 'logistica@autopartessaltillo.com.mx', telefono: '844 410 2288',
  rutas: 'Saltillo–Nuevo Laredo', tarifa: '$47,000/mes por custodio', requisitos: 'Custodios con inglés básico para cruce', portal: false,
}

const modeloDe = (sv: Servicio[]): Modelo => {
  const t = new Set(sv.map(s => s.tipo))
  if (t.has('Por evento') && t.has('Monitoreo')) return 'Evento + monitoreo'
  if (t.has('Dedicado') && !t.has('Por evento')) return 'Dedicado'
  if (t.has('Monitoreo') && t.size === 1) return 'Monitoreo'
  return 'Por evento'
}
const rutasDe = (sv: Servicio[]) => {
  const n = new Map<string, number>()
  sv.filter(s => s.tipo !== 'Monitoreo').forEach(s => n.set(s.ruta, (n.get(s.ruta) ?? 0) + 1))
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join(', ') || sv[0]?.ruta || '—'
}
const ultimoDe = (sv: Servicio[], modelo: Modelo) => {
  if (modelo === 'Dedicado' || modelo === 'Monitoreo') return 'continuo'
  const dias = sv.map(s => Math.max(0, Math.round((Date.parse('2026-10-08') - Date.parse(s.inicio)) / 86400000)))
  const d = dias.length ? Math.min(...dias) : 30
  return d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

export function clienteCRM(c: Cliente): ClienteCRM {
  const sv = servicios.filter(s => s.cliente === c.nombre)
  const d = DISENO[c.nombre]
  const modelo = d ? d[0] : modeloDe(sv)
  const tarifaBase = modelo === 'Dedicado' ? `$${(44000 + (c.margen % 5) * 1000).toLocaleString('es-MX')}/mes por custodio` : modelo === 'Monitoreo' ? `$${860 + (c.margen % 4) * 10}/unidad/mes` : `$${(27 + (c.margen % 5) + 0.5).toFixed(2)}/km`
  return {
    nombre: c.nombre,
    modelo,
    sector: c.sector,
    desde: d ? d[11] : c.desde.slice(0, 4),
    activos: d ? d[1] : c.serviciosActivos,
    trimestre: d ? d[2] * 1e6 : c.ingresosMes * 3,
    ingresosMes: c.ingresosMes,
    margen: d ? d[3] : c.margen,
    incidentes: c.incidentes,
    cobranza: d ? d[4] : c.diasCobro <= 30 ? 'Al corriente' : `${c.diasCobro} días`,
    diasCobro: c.diasCobro,
    cxc: c.cxc,
    ultimo: d ? d[5] : ultimoDe(sv, modelo),
    contacto: d ? `${d[6]} · ${c.contacto}` : `Logística · ${c.contacto}`,
    contacto2: d && d[7] !== '—' ? `${d[7]} · ${c.contacto.split(' ')[0] === 'Ana' ? 'Luis' : 'Ana'} ${c.contacto.split(' ').slice(-1)[0]}` : '—',
    correo: c.correo,
    telefono: c.telefono,
    rutas: d ? d[8] : rutasDe(sv),
    tarifa: d ? d[9] : tarifaBase,
    requisitos: d ? d[10] : c.incidentes > 1 ? 'Revisión de ruta tras incidentes recientes' : 'Sin requisitos especiales registrados',
    portal: c.portalEnVivo,
  }
}

export const clientesCRM: ClienteCRM[] = seedClientes.map(clienteCRM)

export function clienteDeNuevo(n: ClienteNuevo): ClienteCRM {
  return {
    nombre: n.nombre, modelo: n.tipo, sector: n.sector, desde: '2026', activos: 0, trimestre: 0, ingresosMes: 0, margen: 0, incidentes: 0,
    cobranza: 'Al corriente', diasCobro: 0, cxc: 0, ultimo: '—', contacto: `Logística · ${n.contacto}`, contacto2: '—', correo: n.correo, telefono: n.telefono,
    rutas: '—', tarifa: n.tarifa || 'Por definir', requisitos: 'Alta reciente · pendiente primer servicio', portal: false, nuevo: true,
  }
}

/** Seed + clientes dados de alta en el store (los nuevos primero no: van al final para no mover las filas del diseño). */
export const todosLosClientes = (nuevos: ClienteNuevo[] = []): ClienteCRM[] => [...clientesCRM, ...nuevos.map(clienteDeNuevo)]

export const serviciosDe = (nombre: string): Servicio[] => servicios.filter(s => s.cliente === nombre).sort((a, b) => b.inicio.localeCompare(a.inicio))
export const incidentesDe = (nombre: string): Incidente[] => incidentes.filter(i => i.cliente === nombre).sort((a, b) => b.fecha.localeCompare(a.fecha))

export const fmtM = (n: number) => '$' + (n / 1e6).toFixed(1) + 'M'
