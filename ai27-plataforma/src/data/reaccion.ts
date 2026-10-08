/**
 * Casos de Reacción: el caso principal del diseño (INC-0412, Alpura) más los 40 `incidentes` de seed
 * convertidos a caso con tiempos, bitácora, resultado y resumen. Compartido por Reacción y Reporte post-incidente.
 */
import { incidentes, type Incidente } from './seed'

export type Entrada = { t: string; text: string; who: string }
export type Resultado = 'total' | 'parcial' | 'perdida'
export type Caso = {
  id: string
  tipo: string
  titulo: string // 'Intento de robo · Méx–Qro km 142'
  sub: string // 'Abierto desde alerta Samsara · SRV-24817 · Alpura · lácteos refrigerados $2.4M'
  cliente: string
  servicio: string
  ruta: string
  ubicacion: string
  carga: string
  valor: number
  recuperado: number
  resultado: Resultado
  resultadoTexto: string
  parcial: [number, number] // [recuperado, pérdida] si el resultado se marca como parcial
  fecha: string // '7 oct 2026'
  fechaISO: string
  times: string[] // 6 hitos
  log: Entrada[]
  stepLog: Record<number, Entrada>
  step: number // etapa actual al abrir el caso (0–6)
  minutos: { incidente: number; autoridades: number; sitio: number }
  equipo: string
  equipoDetalle: string
  denuncia: string
  autoridades: string
  tituloReporte: string
  resumen: string
  recomendacion: string
  cerrado: string // '7 oct 2026, 18:20'
  esPrincipal: boolean
}

