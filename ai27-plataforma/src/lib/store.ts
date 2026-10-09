import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * Estado compartido entre pantallas (lo que el usuario crea en el demo: clientes, leads, servicios,
 * vacaciones, trámites y decisiones de la IA).
 *
 * Persistencia: siempre en memoria + localStorage. Si Supabase está configurado (ver ./supabase.ts),
 * además se guarda en la tabla `demo_estado` (una fila por colección) y se sincroniza en tiempo real
 * entre todos los navegadores que tengan la plataforma abierta.
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
const emit = () => listeners.forEach(l => l())

type Coleccion = keyof State
const COLECCIONES = Object.keys(initial) as Coleccion[]

function set(next: State) {
  const cambiadas = COLECCIONES.filter(k => next[k] !== state[k])
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignorar */ }
  emit()
  guardarEnSupabase(cambiadas)
}

/* ─────────── Sincronización con Supabase (tabla demo_estado: coleccion text PK, datos jsonb) ─────────── */
let sincronizando = false
async function guardarEnSupabase(colecciones: Coleccion[]) {
  if (!supabase || sincronizando || colecciones.length === 0) return
  const filas = colecciones.map(c => ({ coleccion: c, datos: state[c], actualizado: new Date().toISOString() }))
  const { error } = await supabase.from('demo_estado').upsert(filas, { onConflict: 'coleccion' })
  if (error) console.warn('[supabase] no se pudo guardar', error.message)
}

async function cargarDeSupabase() {
  if (!supabase) return
  const { data, error } = await supabase.from('demo_estado').select('coleccion, datos')
  if (error) { console.warn('[supabase] no se pudo leer', error.message); return }
  if (!data || data.length === 0) {
    // Primera vez: subir lo que haya en este navegador para que la base arranque con algo.
    guardarEnSupabase(COLECCIONES.filter(c => state[c].length > 0))
    return
  }
  sincronizando = true
  const next = { ...state }
  for (const fila of data) if (fila.coleccion in initial) (next as Record<string, unknown>)[fila.coleccion] = fila.datos ?? []
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignorar */ }
  emit()
  sincronizando = false
}

if (supabase) {
  cargarDeSupabase()
  // Cambios hechos desde otro navegador llegan en tiempo real.
  supabase
    .channel('demo_estado')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_estado' }, payload => {
      const fila = payload.new as { coleccion?: string; datos?: unknown } | null
      if (!fila?.coleccion || !(fila.coleccion in initial)) return
      sincronizando = true
      state = { ...state, [fila.coleccion]: fila.datos ?? [] }
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignorar */ }
      emit()
      sincronizando = false
    })
    .subscribe()
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
