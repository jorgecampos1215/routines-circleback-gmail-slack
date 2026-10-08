/**
 * Seed data ficticia del demo. Volúmenes según requerimientos:
 * 400 custodios en 7 zonas, 486 colaboradores, 600 unidades, 25 clientes, 300 servicios del trimestre, 40 incidentes.
 * Generación determinística (misma semilla = mismos datos en cada carga).
 */
export const ZONAS = ['Centro', 'Bajío', 'Occidente', 'Noreste', 'Golfo', 'Sureste', 'Noroeste'] as const
export type Zona = (typeof ZONAS)[number]

let s = 2027
const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]

const NOMBRES = ['José', 'Luis', 'Miguel', 'Juan', 'Carlos', 'Jorge', 'Raúl', 'Fernando', 'Ricardo', 'Alejandro', 'Daniel', 'Óscar', 'Héctor', 'Arturo', 'Eduardo', 'Ana', 'María', 'Laura', 'Patricia', 'Gabriela', 'Sofía', 'Claudia', 'Verónica', 'Andrés', 'Roberto', 'Iván', 'Sergio', 'Manuel', 'Francisco', 'Javier']
const APELLIDOS = ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz', 'Castillo', 'Romero', 'Salinas', 'Navarro', 'Medina', 'Rojas', 'Vargas']
const nombre = () => `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`

export const CLIENTES = ['Alpura', 'Marsh', 'Grupo Bimbo', 'Lala', 'Femsa Logística', 'Liverpool', 'Coppel', 'Walmart de México', 'Soriana', 'Cemex', 'Ternium', 'Nestlé México', 'Sigma Alimentos', 'Grupo Modelo', 'Heineken México', 'Mabe', 'Whirlpool', 'Samsung Electronics MX', 'Bachoco', 'Herdez', 'Kimberly-Clark', 'Procter & Gamble MX', 'Unilever', 'Mars México', 'DHL Supply Chain']

export type EstatusCustodio = 'Disponible' | 'Asignado' | 'En servicio' | 'Descanso' | 'Vacaciones' | 'Incapacidad' | 'Baja'
export const custodios = Array.from({ length: 400 }, (_, i) => {
  const r = rnd()
  const estatus: EstatusCustodio = r < 0.18 ? 'Disponible' : r < 0.36 ? 'Asignado' : r < 0.78 ? 'En servicio' : r < 0.9 ? 'Descanso' : r < 0.95 ? 'Vacaciones' : r < 0.98 ? 'Incapacidad' : 'Baja'
  return {
    id: 'CUS-' + String(1001 + i),
    nombre: nombre(),
    zona: ZONAS[i % 7 === 6 && rnd() < 0.5 ? 0 : i % 7] as Zona,
    estatus,
    calificacion: Math.round((3.6 + rnd() * 1.4) * 10) / 10,
    horasSemana: Math.round(28 + rnd() * 34),
    servicios: Math.round(20 + rnd() * 140),
    portacion: rnd() < 0.82,
    docsPorVencer: rnd() < 0.08,
  }
})

export const unidades = Array.from({ length: 600 }, (_, i) => {
  const r = rnd()
  return {
    id: 'U-' + String(101 + i),
    modelo: pick(['Nissan X-Trail', 'Chevrolet Tahoe', 'Toyota Hilux', 'Nissan NP300', 'VW Amarok', 'Jeep Grand Cherokee']),
    anio: 2019 + Math.floor(rnd() * 7),
    placas: `${String.fromCharCode(65 + Math.floor(rnd() * 26))}${String.fromCharCode(65 + Math.floor(rnd() * 26))}-${Math.floor(100 + rnd() * 899)}-${String.fromCharCode(65 + Math.floor(rnd() * 26))}`,
    zona: ZONAS[i % 7] as Zona,
    estatus: r < 0.86 ? 'Operando' : r < 0.93 ? 'En taller' : r < 0.95 ? 'Siniestrada' : r < 0.99 ? 'Disponible' : 'Baja',
    km: Math.round(20000 + rnd() * 180000),
    rendimiento: Math.round((7.5 + rnd() * 3) * 10) / 10,
  }
})

export type TipoServicio = 'Por evento' | 'Dedicado' | 'Monitoreo'
export const servicios = Array.from({ length: 300 }, (_, i) => {
  const r = rnd()
  const tipo: TipoServicio = r < 0.62 ? 'Por evento' : r < 0.85 ? 'Dedicado' : 'Monitoreo'
  return {
    id: 'SRV-' + String(23820 + i),
    cliente: pick(CLIENTES),
    tipo,
    zona: pick(ZONAS),
    estatus: pick(['Confirmado', 'En tránsito', 'En tránsito', 'Entregado', 'Entregado', 'Entregado', 'Cerrado', 'Con incidente']),
    monto: tipo === 'Por evento' ? Math.round(18000 + rnd() * 40000) : tipo === 'Dedicado' ? Math.round(120000 + rnd() * 80000) : Math.round(25000 + rnd() * 30000),
  }
})

export const incidentes = Array.from({ length: 40 }, (_, i) => ({
  id: 'INC-' + String(301 + i),
  tipo: pick(['Robo', 'Intento de robo', 'Accidente', 'Falla mecánica']),
  carretera: pick(['Querétaro–SLP (57D)', 'México–Querétaro (57D)', 'Arco Norte', 'Puebla–Orizaba (150D)', 'Guadalajara–Lagos (80)', 'Monterrey–Nuevo Laredo (85D)']),
  zona: pick(ZONAS),
  resultado: pick(['Recuperación total', 'Recuperación total', 'Recuperación parcial', 'Pérdida', 'Sin afectación']),
}))

export const colaboradoresTotal = 486
