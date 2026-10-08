/**
 * Seed data ficticia del demo. Volúmenes según requerimientos y totales de las pantallas del diseño:
 * 400 custodios en 7 zonas (65 disponibles · 54 asignados · 258 en servicio · 14 descanso · 6 vacaciones · 3 incapacidad),
 * 486 colaboradores, 600 unidades (546 operando · 31 en taller), 25 clientes, 300 servicios del trimestre, 40 incidentes.
 * Generación determinística (misma semilla = mismos datos en cada carga).
 * Las filas que aparecen en el diseño van primero en cada lista, con sus datos exactos.
 */
export const ZONAS = ['Centro', 'Bajío', 'Occidente', 'Noreste', 'Golfo', 'Sureste', 'Noroeste'] as const
export type Zona = (typeof ZONAS)[number]

/** Plantilla y disponibles por zona (los del Dashboard del diseño). */
export const ZONA_PLANTILLA: Record<Zona, { total: number; disponibles: number }> = {
  Centro: { total: 118, disponibles: 21 }, Bajío: { total: 74, disponibles: 4 }, Occidente: { total: 61, disponibles: 12 },
  Noreste: { total: 58, disponibles: 9 }, Golfo: { total: 41, disponibles: 8 }, Sureste: { total: 26, disponibles: 6 }, Noroeste: { total: 22, disponibles: 5 },
}

const BASES: Record<Zona, string[]> = {
  Centro: ['Cuautitlán', 'Tepotzotlán', 'Ecatepec', 'Tultitlán', 'Toluca', 'Puebla'],
  Bajío: ['Querétaro', 'León', 'Celaya', 'San Luis Potosí', 'Irapuato', 'Aguascalientes'],
  Occidente: ['Guadalajara', 'Zapopan', 'Lagos de Moreno', 'Colima', 'Morelia'],
  Noreste: ['Monterrey', 'Apodaca', 'Saltillo', 'Reynosa', 'Nuevo Laredo'],
  Golfo: ['Veracruz', 'Córdoba', 'Coatzacoalcos', 'Tampico', 'Villahermosa'],
  Sureste: ['Mérida', 'Cancún', 'Campeche', 'Tuxtla Gutiérrez'],
  Noroeste: ['Hermosillo', 'Culiacán', 'Tijuana', 'Chihuahua', 'Mexicali'],
}

let s = 2027
const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

const NOMBRES = ['José', 'Luis', 'Miguel', 'Juan', 'Carlos', 'Jorge', 'Raúl', 'Fernando', 'Ricardo', 'Alejandro', 'Daniel', 'Óscar', 'Héctor', 'Arturo', 'Eduardo', 'Andrés', 'Roberto', 'Iván', 'Sergio', 'Manuel', 'Francisco', 'Javier', 'Gerardo', 'Mario', 'Rubén', 'Alberto', 'Pedro', 'Ramón', 'Hugo', 'Ernesto', 'Marco', 'Felipe', 'Rafael', 'Jesús', 'Víctor']
const NOMBRES_F = ['Ana', 'María', 'Laura', 'Patricia', 'Gabriela', 'Sofía', 'Claudia', 'Verónica', 'Daniela', 'Mariana', 'Fernanda', 'Lucía', 'Paola', 'Karla', 'Alejandra']
const APELLIDOS = ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz', 'Castillo', 'Romero', 'Salinas', 'Navarro', 'Medina', 'Rojas', 'Vargas', 'Uc', 'Cetina', 'Pech', 'Canché', 'Soto', 'Arce', 'Villa', 'Ríos', 'Ordaz', 'Bautista']
const nombreH = () => `${pick(NOMBRES)} ${pick(APELLIDOS)}`
const nombreM = () => `${pick(NOMBRES_F)} ${pick(APELLIDOS)}`

