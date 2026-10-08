/**
 * Ranking de custodios para Asignación IA, generado desde seed para la zona del servicio.
 * Los 4 candidatos del diseño van primero con su texto y puntaje exactos; el resto se puntúa con los 4 factores
 * (cercanía, descanso, experiencia en ruta, desempeño) a partir de base, horas de la semana, servicios acumulados
 * y calificación de cada custodio en seed.
 */
import { custodios, unidades, incidentes, ZONA_PLANTILLA, type Custodio, type Zona } from './seed'

export const SERVICIO = { id: 'SRV-24841', cliente: 'Marsh', origen: 'Tepotzotlán, Edomex', destino: 'San Luis Potosí, SLP', fecha: '08 oct 2026', salida: '22:00', custodios: 2, unidades: 1, zona: 'Centro' as Zona, zonaApoyo: 'Bajío' as Zona, carretera: 'Querétaro–SLP' }

export const FACTORES = ['Cercanía', 'Descanso', 'Experiencia ruta', 'Desempeño']
export type Candidato = { id: string; name: string; base: string; zona: Zona; score: number; why: string; f: [number, number, number, number]; cumple: boolean; telefono: string }

/** Km aproximados de cada base al origen (Tepotzotlán). */
const KM: Record<string, number> = { Tepotzotlán: 3, Cuautitlán: 14, Tultitlán: 18, Ecatepec: 32, Toluca: 70, Puebla: 150, Querétaro: 170, Celaya: 220, 'San Luis Potosí': 380, León: 300, Irapuato: 260, Aguascalientes: 420 }

const DISEÑO: Candidato[] = [
  { id: 'C-1102', name: 'Hugo Salazar', base: 'Cuautitlán', zona: 'Centro', score: 94, why: 'A 14 km del origen, libre desde ayer 18:00 (28 h de descanso). 22 servicios Marsh sin incidentes; 9 viajes previos a SLP. Portación y confianza vigentes.', f: [92, 100, 96, 88], cumple: true, telefono: '' },
  { id: 'C-0877', name: 'Iván Cetina', base: 'Tepotzotlán', zona: 'Centro', score: 91, why: 'A 3 km del origen. Experto en ruta nocturna Qro–SLP (14 viajes). Desempeño 4.8/5. Lleva 38 h esta semana, dentro del límite.', f: [99, 90, 94, 82], cumple: true, telefono: '' },
  { id: 'C-1240', name: 'Óscar Bautista', base: 'Querétaro', zona: 'Bajío', score: 83, why: 'Podría unirse en Querétaro. Sin servicios previos con Marsh; evaluación de confianza vence en 21 días.', f: [64, 85, 70, 90], cumple: false, telefono: '' },
  { id: 'C-0931', name: 'Rafael Uc', base: 'Tultitlán', zona: 'Centro', score: 77, why: 'Disponible, pero terminó servicio hace 9 h: descanso por debajo del mínimo recomendado de 12 h.', f: [88, 45, 80, 78], cumple: false, telefono: '' },
]

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
export const cumpleRequisitos = (c: Custodio) => c.portacion && c.docs === 'Al día' && c.certificaciones.includes('Carga alto valor')

function puntuar(c: Custodio): Candidato {
  const km = KM[c.base] ?? 120
  const cercania = clamp(100 - km / 2.2)
  const descanso = clamp(100 - Math.max(0, c.horasSemana - 24) * 3)
  const experiencia = clamp(40 + c.serviciosAcumulados / 340 * 60)
  const desempeno = clamp(c.calificacion / 5 * 100)
  const f: [number, number, number, number] = [cercania, descanso, experiencia, desempeno]
  // Sin historial con el cliente del servicio: el modelo aplica un ajuste de 7% al promedio de factores.
  const score = Math.round((cercania + descanso + experiencia + desempeno) / 4 * 0.93)
  const cumple = cumpleRequisitos(c)
  const why = [
    c.zona === SERVICIO.zona ? `A ${km} km del origen.` : `Podría unirse en ${c.base} (${km} km).`,
    `${c.serviciosAcumulados} servicios acumulados, desempeño ${c.calificacion.toFixed(1)}/5; sin servicios previos con ${SERVICIO.cliente}.`,
    `${c.horasSemana} h esta semana${c.horasSemana > 44 ? ': cerca del límite' : ''}.`,
    c.docs === 'Al día' ? 'Documentos al día.' : `Documentos: ${c.docs.toLowerCase()}.`,
    c.portacion ? '' : 'Sin portación vigente.',
  ].filter(Boolean).join(' ')
  return { id: c.id, name: c.nombre, base: c.base, zona: c.zona, score, why, f, cumple, telefono: c.telefono }
}

/** Candidatos: los del diseño primero y después todos los disponibles de la zona (y la zona de apoyo), por puntaje. */
export function candidatos(): Candidato[] {
  const ids = new Set(DISEÑO.map(d => d.id))
  const diseño = DISEÑO.map(d => ({ ...d, telefono: custodios.find(c => c.id === d.id)?.telefono ?? '' }))
  const resto = custodios
    .filter(c => c.estatus === 'Disponible' && (c.zona === SERVICIO.zona || c.zona === SERVICIO.zonaApoyo) && !ids.has(c.id))
    .map(puntuar)
    .sort((a, b) => b.score - a.score)
  return [...diseño, ...resto]
}

export function resumenEvaluacion() {
  const pool = custodios.filter(c => c.estatus === 'Disponible' && (c.zona === SERVICIO.zona || c.zona === SERVICIO.zonaApoyo))
  return { zona: ZONA_PLANTILLA[SERVICIO.zona].total, apoyo: ZONA_PLANTILLA[SERVICIO.zonaApoyo].total, disponibles: pool.length, cumplen: pool.filter(cumpleRequisitos).length }
}

export function riesgoRuta() {
  const inc = incidentes.filter(i => i.carretera === SERVICIO.carretera)
  const noct = inc.filter(i => { const h = parseInt(i.hora.slice(0, 2)); return h >= 23 || h < 3 }).length
  return { n: inc.length, nocturnos: noct, factor: inc.length >= 8 ? 1.4 : inc.length >= 4 ? 1.2 : 1.0 }
}

/** Unidades disponibles en la zona del servicio (la del diseño, AU-2087, primero). */
export function unidadesDisponibles() {
  return unidades.filter(u => u.estatus === 'Disponible' && u.zona === SERVICIO.zona).sort((a, b) => (a.id === 'AU-2087' ? -1 : b.id === 'AU-2087' ? 1 : a.km - b.km))
}
