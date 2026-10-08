import { useSyncExternalStore } from 'react'

/**
 * Estado compartido entre pantallas para el demo (en memoria + localStorage).
 * Más adelante se reemplaza por Supabase sin cambiar las pantallas: solo este módulo.
 */
export type SolicitudVacaciones = {
  id: string
  colaborador: string
  area: string
  desde: string
  hasta: string
  dias: number
  motivo?: string
  estatus: 'Pendiente' | 'Aprobada' | 'Rechazada'
  creada: string
}

export type ServicioCreado = {
  id: string
  cliente: string
  tipo: 'Por evento' | 'Dedicado' | 'Monitoreo'
  ruta: string
  precio: number
  creado: string
}

export type DecisionIA = { servicio: string; custodio: string; decision: 'aceptada' | 'descartada'; fecha: string }

type State = {
  vacaciones: SolicitudVacaciones[]
  servicios: ServicioCreado[]
  decisiones: DecisionIA[]
}

const KEY = 'ai27-demo-state-v1'
const initial: State = {
  vacaciones: [],
  servicios: [],
  decisiones: [],
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial, ...JSON.parse(raw) }
  } catch { /* sin storage: se usa el estado inicial */ }
  return initial
}

let state: State = load()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignorar */ }
  listeners.forEach(l => l())
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => sel(state),
  )
}

export const actions = {
  solicitarVacaciones(s: Omit<SolicitudVacaciones, 'id' | 'estatus' | 'creada'>) {
    const id = 'VAC-' + (119 + state.vacaciones.length)
    set({ ...state, vacaciones: [{ ...s, id, estatus: 'Pendiente', creada: new Date().toISOString().slice(0, 10) }, ...state.vacaciones] })
    return id
  },
  resolverVacaciones(id: string, estatus: 'Aprobada' | 'Rechazada') {
    set({ ...state, vacaciones: state.vacaciones.map(v => (v.id === id ? { ...v, estatus } : v)) })
  },
  crearServicio(s: Omit<ServicioCreado, 'id' | 'creado'>) {
    const id = 'SRV-' + (24120 + state.servicios.length)
    set({ ...state, servicios: [{ ...s, id, creado: new Date().toISOString() }, ...state.servicios] })
    return id
  },
  registrarDecision(d: Omit<DecisionIA, 'fecha'>) {
    set({ ...state, decisiones: [{ ...d, fecha: new Date().toISOString() }, ...state.decisiones] })
  },
  reset() { set(initial) },
}