export const CLIENTES = ['Alpura', 'Marsh', 'Farmacéutica Orión', 'Electrónica del Bajío', 'Bebidas del Golfo', 'Grupo Textil Arrayán', 'Distribuidora Peninsular', 'Química del Norte', 'Logística Pacífico Norte', 'Grupo Bimbo', 'Lala', 'Femsa Logística', 'Liverpool', 'Coppel', 'Cemex', 'Ternium', 'Nestlé México', 'Sigma Alimentos', 'Grupo Modelo', 'Mabe', 'Whirlpool', 'Bachoco', 'Herdez', 'Kimberly-Clark', 'DHL Supply Chain']

// ───────────────────────── Custodios ─────────────────────────
export type EstatusCustodio = 'Disponible' | 'Asignado' | 'En servicio' | 'Descanso' | 'Vacaciones' | 'Incapacidad'
export const ESTATUS_CUSTODIO: EstatusCustodio[] = ['Disponible', 'Asignado', 'En servicio', 'Descanso', 'Vacaciones', 'Incapacidad']
export const CUSTODIOS_POR_ESTATUS: Record<EstatusCustodio, number> = { Disponible: 65, Asignado: 54, 'En servicio': 258, Descanso: 14, Vacaciones: 6, Incapacidad: 3 }

export type Documento = { k: string; v: string; estado: 'ok' | 'warn' | 'bad' }
export type Custodio = {
  id: string
  nombre: string
  zona: Zona
  base: string
  estatus: EstatusCustodio
  asignacion: string // 'Cliente · SRV-xxxxx' o '—'
  horasSemana: number
  calificacion: number
  docs: string // resumen: 'Al día' | 'Licencia 12 días' | ...
  documentos: Documento[]
  telefono: string
  ingreso: string // YYYY-MM-DD
  serviciosAcumulados: number
  incidentes: number
  certificaciones: string[]
  portacion: boolean
  turnos: string // 7 letras: s=servicio, d=descanso, l=libre
}

const docsDe = (resumen: string): Documento[] => {
  const dias = parseInt(resumen.replace(/\D/g, '') || '0')
  const warnBad = dias > 0 && dias <= 14 ? 'bad' : 'warn'
  return [
    { k: 'Licencia federal', v: resumen.startsWith('Licencia') ? `vence en ${dias} días` : 'vigente · 2028', estado: resumen.startsWith('Licencia') ? warnBad : 'ok' },
    { k: 'Portación / permiso', v: resumen.startsWith('Portación') ? `vence en ${dias} días` : 'vigente · 2027', estado: resumen.startsWith('Portación') ? warnBad : 'ok' },
    { k: 'Evaluación de confianza', v: resumen.startsWith('Confianza') ? `vence en ${dias} días` : 'abr 2026', estado: resumen.startsWith('Confianza') ? warnBad : 'ok' },
    { k: 'Certificación carga alto valor', v: 'vigente', estado: 'ok' },
    { k: 'Alta en Samsara', v: 'activo', estado: 'ok' },
  ]
}

