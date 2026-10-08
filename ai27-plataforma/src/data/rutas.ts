/**
 * Tabla de rutas del Cotizador: ciudades con su zona tarifaria y distancias/tiempos/casetas entre pares.
 * La ruta del diseño (Tepotzotlán → San Luis Potosí: 382 km · 4 h 40 · 6 casetas · riesgo alto) va primero.
 * Para pares no listados se estima de forma determinística a partir de coordenadas aproximadas.
 */
import type { Zona } from './seed'

export type Ciudad = { nombre: string; estado: string; zona: Zona; lat: number; lon: number }
export type Riesgo = 'Alto' | 'Medio' | 'Bajo'
export type Ruta = { km: number; minutos: number; casetas: number; costoCasetas: number; riesgo: Riesgo; tramo: string }

export const CIUDADES: Ciudad[] = [
  { nombre: 'Tepotzotlán', estado: 'Edomex', zona: 'Centro', lat: 19.72, lon: -99.22 },
  { nombre: 'Cuautitlán', estado: 'Edomex', zona: 'Centro', lat: 19.67, lon: -99.18 },
  { nombre: 'Tultitlán', estado: 'Edomex', zona: 'Centro', lat: 19.64, lon: -99.17 },
  { nombre: 'Ciudad de México', estado: 'CDMX', zona: 'Centro', lat: 19.43, lon: -99.13 },
  { nombre: 'Toluca', estado: 'Edomex', zona: 'Centro', lat: 19.29, lon: -99.66 },
  { nombre: 'Puebla', estado: 'Pue.', zona: 'Centro', lat: 19.04, lon: -98.2 },
  { nombre: 'Pachuca', estado: 'Hgo.', zona: 'Centro', lat: 20.12, lon: -98.73 },
  { nombre: 'Querétaro', estado: 'Qro.', zona: 'Bajío', lat: 20.59, lon: -100.39 },
  { nombre: 'San Luis Potosí', estado: 'SLP', zona: 'Bajío', lat: 22.15, lon: -100.98 },
  { nombre: 'León', estado: 'Gto.', zona: 'Bajío', lat: 21.12, lon: -101.68 },
  { nombre: 'Celaya', estado: 'Gto.', zona: 'Bajío', lat: 20.52, lon: -100.81 },
  { nombre: 'Aguascalientes', estado: 'Ags.', zona: 'Bajío', lat: 21.88, lon: -102.29 },
  { nombre: 'Guadalajara', estado: 'Jal.', zona: 'Occidente', lat: 20.67, lon: -103.35 },
  { nombre: 'Morelia', estado: 'Mich.', zona: 'Occidente', lat: 19.7, lon: -101.19 },
  { nombre: 'Manzanillo', estado: 'Col.', zona: 'Occidente', lat: 19.05, lon: -104.31 },
  { nombre: 'Lázaro Cárdenas', estado: 'Mich.', zona: 'Occidente', lat: 17.96, lon: -102.2 },
  { nombre: 'Monterrey', estado: 'NL', zona: 'Noreste', lat: 25.69, lon: -100.32 },
  { nombre: 'Saltillo', estado: 'Coah.', zona: 'Noreste', lat: 25.42, lon: -101.0 },
  { nombre: 'Nuevo Laredo', estado: 'Tamps.', zona: 'Noreste', lat: 27.48, lon: -99.51 },
  { nombre: 'Reynosa', estado: 'Tamps.', zona: 'Noreste', lat: 26.08, lon: -98.29 },
  { nombre: 'Veracruz', estado: 'Ver.', zona: 'Golfo', lat: 19.17, lon: -96.13 },
  { nombre: 'Córdoba', estado: 'Ver.', zona: 'Golfo', lat: 18.89, lon: -96.93 },
  { nombre: 'Tampico', estado: 'Tamps.', zona: 'Golfo', lat: 22.23, lon: -97.86 },
  { nombre: 'Villahermosa', estado: 'Tab.', zona: 'Golfo', lat: 17.99, lon: -92.93 },
  { nombre: 'Mérida', estado: 'Yuc.', zona: 'Sureste', lat: 20.97, lon: -89.62 },
  { nombre: 'Cancún', estado: 'Q. Roo', zona: 'Sureste', lat: 21.16, lon: -86.85 },
  { nombre: 'Hermosillo', estado: 'Son.', zona: 'Noroeste', lat: 29.07, lon: -110.96 },
  { nombre: 'Culiacán', estado: 'Sin.', zona: 'Noroeste', lat: 24.8, lon: -107.39 },
  { nombre: 'Nogales', estado: 'Son.', zona: 'Noroeste', lat: 31.3, lon: -110.94 },
]

export const etiqueta = (c: Ciudad) => `${c.nombre}, ${c.estado}`
export const ciudadDe = (nombre: string) => CIUDADES.find(c => c.nombre === nombre || etiqueta(c) === nombre) ?? CIUDADES[0]
export const zonaDe = (nombre: string): Zona => ciudadDe(nombre).zona

