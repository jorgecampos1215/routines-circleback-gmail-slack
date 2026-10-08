/**
 * Usuarios de la plataforma derivados de seed (colaboradores por área + contactos de clientes con portal).
 * 58 usuarios en 9 roles, como en el diseño. No edita seed.ts.
 */
import { colaboradores, clientes } from './seed'

export type Usuario = { id: string; nombre: string; correo: string; rol: string; zona: string; ultimoAcceso: string; estatus: 'Activo' | 'Invitado' | 'Inactivo' }

/** Rol → [área de seed, cantidad] (los totales del diseño). */
const ROL_AREA: [string, string, number][] = [
  ['Dirección', 'Dirección', 4], ['Operaciones', 'Operaciones', 9], ['Monitorista', 'Monitoreo', 18], ['Reacción', 'Reacción', 6],
  ['Flotilla / Taller', 'Flotilla y taller', 5], ['RH', 'Recursos humanos', 4], ['Comercial', 'Comercial', 5], ['Finanzas', 'Finanzas', 4],
]
const quitarAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const correoDe = (nombre: string) => { const [n, a] = nombre.split(' '); return `${quitarAcentos(n)[0]}${quitarAcentos(a || n)}@ai27.mx` }
const ACCESOS = ['hoy 08:12', 'hoy 07:55', 'hoy 06:40', 'ayer 22:10', 'ayer 18:31', 'ayer 15:02', '6 oct 09:14', '5 oct 19:47', '3 oct 11:20', '30 sep 08:05']

export const usuarios: Usuario[] = (() => {
  const out: Usuario[] = []
  let k = 0
  for (const [rol, area, n] of ROL_AREA) {
    for (const c of colaboradores.filter(c => c.area === area).slice(0, n)) {
      out.push({ id: c.id, nombre: c.nombre, correo: correoDe(c.nombre), rol, zona: rol === 'Monitorista' ? 'Centro y Bajío' : rol === 'Dirección' || rol === 'RH' || rol === 'Finanzas' ? 'Todas las zonas' : c.zona, ultimoAcceso: ACCESOS[k++ % ACCESOS.length], estatus: 'Activo' })
    }
  }
  for (const cl of clientes.filter(c => c.portalEnVivo)) {
    out.push({ id: 'PC-' + String(100 + out.length), nombre: cl.contacto, correo: cl.correo, rol: 'Portal cliente', zona: cl.nombre, ultimoAcceso: ACCESOS[k++ % ACCESOS.length], estatus: 'Activo' })
  }
  return out // 58
})()
