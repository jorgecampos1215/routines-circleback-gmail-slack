import { useSyncExternalStore } from 'react'

/**
 * Modo de pantalla compartido por toda la plataforma.
 *   escritorio ≥ 1024px · tablet 720–1023px · movil < 720px
 * `useViewport()` re-renderiza al cruzar un corte; `modoActual()` lo lee sin suscribirse (lo usa `sx()`).
 */
export type Modo = 'escritorio' | 'tablet' | 'movil'

export const CORTE_MOVIL = 720
export const CORTE_TABLET = 1024

const MQ_MOVIL = `(max-width: ${CORTE_MOVIL - 1}px)`
const MQ_TABLET = `(max-width: ${CORTE_TABLET - 1}px)`

function calcular(): Modo {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'escritorio'
  if (window.matchMedia(MQ_MOVIL).matches) return 'movil'
  if (window.matchMedia(MQ_TABLET).matches) return 'tablet'
  return 'escritorio'
}

let modo: Modo = calcular()
const oyentes = new Set<() => void>()

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const revisar = () => {
    const nuevo = calcular()
    if (nuevo !== modo) { modo = nuevo; oyentes.forEach(f => f()) }
  }
  for (const q of [MQ_MOVIL, MQ_TABLET]) {
    const mq = window.matchMedia(q)
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', revisar)
    else mq.addListener(revisar)
  }
}

export const modoActual = (): Modo => modo
export const esMovil = () => modo === 'movil'
export const esCompacto = () => modo !== 'escritorio'

export function useViewport(): Modo {
  return useSyncExternalStore(
    cb => { oyentes.add(cb); return () => { oyentes.delete(cb) } },
    () => modo,
    () => 'escritorio',
  )
}
