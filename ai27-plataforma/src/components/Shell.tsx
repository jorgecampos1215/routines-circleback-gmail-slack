import type { ReactNode } from 'react'
import { sx } from '../lib/sx'
import { Nav, type NavId } from './Nav'

/**
 * Contenedor estándar de las pantallas con sidebar: reproduce el wrapper de los .dc.html
 * (flex-wrap: en celular el menú se apila arriba).
 * `css` = el bloque <style> del <helmet> de la pantalla original (se monta solo mientras la pantalla está visible).
 */
export function Shell({ active, css, children, mainStyle }: { active: NavId; css?: string; children: ReactNode; mainStyle?: string }) {
  return (
    <div style={sx("font-family:'Montserrat',system-ui,sans-serif;color:#0D1D41;background:#F6F7F9;min-height:100vh;display:flex;flex-wrap:wrap")}>
      {css && <style>{css}</style>}
      <div style={sx('flex:1 1 240px;background:#FFFFFF;border-right:1px solid #EEF1F4')}>
        <Nav active={active} />
      </div>
      <main style={sx(mainStyle ?? 'flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:24px')}>
        {children}
      </main>
    </div>
  )
}