const DISEÑO_CUSTODIOS: [string, string, Zona, string, EstatusCustodio, string, number, number, string, string][] = [
  ['C-1102', 'Hugo Salazar', 'Centro', 'Cuautitlán', 'Disponible', '—', 32, 4.9, 'Al día', 'ssdllss'],
  ['C-0877', 'Iván Cetina', 'Centro', 'Tepotzotlán', 'Disponible', '—', 38, 4.8, 'Al día', 'sssdlsl'],
  ['C-1043', 'Raúl Medina', 'Centro', 'Cuautitlán', 'En servicio', 'Alpura · SRV-24817', 44, 4.6, 'Al día', 'dsssssd'],
  ['C-1188', 'Ernesto Villa', 'Centro', 'Ecatepec', 'En servicio', 'Alpura · SRV-24817', 47, 4.4, 'Licencia 12 días', 'ssssssd'],
  ['C-0654', 'Marco Ríos', 'Bajío', 'Celaya', 'Asignado', 'Orión · SRV-24822', 40, 4.7, 'Al día', 'lssssdl'],
  ['C-0712', 'Jesús Ordaz', 'Bajío', 'León', 'En servicio', 'Electrónica del Bajío · DED-0412', 52, 4.5, 'Exceso de horas', 'sssssss'],
  ['C-1240', 'Óscar Bautista', 'Bajío', 'Querétaro', 'Disponible', '—', 29, 4.3, 'Confianza 21 días', 'ldlssdl'],
  ['C-0398', 'Felipe Arce', 'Golfo', 'Veracruz', 'Descanso', '—', 46, 4.6, 'Al día', 'sssdddl'],
  ['C-0931', 'Rafael Uc', 'Centro', 'Tultitlán', 'Disponible', '—', 41, 4.2, 'Sin asignar 9 días', 'llllssd'],
  ['C-0566', 'Daniel Soto', 'Noreste', 'Monterrey', 'Incapacidad', '—', 0, 4.7, 'Portación 30 días', 'lllllll'],
]

function generarCustodios(): Custodio[] {
  const out: Custodio[] = []
  const usados = new Set<string>()
  const porZona: Record<Zona, number> = { Centro: 0, Bajío: 0, Occidente: 0, Noreste: 0, Golfo: 0, Sureste: 0, Noroeste: 0 }
  const porEstatus: Record<EstatusCustodio, number> = { Disponible: 0, Asignado: 0, 'En servicio': 0, Descanso: 0, Vacaciones: 0, Incapacidad: 0 }
  const dispZona: Record<Zona, number> = { Centro: 0, Bajío: 0, Occidente: 0, Noreste: 0, Golfo: 0, Sureste: 0, Noroeste: 0 }

  const push = (c: Custodio) => { out.push(c); usados.add(c.id); porZona[c.zona]++; porEstatus[c.estatus]++; if (c.estatus === 'Disponible') dispZona[c.zona]++ }

  for (const [id, nombre, zona, base, estatus, asignacion, horas, calif, docs, turnos] of DISEÑO_CUSTODIOS) {
    push({ id, nombre, zona, base, estatus, asignacion, horasSemana: horas, calificacion: calif, docs, documentos: docsDe(docs), telefono: `55 ${int(1000, 9999)} ${int(1000, 9999)}`, ingreso: `20${int(18, 25)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, serviciosAcumulados: int(40, 320), incidentes: int(0, 2), certificaciones: ['Carga alto valor', 'Primeros auxilios'], portacion: true, turnos })
  }

  // Cola de estatus pendientes por zona para cuadrar con los totales del diseño
  const pendientesEstatus: EstatusCustodio[] = []
  for (const e of ESTATUS_CUSTODIO) for (let i = porEstatus[e]; i < CUSTODIOS_POR_ESTATUS[e]; i++) pendientesEstatus.push(e)
  // mezclar determinísticamente
  for (let i = pendientesEstatus.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pendientesEstatus[i], pendientesEstatus[j]] = [pendientesEstatus[j], pendientesEstatus[i]] }

  let n = 0
  for (const zona of ZONAS) {
    const faltan = ZONA_PLANTILLA[zona].total - porZona[zona]
    for (let i = 0; i < faltan; i++) {
      // Disponibles por zona según el dashboard; el resto toma el siguiente estatus pendiente no-Disponible
      let estatus: EstatusCustodio
      if (dispZona[zona] < ZONA_PLANTILLA[zona].disponibles) {
        const k = pendientesEstatus.indexOf('Disponible'); estatus = 'Disponible'; if (k >= 0) pendientesEstatus.splice(k, 1)
      } else {
        const k = pendientesEstatus.findIndex(e => e !== 'Disponible'); estatus = k >= 0 ? pendientesEstatus.splice(k, 1)[0] : 'En servicio'
      }
      let id: string
      do { id = 'C-' + String(int(100, 1399)).padStart(4, '0') } while (usados.has(id))
      const cliente = pick(CLIENTES)
      const asignacion = estatus === 'En servicio' || estatus === 'Asignado' ? `${cliente} · ${rnd() < 0.7 ? 'SRV-' + int(24700, 24900) : 'DED-' + String(int(300, 480)).padStart(4, '0')}` : '—'
      const r = rnd()
      const docs = r < 0.86 ? 'Al día' : r < 0.9 ? `Licencia ${int(5, 40)} días` : r < 0.94 ? `Confianza ${int(7, 45)} días` : r < 0.97 ? `Portación ${int(10, 60)} días` : estatus === 'Disponible' ? `Sin asignar ${int(5, 20)} días` : 'Exceso de horas'
      const horas = estatus === 'Incapacidad' || estatus === 'Vacaciones' ? 0 : estatus === 'En servicio' ? int(36, 56) : int(20, 44)
      push({ id, nombre: nombreH(), zona, base: pick(BASES[zona]), estatus, asignacion, horasSemana: horas, calificacion: Math.round((3.8 + rnd() * 1.2) * 10) / 10, docs, documentos: docsDe(docs), telefono: `${pick(['55', '33', '81', '442', '477', '229', '999'])} ${int(100, 999)} ${int(1000, 9999)}`, ingreso: `20${int(17, 26)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, serviciosAcumulados: int(10, 340), incidentes: rnd() < 0.8 ? 0 : int(1, 3), certificaciones: rnd() < 0.7 ? ['Carga alto valor', 'Primeros auxilios'] : ['Primeros auxilios'], portacion: rnd() < 0.82, turnos: Array.from({ length: 7 }, () => (estatus === 'En servicio' ? (rnd() < 0.8 ? 's' : 'd') : pick(['s', 'd', 'l']))).join('') })
      n++
    }
  }
  return out
}