/** Pares conocidos (distancias carreteras reales aproximadas). [km, minutos, casetas, costoCasetas, riesgo, tramo] */
const PARES: Record<string, [number, number, number, number, Riesgo, string]> = {
  'Tepotzotlán|San Luis Potosí': [382, 280, 6, 1840, 'Alto', 'Querétaro–SLP'],
  'Tepotzotlán|Querétaro': [176, 125, 3, 760, 'Medio', 'Méx–Querétaro'],
  'Cuautitlán|Querétaro': [185, 130, 3, 760, 'Medio', 'Méx–Querétaro'],
  'Cuautitlán|Guadalajara': [530, 370, 8, 2480, 'Alto', 'Méx–Qro–Gdl'],
  'Cuautitlán|Puebla': [165, 135, 4, 980, 'Medio', 'Arco Norte'],
  'Ciudad de México|Puebla': [130, 115, 2, 520, 'Medio', 'Méx–Puebla'],
  'Ciudad de México|Veracruz': [405, 300, 5, 1620, 'Alto', 'Méx–Puebla–Orizaba'],
  'Puebla|Veracruz': [280, 200, 3, 1100, 'Alto', 'Puebla–Orizaba–Veracruz'],
  'Tultitlán|Pachuca': [78, 70, 2, 390, 'Medio', 'Arco Norte'],
  'Querétaro|San Luis Potosí': [205, 150, 3, 880, 'Alto', 'Querétaro–SLP'],
  'Querétaro|Monterrey': [720, 480, 7, 2260, 'Alto', 'Qro–SLP–Mty'],
  'San Luis Potosí|Monterrey': [515, 330, 4, 1380, 'Alto', 'SLP–Mty'],
  'Guadalajara|León': [220, 150, 3, 820, 'Medio', 'Gdl–Lagos–León'],
  'Monterrey|Nuevo Laredo': [225, 150, 2, 760, 'Alto', 'Monterrey–Nuevo Laredo'],
  'Saltillo|Nuevo Laredo': [300, 200, 2, 820, 'Medio', 'Saltillo–Nuevo Laredo'],
  'Toluca|Monterrey': [960, 630, 9, 2980, 'Alto', 'Méx–Qro–SLP–Mty'],
  'Toluca|Guadalajara': [490, 340, 7, 2200, 'Medio', 'Toluca–Morelia–Gdl'],
  'Mérida|Cancún': [305, 210, 1, 640, 'Bajo', 'Mérida–Cancún'],
  'Hermosillo|Nogales': [280, 180, 2, 560, 'Medio', 'Hermosillo–Nogales'],
  'Culiacán|Nogales': [1010, 650, 6, 1900, 'Alto', 'Culiacán–Nogales'],
  'León|Lázaro Cárdenas': [560, 400, 5, 1700, 'Alto', 'León–Lázaro Cárdenas'],
  'Puebla|Manzanillo': [900, 600, 9, 2800, 'Alto', 'Puebla–Manzanillo'],
}

const hav = (a: Ciudad, b: Ciudad) => {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function ruta(origen: string, destino: string): Ruta {
  const a = ciudadDe(origen), b = ciudadDe(destino)
  const k = PARES[`${a.nombre}|${b.nombre}`] ?? PARES[`${b.nombre}|${a.nombre}`]
  if (k) return { km: k[0], minutos: k[1], casetas: k[2], costoCasetas: k[3], riesgo: k[4], tramo: k[5] }
  if (a.nombre === b.nombre) return { km: 0, minutos: 0, casetas: 0, costoCasetas: 0, riesgo: 'Bajo', tramo: 'local' }
  // Estimación: distancia carretera ≈ 1.25 × línea recta; 78 km/h promedio; 1 caseta cada 65 km
  const km = Math.round(hav(a, b) * 1.25)
  const casetas = Math.max(1, Math.round(km / 65))
  const riesgo: Riesgo = ['Noreste', 'Bajío'].includes(a.zona) || ['Noreste', 'Bajío'].includes(b.zona) ? 'Alto' : a.zona === 'Sureste' && b.zona === 'Sureste' ? 'Bajo' : 'Medio'
  return { km, minutos: Math.round(km / 78 * 60), casetas, costoCasetas: casetas * 310, riesgo, tramo: `${a.nombre}–${b.nombre}` }
}

/** Factor de riesgo del precio según tramo y horario (el diseño: Alto nocturno 1.4 · Alto diurno 1.15). */
export const factorRiesgo = (r: Riesgo, nocturno: boolean) =>
  r === 'Alto' ? (nocturno ? 1.4 : 1.15) : r === 'Medio' ? (nocturno ? 1.25 : 1.1) : nocturno ? 1.1 : 1.0

export const tiempoTexto = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