export const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
const fmtM = (n: number) => '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const hhmm = (min: number) => { const m = ((min % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') }
const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b }
const fechaLarga = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MES[m - 1]} ${y}` }

export const CASO_PRINCIPAL: Caso = {
  id: 'INC-0412', tipo: 'Intento de robo', titulo: 'Intento de robo · Méx–Qro km 142', sub: 'Abierto desde alerta Samsara · SRV-24817 · Alpura · lácteos refrigerados $2.4M',
  cliente: 'Alpura', servicio: 'SRV-24817', ruta: 'Cuautitlán → El Salto', ubicacion: 'Méx–Qro km 142', carga: 'lácteos refrigerados', valor: 2400000, recuperado: 2400000, resultado: 'total', resultadoTexto: 'Recuperación total', parcial: [1750000, 650000],
  fecha: '7 oct 2026', fechaISO: '2026-10-07', times: ['14:30', '14:34', '14:35', '14:47', '15:40', '18:20'],
  log: [
    { t: '14:30', text: 'Alerta de desvío Samsara convertida en incidente (intento de robo)', who: 'L. Herrera' },
    { t: '14:31', text: 'Custodio R. Medina reporta cierre del paso por dos vehículos', who: 'Radio' },
    { t: '14:34', text: 'Aviso a Guardia Nacional y C5 Edomex, folio 88213', who: 'L. Herrera' },
    { t: '14:35', text: 'Unidad de reacción R-03 asignada, sale de San Juan del Río', who: 'Coordinación' },
    { t: '14:39', text: 'Tráiler detenido en camino de terracería; motor apagado remoto', who: 'Samsara' },
    { t: '14:47', text: 'R-03 y Guardia Nacional en sitio; agresores huyen', who: 'G. Pacheco' },
    { t: '14:52', text: 'Inspección de sellos: carga íntegra', who: 'G. Pacheco' },
    { t: '14:58', text: 'Aviso al cliente Alpura y a aseguradora', who: 'Coordinación' },
  ],
  stepLog: {
    3: { t: '15:05', text: 'Búsqueda y seguimiento concluidos; tráiler bajo resguardo de R-03', who: 'G. Pacheco' },
    4: { t: '15:40', text: 'Carga inspeccionada y servicio reanudado', who: 'Coordinación' },
    5: { t: '18:20', text: 'Incidente cerrado; reporte post-incidente emitido', who: 'L. Herrera' },
  },
  step: 3, minutos: { incidente: 1, autoridades: 4, sitio: 17 }, equipo: 'Unidad R-03', equipoDetalle: 'G. Pacheco + 3 · base San Juan del Río', denuncia: 'FGJEM/CUA/1184/2026', autoridades: 'Guardia Nacional · C5 Edomex',
  tituloReporte: 'Intento de robo controlado · carga recuperada al 100%',
  resumen: 'A las 14:30 la telemetría de Samsara detectó un desvío de 1.6 km del tráiler TR-88213 hacia un camino de terracería. El monitorista abrió el incidente en un minuto, se dio aviso a Guardia Nacional y C5 Edomex, y la unidad de reacción R-03 llegó al sitio a las 14:47. Los agresores huyeron; la carga se inspeccionó con sellos íntegros y el servicio se reanudó a las 15:40.',
  recomendacion: 'Para salidas de Cuautitlán entre 13:00 y 16:00 hacia Querétaro, asignar dos custodios y una geocerca de alerta temprana a 500 m de la ruta. AI27 actualiza el factor de riesgo del tramo km 120–150 en su cotizador.',
  cerrado: '7 oct 2026, 18:20', esPrincipal: true,
}

const BASES_REACCION: Record<string, string> = { 'Arco Norte': 'Tepotzotlán', 'Méx–Puebla–Orizaba': 'Puebla', 'Méx–Querétaro': 'San Juan del Río', 'Querétaro–SLP': 'San Luis Potosí', 'Guadalajara–Lagos': 'Lagos de Moreno', 'Monterrey–Nuevo Laredo': 'Sabinas Hidalgo', 'Puebla–Veracruz': 'Córdoba' }
const AUTORIDAD: Record<string, string> = { 'Arco Norte': 'Guardia Nacional · C5 Edomex', 'Méx–Puebla–Orizaba': 'Guardia Nacional · C5 Puebla', 'Méx–Querétaro': 'Guardia Nacional · C5 Edomex', 'Querétaro–SLP': 'Guardia Nacional · C4 Querétaro', 'Guadalajara–Lagos': 'Guardia Nacional · C5 Jalisco', 'Monterrey–Nuevo Laredo': 'Guardia Nacional · C5 Nuevo León', 'Puebla–Veracruz': 'Guardia Nacional · C4 Veracruz' }
const CARGAS = ['electrónicos', 'farmacéuticos', 'abarrotes', 'autopartes', 'textiles', 'bebidas', 'lácteos refrigerados', 'químicos', 'electrodomésticos']
const JEFES = ['G. Pacheco', 'M. Quintal', 'J. Pech', 'A. Domínguez']
const MONITORISTAS = ['L. Herrera', 'P. Ruiz', 'S. Campos']
const hash = (s: string) => s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7)

export function casoDeIncidente(inc: Incidente): Caso {
  const h = hash(inc.id)
  const t0 = aMin(inc.hora)
  const km = 20 + (h % 180)
  const mon = MONITORISTAS[h % MONITORISTAS.length], jefe = JEFES[(h >> 2) % JEFES.length]
  const unidad = 'R-' + String(1 + (h % 9)).padStart(2, '0')
  const carga = CARGAS[h % CARGAS.length]
  const robo = inc.tipo === 'Robo' || inc.tipo === 'Intento de robo'
  const sitio = inc.tiempoReaccionMin
  const autoridades = robo ? 3 + (h % 3) : 0
  const times = [hhmm(t0), robo ? hhmm(t0 + autoridades) : '—', hhmm(t0 + autoridades + 1 + (h % 2)), hhmm(t0 + sitio), hhmm(t0 + sitio + 40 + (h % 30)), hhmm(t0 + sitio + 180 + (h % 90))]
  const resultado: Resultado = inc.resultado === 'Pérdida' ? 'perdida' : inc.resultado === 'Recuperación parcial' ? 'parcial' : 'total'
  const resultadoTexto = inc.resultado === 'Sin afectación' ? 'Sin afectación' : inc.resultado
  const recParcial = resultado === 'parcial' ? inc.valorRecuperado : Math.round((inc.valorCarga * 0.73) / 50000) * 50000
  const parcial: [number, number] = [recParcial, inc.valorCarga - recParcial]
  const fuente = h % 4 === 0 ? 'Ruptela' : 'Samsara'
  const log: Entrada[] = [
    { t: hhmm(t0), text: inc.tipo === 'Robo' ? `Botón de pánico y detención no programada (${fuente}) convertidos en incidente (robo)` : inc.tipo === 'Intento de robo' ? `Alerta de desvío ${fuente} convertida en incidente (intento de robo)` : inc.tipo === 'Accidente' ? `Alerta de impacto ${fuente} convertida en incidente (accidente)` : `Paro de motor reportado por el custodio; incidente abierto (falla mecánica)`, who: mon },
    { t: hhmm(t0 + 1), text: inc.tipo === 'Falla mecánica' ? 'Unidad orillada en acotamiento; custodio resguarda la carga' : inc.tipo === 'Accidente' ? 'Custodio reporta colisión sin lesionados; carga sin daño aparente' : `Custodio reporta ${inc.tipo === 'Robo' ? 'sometimiento del operador por sujetos armados' : 'intento de cierre del paso por vehículo sospechoso'}`, who: 'Radio' },
  ]
  if (robo) log.push({ t: hhmm(t0 + autoridades), text: `Aviso a ${AUTORIDAD[inc.carretera] ?? 'Guardia Nacional'}, folio ${80000 + (h % 9999)}`, who: mon })
  log.push({ t: times[2], text: `Unidad de reacción ${unidad} asignada, sale de ${BASES_REACCION[inc.carretera] ?? 'base'}`, who: 'Coordinación' })
  if (robo) log.push({ t: hhmm(t0 + 4 + (h % 6)), text: inc.tipo === 'Robo' ? 'Tráiler se desvía por camino secundario; motor apagado remoto' : 'Tráiler detenido; motor apagado remoto', who: fuente })
  log.push({ t: times[3], text: `${unidad}${robo ? ' y autoridades' : ''} en sitio${inc.tipo === 'Robo' ? (resultado === 'perdida' ? '; unidad localizada sin carga' : '; sujetos huyen al notar presencia') : inc.tipo === 'Intento de robo' ? '; agresores huyen' : ''}`, who: jefe })
  log.push({ t: hhmm(t0 + sitio + 5 + (h % 5)), text: resultado === 'total' ? 'Inspección de sellos: carga íntegra' : resultado === 'parcial' ? `Inspección de carga: faltante estimado ${fmt(inc.valorCarga - inc.valorRecuperado)}` : 'Carga no localizada; se levanta denuncia y aviso a aseguradora', who: jefe })
  log.push({ t: hhmm(t0 + sitio + 11 + (h % 5)), text: `Aviso al cliente ${inc.cliente}${robo ? ' y a aseguradora' : ''}`, who: 'Coordinación' })
  const stepLog: Record<number, Entrada> = {
    3: { t: hhmm(t0 + sitio + 18 + (h % 8)), text: `Búsqueda y seguimiento concluidos; ${resultado === 'perdida' ? 'caso turnado a MP' : `tráiler bajo resguardo de ${unidad}`}`, who: jefe },
    4: { t: times[4], text: resultado === 'perdida' ? 'Siniestro documentado; unidad trasladada a corralón' : 'Carga inspeccionada y servicio reanudado', who: 'Coordinación' },
    5: { t: times[5], text: 'Incidente cerrado; reporte post-incidente emitido', who: mon },
  }
  const step = inc.fecha >= '2026-10-05' ? 3 : 6
  const logInicial = step >= 6 ? [...log, stepLog[3], stepLog[4], stepLog[5]] : log
  const ubicacion = `${inc.carretera} km ${km}`
  const titulo = `${inc.tipo} · ${ubicacion}`
  const sub = `Abierto desde alerta ${fuente} · ${inc.servicio} · ${inc.cliente} · ${carga} ${fmtM(inc.valorCarga)}`
  const tituloReporte = inc.tipo === 'Robo' ? (resultado === 'total' ? 'Robo frustrado · carga recuperada al 100%' : resultado === 'parcial' ? `Robo con recuperación parcial · ${Math.round((inc.valorRecuperado / inc.valorCarga) * 100)}% de la carga recuperada` : 'Robo con pérdida total · siniestro en proceso con aseguradora') : inc.tipo === 'Intento de robo' ? 'Intento de robo controlado · carga sin afectación' : inc.tipo === 'Accidente' ? 'Accidente vial · carga resguardada sin afectación' : 'Falla mecánica · carga resguardada y transbordada'
  const resumen = `A las ${hhmm(t0)} ${robo ? `la telemetría de ${fuente} detectó ${inc.tipo === 'Robo' ? 'una detención no programada y botón de pánico' : 'un desvío de ruta'}` : inc.tipo === 'Accidente' ? `${fuente} registró una alerta de impacto` : 'el custodio reportó un paro de motor'} en ${ubicacion} durante el servicio ${inc.servicio} de ${inc.cliente} (${carga}, ${fmt(inc.valorCarga)}). ${mon} abrió el incidente en un minuto${robo ? `, se dio aviso a ${AUTORIDAD[inc.carretera] ?? 'Guardia Nacional'}` : ''} y la unidad de reacción ${unidad} llegó al sitio a las ${times[3]} (${sitio} minutos). ${resultado === 'total' ? 'La carga se inspeccionó con sellos íntegros y el servicio se reanudó a las ' + times[4] + '.' : resultado === 'parcial' ? 'Se recuperó ' + fmt(inc.valorRecuperado) + ' de la carga; el faltante quedó documentado ante el MP y la aseguradora.' : 'La carga no fue localizada; se levantó denuncia y el siniestro quedó reportado a la aseguradora.'}`
  const recomendacion = `Para tránsitos por ${inc.carretera} entre ${hhmm(Math.floor(t0 / 60) * 60 - 60)} y ${hhmm(Math.floor(t0 / 60) * 60 + 120)}, ${inc.tipo === 'Falla mecánica' ? 'reforzar el mantenimiento preventivo de la unidad y prever una unidad de relevo en la base de ' + (BASES_REACCION[inc.carretera] ?? 'zona') : 'asignar ' + (robo ? 'dos custodios y geocerca de alerta temprana a 500 m de la ruta' : 'custodio con pausa programada y verificación de la unidad antes de salir')}. AI27 actualiza el factor de riesgo del tramo km ${Math.max(0, km - 20)}–${km + 10} en su cotizador.`
  return {
    id: inc.id, tipo: inc.tipo, titulo, sub, cliente: inc.cliente, servicio: inc.servicio, ruta: `${(BASES_REACCION[inc.carretera] ?? 'Origen')} → ${inc.carretera.split('–').pop()}`, ubicacion, carga, valor: inc.valorCarga, recuperado: inc.valorRecuperado, resultado, resultadoTexto,
    parcial, fecha: fechaLarga(inc.fecha), fechaISO: inc.fecha, times, log: logInicial, stepLog, step, minutos: { incidente: 1, autoridades, sitio }, equipo: `Unidad ${unidad}`, equipoDetalle: `${jefe} + ${2 + (h % 3)} · base ${BASES_REACCION[inc.carretera] ?? 'zona'}`,
    denuncia: robo ? `FGJ/${inc.zona.slice(0, 3).toUpperCase()}/${1000 + (h % 900)}/2026` : '—', autoridades: robo ? AUTORIDAD[inc.carretera] ?? 'Guardia Nacional' : 'No requerido', tituloReporte, resumen, recomendacion, cerrado: `${fechaLarga(inc.fecha)}, ${times[5]}`, esPrincipal: false,
  }
}

export const casos: Caso[] = [CASO_PRINCIPAL, ...incidentes.map(casoDeIncidente)]
export const casoPorId = (id: string | null | undefined) => casos.find(c => c.id === id) ?? CASO_PRINCIPAL

// ───────────────────────── Mapa de calor ─────────────────────────
export const FRANJAS = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24']
export const franjaDe = (hora: string) => Math.min(5, Math.floor(aMin(hora) / 240))
/** Incidentes por carretera y franja de 4 h, calculado desde seed (ordenado por total descendente). */
export const mapaCalor = (): [string, number[]][] => {
  const roads = Array.from(new Set(incidentes.map(i => i.carretera)))
  return roads.map(r => [r, FRANJAS.map((_, j) => incidentes.filter(i => i.carretera === r && franjaDe(i.hora) === j).length)] as [string, number[]]).sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0))
}
export const incidentesEn = (carretera: string, franja: number) => incidentes.filter(i => i.carretera === carretera && franjaDe(i.hora) === franja)