export const custodios: Custodio[] = generarCustodios()

/** Conteo por estatus a partir de los datos (coincide con el diseño: 400 / 65 / 54 / 258 / 14 / 6 / 3). */
export const conteoCustodios = (lista: Custodio[] = custodios) => {
  const c: Record<string, number> = { Todos: lista.length }
  for (const e of ESTATUS_CUSTODIO) c[e] = lista.filter(x => x.estatus === e).length
  return c
}

// ───────────────────────── Unidades (flotilla) ─────────────────────────
export type EstatusUnidad = 'Operando' | 'Disponible' | 'En taller' | 'Siniestrada' | 'Baja'
export type Unidad = {
  id: string
  vehiculo: string // 'Nissan X-Trail 2024'
  placas: string
  zona: Zona
  custodio: string // 'R. Medina' o '—'
  servicio: string // 'Alpura · SRV-24817' o '—'
  gps: 'Samsara' | 'Ruptela'
  poliza: string // 'vigente' | 'vence 14 nov' | 'en trámite'
  polizaVence: string // YYYY-MM-DD
  verificacion: string // 'vigente' | 'vence ...'
  estatus: EstatusUnidad
  km: number
  rendimiento: number // km/l
  costoMes: number // combustible + mantenimiento + seguro
  anio: number
  vin: string
}

