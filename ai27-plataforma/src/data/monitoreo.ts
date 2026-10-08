/**
 * Unidades del mapa en vivo, derivadas de los servicios activos de seed (por evento y dedicados = un tráiler del
 * cliente + un auto de custodia). La unidad del diseño (SRV-24817 de Alpura, en desvío) va primero con sus datos
 * exactos; las 4 siguientes ocupan las posiciones del diseño y el resto se ubica por zona en el mapa.
 */
import { custodios, servicios, unidades, type Servicio, type Zona } from './seed'

export type EstadoUnidad = 'Desvío' | 'En ruta' | 'Detenido' | 'Sin señal'
export type UnidadMapa = {
  id: string; cliente: string; tipo: Servicio['tipo']; trailer: string; auto: string; custodios: string; monitorista: string
  fuente: 'Samsara' | 'Ruptela'; zona: Zona; ruta: string; x: number; y: number; velocidad: number; estado: EstadoUnidad; detalle: string; inicio: string
}

const CIUDAD: Record<Zona, [number, number][]> = {
  Centro: [[500, 370], [520, 345], [560, 390], [470, 345]],
  Bajío: [[450, 320], [390, 290], [480, 250], [420, 300]],
  Occidente: [[300, 330], [330, 310], [280, 350]],
  Noreste: [[560, 120], [590, 150], [540, 160]],
  Golfo: [[660, 370], [630, 380], [700, 350]],
  Sureste: [[820, 420], [850, 450], [790, 470]],
  Noroeste: [[110, 110], [150, 140], [90, 160]],
}
const POS_DISEÑO: [number, number][] = [[534, 222], [604, 374], [470, 282], [356, 306]]
const RIESGO = ['Méx–Qro–Gdl', 'Méx–Puebla–Veracruz', 'Puebla–Orizaba–Veracruz', 'Qro–SLP–Mty', 'Tepotzotlán–Querétaro']

/** Conversión determinística de un id a entero (para posiciones y velocidades estables). */
const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h }

const activos = servicios.filter(s => (s.estatus === 'Confirmado' || s.estatus === 'En tránsito') && s.tipo !== 'Monitoreo')

export const HERO: UnidadMapa = {
  id: 'SRV-24817', cliente: 'Alpura', tipo: 'Por evento', trailer: 'TR-88213', auto: 'AU-3321', custodios: 'R. Medina, E. Villa', monitorista: 'L. Herrera', fuente: 'Samsara', zona: 'Centro', ruta: 'Méx–Qro–Gdl',
  x: 438, y: 344, velocidad: 38, estado: 'Desvío', detalle: '1.6 km fuera de geocerca hacia camino de terracería, km 142 Méx–Qro. Custodio a 1.1 km del tráiler. Velocidad 38 km/h.', inicio: '2026-10-07T08:12:00',
}

export const unidadesMapa: UnidadMapa[] = [
  HERO,
  ...activos.map((s, i) => {
    const h = hash(s.id)
    const pos = i < POS_DISEÑO.length ? POS_DISEÑO[i] : CIUDAD[s.zona][h % CIUDAD[s.zona].length]
    const jitter = i < POS_DISEÑO.length ? [0, 0] : [((h >> 3) % 61) - 30, ((h >> 7) % 41) - 20]
    const estado: EstadoUnidad = s.estatus === 'Confirmado' ? 'Detenido' : h % 23 === 0 ? 'Sin señal' : 'En ruta'
    const velocidad = estado === 'En ruta' ? 62 + (h % 34) : 0
    const auto = unidades.find(u => u.id === s.unidad)
    return {
      id: s.id, cliente: s.cliente, tipo: s.tipo, trailer: 'TR-' + (60000 + (h % 30000)), auto: s.unidad, custodios: s.custodios, monitorista: s.monitorista, fuente: s.fuente, zona: s.zona, ruta: s.ruta,
      x: pos[0] + jitter[0], y: pos[1] + jitter[1], velocidad, estado,
      detalle: estado === 'Detenido' ? `Confirmado, en espera de salida en ${s.ruta.replace(' (dedicado)', '')}. ${auto ? auto.vehiculo + ' · ' + auto.placas : ''}` : estado === 'Sin señal' ? `Sin reporte GPS desde hace ${4 + (h % 9)} min en ${s.ruta}. Último punto reportado por ${s.fuente}.` : `En tránsito por ${s.ruta} a ${velocidad} km/h. Dentro de geocerca; ${auto ? auto.vehiculo + ' · ' + auto.placas : s.unidad}.`,
      inicio: s.inicio,
    }
  }),
]

export const enZonaRiesgo = (xs: UnidadMapa[]) => xs.filter(u => RIESGO.includes(u.ruta))

/** Conteos del encabezado: custodios a bordo, autos de custodia y tráileres reportando (incluye monitoreo puro). */
export function conteosMapa(xs: UnidadMapa[]) {
  const custodiosN = xs.reduce((a, u) => a + u.custodios.split(', ').filter(x => x !== '—').length, 0)
  const autos = new Set(xs.map(u => u.auto)).size
  const monitoreo = servicios.filter(s => (s.estatus === 'Confirmado' || s.estatus === 'En tránsito') && s.tipo === 'Monitoreo')
  const trailers = xs.length + monitoreo.reduce((a, s) => a + parseInt(s.ruta), 0)
  return { custodios: custodiosN, autos, trailers }
}

/** Custodios (con teléfono) de una unidad del mapa, buscando por inicial y apellido en seed. */
export function custodiosDeUnidad(u: UnidadMapa) {
  return u.custodios.split(', ').filter(x => x && x !== '—').map(ini => {
    const [i, ...ap] = ini.split(' ')
    const apellido = ap.join(' ')
    const c = custodios.find(x => x.zona === u.zona && x.nombre.startsWith(i.replace('.', '')) && x.nombre.endsWith(apellido)) ?? custodios.find(x => x.nombre.endsWith(apellido))
    return { nombre: c?.nombre ?? ini, telefono: c?.telefono ?? '55 0000 0000', id: c?.id ?? '—', base: c?.base ?? u.zona }
  })
}
