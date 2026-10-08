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
  /** Opcionales (los llena "Nuevo servicio" en Servicios): fecha de inicio, custodios asignados, unidad y monitorista. */
  fecha?: string
  custodios?: string
  unidad?: string
  monitorista?: string
}

export type DecisionIA = { servicio: string; custodio: string; decision: 'aceptada' | 'descartada'; fecha: string }

/** Trámite pedido desde Mi portal ("Solicitar a RH"): constancia laboral, carta, cambio de datos… */
export type TramiteRH = {
  id: string
  colaborador: string
  area: string
  tramite: string
  motivo: string
  estatus: 'Pendiente' | 'Entregado' | 'Rechazado'
  creada: string
}

/** Cliente dado de alta desde CRM ("Alta de cliente"); se suma a seed.clientes en CRM, Cotizador y Finanzas. */
export type ClienteNuevo = {
  nombre: string
  sector: string
  contacto: string
  correo: string
  telefono: string
  tipo: 'Por evento' | 'Dedicado' | 'Monitoreo' | 'Evento + monitoreo'
  tarifa: string
  creado: string
}

/** Lead del pipeline comercial creado desde CRM ("Nuevo lead"). */
export type Lead = {
  id: string
  empresa: string
  que: string
  monto: string
  siguiente: string
  etapa: 'Prospecto' | 'Diagnóstico' | 'Cotizado' | 'Negociación' | 'Ganado'
  creado: string
}

type State = {
  vacaciones: SolicitudVacaciones[]
  servicios: ServicioCreado[]
  decisiones: DecisionIA[]
  tramites: TramiteRH[]
  clientesNuevos: ClienteNuevo[]
  leads: Lead[]
}

const KEY = 'ai27-demo-state-v1'
const initial: State = {
  vacaciones: [],
  servicios: [],
  decisiones: [],
  tramites: [],
  clientesNuevos: [],
  leads: [],
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
  solicitarTramite(t: Omit<TramiteRH, 'id' | 'estatus' | 'creada'>) {
    const id = 'TR-' + (2041 + (state.tramites ?? []).length)
    set({ ...state, tramites: [{ ...t, id, estatus: 'Pendiente', creada: new Date().toISOString().slice(0, 10) }, ...(state.tramites ?? [])] })
    return id
  },
  resolverTramite(id: string, estatus: 'Entregado' | 'Rechazado') {
    set({ ...state, tramites: (state.tramites ?? []).map(x => (x.id === id ? { ...x, estatus } : x)) })
  },
  crearCliente(c: Omit<ClienteNuevo, 'creado'>) {
    const prev = (state.clientesNuevos ?? []).filter(x => x.nombre !== c.nombre)
    set({ ...state, clientesNuevos: [{ ...c, creado: new Date().toISOString().slice(0, 10) }, ...prev] })
    return c.nombre
  },
  crearLead(l: Omit<Lead, 'id' | 'creado' | 'etapa'> & { etapa?: Lead['etapa'] }) {
    const id = 'LEAD-' + (2041 + (state.leads ?? []).length)
    set({ ...state, leads: [{ etapa: 'Prospecto', ...l, id, creado: new Date().toISOString().slice(0, 10) }, ...(state.leads ?? [])] })
    return id
  },
  moverLead(id: string, etapa: Lead['etapa']) {
    set({ ...state, leads: (state.leads ?? []).map(x => (x.id === id ? { ...x, etapa } : x)) })
  },
  registrarDecision(d: Omit<DecisionIA, 'fecha'>) {
    set({ ...state, decisiones: [{ ...d, fecha: new Date().toISOString() }, ...state.decisiones] })
  },
  reset() { set(initial) },
}