const DISEÑO_UNIDADES: [string, string, string, string, string, 'Samsara' | 'Ruptela', string, EstatusUnidad][] = [
  ['AU-3321', 'Nissan X-Trail 2024', 'NTR-482-B', 'R. Medina', 'Alpura · SRV-24817', 'Samsara', 'vence 14 nov', 'Operando'],
  ['AU-2087', 'Nissan X-Trail 2024', 'NTP-119-C', '—', '—', 'Samsara', 'vigente', 'Disponible'],
  ['AU-1876', 'Toyota Hilux 2023', 'LKS-904-A', 'J. Ordaz', 'Electrónica del Bajío', 'Samsara', 'vigente', 'Operando'],
  ['AU-1450', 'VW Tiguan 2022', 'MMR-337-D', '—', '—', 'Ruptela', 'vence 2 nov', 'En taller'],
  ['AU-0992', 'Toyota Hilux 2021', 'JHT-561-A', '—', '—', 'Ruptela', 'en trámite', 'Siniestrada'],
  ['AU-2214', 'Nissan X-Trail 2023', 'NTB-776-C', 'F. Arce', 'Bebidas del Golfo', 'Samsara', 'vigente', 'Operando'],
]
const MODELOS = ['Nissan X-Trail', 'Toyota Hilux', 'VW Tiguan', 'Chevrolet Tahoe', 'Nissan NP300', 'Jeep Grand Cherokee']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const placa = () => `${String.fromCharCode(65 + int(0, 25))}${String.fromCharCode(65 + int(0, 25))}${String.fromCharCode(65 + int(0, 25))}-${int(100, 999)}-${String.fromCharCode(65 + int(0, 25))}`
const inicial = (n: string) => n.split(' ')[0][0] + '. ' + n.split(' ')[1]

