import type { CSSProperties } from 'react'

const cache = new Map<string, CSSProperties>()

/** Convierte un string CSS inline del diseño ("display:flex;gap:8px") a un objeto de estilo de React. */
export function sx(css: string | undefined | null): CSSProperties {
  if (!css) return {}
  const hit = cache.get(css)
  if (hit) return hit
  const out: Record<string, string> = {}
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (!prop) continue
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    out[key] = val
  }
  cache.set(css, out as CSSProperties)
  return out as CSSProperties
}

export const fmtMXN = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
