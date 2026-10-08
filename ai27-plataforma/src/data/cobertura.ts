/**
 * Cobertura de custodios a 48 h por zona, calculada desde seed.
 * Disponibles = custodios con estatus "Disponible" en la zona (seed). Requeridos = servicios agendados para mañana
 * por zona (agenda operativa del demo; los números de Centro/Bajío/Occidente/Noreste/Golfo son los del diseño).
 */
import { custodios, ZONAS, type Zona } from './seed'

export const AGENDA_MANANA: Record<Zona, number> = { Centro: 12, Bajío: 18, Occidente: 9, Noreste: 6, Golfo: 8, Sureste: 5, Noroeste: 4 }
/** Picos adicionales en las próximas 48 h (no están en seed). */
export const PICOS_48H: { zona: Zona; dia: string; cliente: string; eventos: number }[] = [{ zona: 'Golfo', dia: 'viernes', cliente: 'Bebidas del Golfo', eventos: 9 }]

export type Cobertura = { zona: Zona; disponibles: number; requeridos: number; diff: number; descanso: number; vacaciones: number; nombres: string[] }

export function coberturaPorZona(): Cobertura[] {
  return ZONAS.map(zona => {
    const cz = custodios.filter(c => c.zona === zona)
    const disp = cz.filter(c => c.estatus === 'Disponible')
    return { zona, disponibles: disp.length, requeridos: AGENDA_MANANA[zona], diff: disp.length - AGENDA_MANANA[zona], descanso: cz.filter(c => c.estatus === 'Descanso').length, vacaciones: cz.filter(c => c.estatus === 'Vacaciones').length, nombres: disp.map(c => c.nombre) }
  })
}

/** Sugerencia para cubrir un hueco: de qué zonas con excedente mover custodios. */
export function sugerirCobertura(zona: Zona, faltan: number, cob = coberturaPorZona()): { zona: Zona; n: number }[] {
  const VECINOS: Record<Zona, Zona[]> = { Centro: ['Bajío', 'Golfo'], Bajío: ['Centro', 'Occidente'], Occidente: ['Bajío', 'Centro'], Noreste: ['Bajío', 'Noroeste'], Golfo: ['Centro', 'Sureste'], Sureste: ['Golfo', 'Centro'], Noroeste: ['Noreste', 'Occidente'] }
  const out: { zona: Zona; n: number }[] = []
  let resta = faltan
  for (const v of [...VECINOS[zona], ...ZONAS.filter(z => z !== zona && !VECINOS[zona].includes(z))]) {
    if (resta <= 0) break
    const exc = cob.find(c => c.zona === v)
    if (!exc || exc.diff <= 0) continue
    const n = Math.min(exc.diff, resta)
    out.push({ zona: v, n }); resta -= n
  }
  return out
}