function generarUnidades(): Unidad[] {
  const out: Unidad[] = []
  const usados = new Set<string>()
  const mk = (id: string, vehiculo: string, placas: string, custodio: string, servicio: string, gps: 'Samsara' | 'Ruptela', poliza: string, estatus: EstatusUnidad, zona: Zona): Unidad => {
    const anio = parseInt(vehiculo.slice(-4))
    const km = int(15000, 190000)
    return { id, vehiculo, placas, zona, custodio, servicio, gps, poliza, polizaVence: `2026-${String(int(10, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, verificacion: rnd() < 0.9 ? 'vigente' : `vence ${int(1, 28)} ${pick(MESES.slice(9))}`, estatus, km, rendimiento: Math.round((7.5 + rnd() * 3.5) * 10) / 10, costoMes: int(9000, 26000), anio, vin: `3N1${String(int(1e9, 9e9)).slice(0, 14)}` }
  }
  for (const [id, veh, pl, cu, sv, gps, pol, est] of DISEÑO_UNIDADES) { out.push(mk(id, veh, pl, cu, sv, gps, pol, est, id === 'AU-1876' ? 'Bajío' : id === 'AU-2214' ? 'Golfo' : 'Centro')); usados.add(id) }
  const enServicio = custodios.filter(c => c.estatus === 'En servicio' || c.estatus === 'Asignado')
  let k = 0
  while (out.length < 600) {
    let id: string
    do { id = 'AU-' + String(int(100, 3999)).padStart(4, '0') } while (usados.has(id))
    usados.add(id)
    // 546 operando · 31 en taller · 23 restantes (12 disponibles, 8 siniestradas, 3 baja), contando las filas del diseño
    const cnt = (e: EstatusUnidad) => out.filter(u => u.estatus === e).length
    const estatus: EstatusUnidad = cnt('Operando') < 546 ? 'Operando' : cnt('En taller') < 31 ? 'En taller' : cnt('Disponible') < 12 ? 'Disponible' : cnt('Siniestrada') < 8 ? 'Siniestrada' : 'Baja'
    const c = estatus === 'Operando' && k < enServicio.length ? enServicio[k++] : null
    const r = rnd()
    const poliza = estatus === 'Siniestrada' ? 'en trámite' : r < 0.88 ? 'vigente' : `vence ${int(1, 28)} ${pick(['oct', 'nov', 'dic'])}`
    out.push(mk(id, `${pick(MODELOS)} ${int(2019, 2025)}`, placa(), c ? inicial(c.nombre) : '—', c ? c.asignacion : '—', rnd() < 0.72 ? 'Samsara' : 'Ruptela', poliza, estatus, c ? c.zona : pick(ZONAS)))
  }
  return out
}
export const unidades: Unidad[] = generarUnidades()

export type OrdenTaller = { id: string; unidad: string; tipo: 'Preventivo' | 'Correctivo'; falla: string; proveedor: string; costo: number; diasFuera: number; estatus: 'Abierta' | 'Cerrada' | 'En aseguradora'; fecha: string }
export const ordenesTaller: OrdenTaller[] = Array.from({ length: 48 }, (_, i) => {
  const u = unidades[int(0, 599)]
  const tipo = rnd() < 0.55 ? 'Preventivo' : 'Correctivo'
  return { id: 'OT-' + String(1180 + i), unidad: u.id, tipo, falla: tipo === 'Preventivo' ? pick(['Servicio 10,000 km', 'Cambio de aceite y filtros', 'Rotación de llantas', 'Afinación mayor']) : pick(['Alternador', 'Suspensión delantera', 'Clutch', 'Fuga de aceite', 'Sistema de frenos', 'Transmisión']), proveedor: pick(['Taller AI27 Cuautitlán', 'Nissan Satélite', 'Toyota Querétaro', 'Servicio Express Bajío', 'Frenos y Clutch MTY']), costo: tipo === 'Preventivo' ? int(2800, 9500) : int(8000, 48000), diasFuera: tipo === 'Preventivo' ? int(1, 3) : int(3, 18), estatus: i < 14 ? 'Abierta' : rnd() < 0.1 ? 'En aseguradora' : 'Cerrada', fecha: `2026-${String(int(7, 10)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}` }
})

export type CargaCombustible = { unidad: string; fecha: string; litros: number; costo: number; kmGps: number; rendimiento: number; anomalo: boolean }
export const cargasCombustible: CargaCombustible[] = Array.from({ length: 120 }, () => {
  const u = unidades[int(0, 545)]
  const litros = int(38, 72)
  const km = int(300, 720)
  const rend = Math.round((km / litros) * 10) / 10
  return { unidad: u.id, fecha: `2026-${String(int(7, 10)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, litros, costo: Math.round(litros * 24.2), kmGps: km, rendimiento: rend, anomalo: rend < 6.5 }
})

// ───────────────────────── Servicios ─────────────────────────
export type TipoServicio = 'Por evento' | 'Dedicado' | 'Monitoreo'
export type EstatusServicio = 'Cotizado' | 'Confirmado' | 'En tránsito' | 'Entregado' | 'Con incidente' | 'Cerrado'
export type Servicio = {
  id: string
  cliente: string
  tipo: TipoServicio
  zona: Zona
  ruta: string // 'Méx–Qro–Gdl' o 'Planta León (dedicado)'
  estatus: EstatusServicio
  custodios: string // 'R. Medina, E. Villa'
  unidad: string
  monitorista: string
  inicio: string // ISO
  monto: number
  fuente: 'Samsara' | 'Ruptela'
}
const MONITORISTAS = ['L. Herrera', 'P. Ruiz', 'S. Campos', 'A. Domínguez', 'M. Quintal', 'J. Pech']
const RUTAS = ['Méx–Qro–Gdl', 'Méx–Puebla–Veracruz', 'Qro–SLP–Mty', 'Gdl–Lagos–León', 'Mty–Nuevo Laredo', 'Méx–Toluca–Morelia', 'Puebla–Orizaba–Veracruz', 'Mérida–Cancún', 'Hermosillo–Nogales', 'Tepotzotlán–Querétaro']

function generarServicios(): Servicio[] {
  const out: Servicio[] = []
  // Activos: 34 por evento · 41 dedicados · 11 monitoreo (dashboard). Resto del trimestre: entregados/cerrados.
  for (let i = 0; i < 300; i++) {
    const tipo: TipoServicio = i < 34 ? 'Por evento' : i < 75 ? 'Dedicado' : i < 86 ? 'Monitoreo' : rnd() < 0.7 ? 'Por evento' : rnd() < 0.7 ? 'Dedicado' : 'Monitoreo'
    const activo = i < 86
    const estatus: EstatusServicio = activo ? (tipo === 'Por evento' ? pick(['Confirmado', 'En tránsito', 'En tránsito', 'En tránsito']) : 'En tránsito') : rnd() < 0.08 ? 'Con incidente' : rnd() < 0.5 ? 'Entregado' : 'Cerrado'
    const zona = pick(ZONAS)
    const cliente = pick(CLIENTES)
    const cs = custodios.filter(c => c.zona === zona).slice(0, 40)
    const c1 = cs[int(0, cs.length - 1)], c2 = cs[int(0, cs.length - 1)]
    out.push({
      id: tipo === 'Dedicado' ? 'DED-' + String(300 + i).padStart(4, '0') : tipo === 'Monitoreo' ? 'MON-' + String(100 + i).padStart(4, '0') : 'SRV-' + String(24900 - i),
      cliente, tipo, zona,
      ruta: tipo === 'Por evento' ? pick(RUTAS) : tipo === 'Dedicado' ? `${pick(BASES[zona])} (dedicado)` : `${int(12, 70)} unidades del cliente`,
      estatus,
      custodios: tipo === 'Monitoreo' ? '—' : c1 === c2 ? inicial(c1.nombre) : `${inicial(c1.nombre)}, ${inicial(c2.nombre)}`,
      unidad: tipo === 'Monitoreo' ? '—' : unidades[int(0, 545)].id,
      monitorista: pick(MONITORISTAS),
      inicio: `2026-${String(activo ? 10 : int(7, 10)).padStart(2, '0')}-${String(activo ? int(1, 7) : int(1, 28)).padStart(2, '0')}T${String(int(5, 21)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}:00`,
      monto: tipo === 'Por evento' ? int(18000, 46000) : tipo === 'Dedicado' ? int(118000, 190000) : int(24000, 60000),
      fuente: rnd() < 0.72 ? 'Samsara' : 'Ruptela',
    })
  }
  return out
}
export const servicios: Servicio[] = generarServicios()

// ───────────────────────── Incidentes ─────────────────────────
export type Incidente = { id: string; fecha: string; tipo: 'Robo' | 'Intento de robo' | 'Accidente' | 'Falla mecánica'; carretera: string; zona: Zona; servicio: string; cliente: string; resultado: 'Recuperación total' | 'Recuperación parcial' | 'Pérdida' | 'Sin afectación'; valorCarga: number; valorRecuperado: number; tiempoReaccionMin: number; hora: string }
const CARRETERAS = ['Arco Norte', 'Méx–Puebla–Orizaba', 'Méx–Querétaro', 'Querétaro–SLP', 'Guadalajara–Lagos', 'Monterrey–Nuevo Laredo', 'Puebla–Veracruz']
export const incidentes: Incidente[] = Array.from({ length: 40 }, (_, i) => {
  const sv = servicios[int(86, 299)]
  const tipo = pick(['Robo', 'Intento de robo', 'Intento de robo', 'Accidente', 'Falla mecánica'] as const)
  const valor = int(400000, 4800000)
  const resultado = tipo === 'Robo' ? pick(['Recuperación total', 'Recuperación total', 'Recuperación parcial', 'Pérdida'] as const) : tipo === 'Intento de robo' ? 'Sin afectación' : 'Sin afectación'
  const rec = resultado === 'Recuperación total' || resultado === 'Sin afectación' ? valor : resultado === 'Recuperación parcial' ? Math.round(valor * (0.4 + rnd() * 0.4)) : 0
  return { id: 'INC-' + String(301 + i), fecha: `2026-${String(int(7, 10)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, tipo, carretera: pick(CARRETERAS), zona: sv.zona, servicio: sv.id, cliente: sv.cliente, resultado, valorCarga: valor, valorRecuperado: rec, tiempoReaccionMin: int(9, 38), hora: `${String(int(0, 23)).padStart(2, '0')}:${pick(['05', '20', '40', '55'])}` }
})

// ───────────────────────── Colaboradores (RH) ─────────────────────────
export type Colaborador = { id: string; nombre: string; area: string; puesto: string; sede: string; zona: Zona; ingreso: string; sueldo: number; vacacionesDisponibles: number; estatus: 'Activo' | 'Baja' }
const AREAS: [string, string[], number][] = [['Custodios', ['Custodio', 'Custodio líder'], 400], ['Monitoreo', ['Monitorista', 'Supervisor de monitoreo'], 28], ['Reacción', ['Agente de reacción', 'Coordinador de reacción'], 14], ['Operaciones', ['Coordinador de operaciones', 'Planeador'], 12], ['Flotilla y taller', ['Mecánico', 'Jefe de taller'], 9], ['Recursos humanos', ['Analista de RH', 'Reclutador'], 7], ['Comercial', ['Ejecutivo comercial', 'Gerente comercial'], 6], ['Finanzas', ['Contador', 'Analista de cobranza'], 6], ['Dirección', ['Director general', 'Director de operaciones'], 4]]
export const colaboradores: Colaborador[] = (() => {
  const out: Colaborador[] = []
  let n = 1
  for (const [area, puestos, total] of AREAS) {
    for (let i = 0; i < total; i++) {
      const c = area === 'Custodios' ? custodios[i] : null
      const zona = c ? c.zona : pick(ZONAS)
      out.push({ id: c ? c.id : 'E-' + String(2000 + n++).padStart(4, '0'), nombre: c ? c.nombre : rnd() < 0.5 ? nombreH() : nombreM(), area, puesto: rnd() < 0.85 ? puestos[0] : puestos[1], sede: c ? c.base : pick(BASES[zona]), zona, ingreso: c ? c.ingreso : `20${int(16, 26)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, sueldo: area === 'Custodios' ? int(14500, 22000) : area === 'Dirección' ? int(95000, 160000) : int(16000, 48000), vacacionesDisponibles: int(0, 18), estatus: 'Activo' })
    }
  }
  return out // 486 en total
})()
export const colaboradoresTotal = colaboradores.length

// ───────────────────────── Clientes (CRM) ─────────────────────────
export type Cliente = { nombre: string; sector: string; contacto: string; correo: string; telefono: string; serviciosActivos: number; serviciosTrimestre: number; ingresosMes: number; margen: number; incidentes: number; portalEnVivo: boolean; desde: string; cxc: number; diasCobro: number }
export const clientes: Cliente[] = CLIENTES.map((nombre, i) => {
  const sv = servicios.filter(s => s.cliente === nombre)
  const act = sv.filter(s => ['Confirmado', 'En tránsito'].includes(s.estatus)).length
  return { nombre, sector: pick(['Alimentos y bebidas', 'Farmacéutica', 'Electrónica', 'Retail', 'Aseguradora', 'Textil', 'Química', 'Logística 3PL', 'Construcción']), contacto: rnd() < 0.5 ? nombreH() : nombreM(), correo: `logistica@${nombre.toLowerCase().replace(/[^a-z]/g, '')}.com.mx`, telefono: `55 ${int(1000, 9999)} ${int(1000, 9999)}`, serviciosActivos: act, serviciosTrimestre: sv.length, ingresosMes: i === 0 ? 5050000 : i === 1 ? 3850000 : i === 2 ? 3030000 : sv.reduce((a, s) => a + s.monto, 0) / 3, margen: i === 0 ? 38 : i === 1 ? 34 : i === 2 ? 29 : int(22, 41), incidentes: incidentes.filter(x => x.cliente === nombre).length, portalEnVivo: ['Alpura', 'Marsh', 'Logística Pacífico Norte'].includes(nombre), desde: `20${int(18, 25)}-${String(int(1, 12)).padStart(2, '0')}`, cxc: int(120000, 2400000), diasCobro: int(18, 72) }
})
