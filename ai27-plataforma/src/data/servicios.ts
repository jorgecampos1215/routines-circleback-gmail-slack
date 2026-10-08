/**
 * Filas de la pantalla Servicios derivadas de seed.servicios (300 del trimestre).
 * Las 10 filas del diseño sustituyen a 10 filas de seed del mismo tipo y misma condición (activo / no activo),
 * así el total sigue siendo 300 y los activos 86 (34 por evento · 41 dedicados · 11 monitoreo).
 */
import { servicios, type TipoServicio } from './seed'
import { fmtMXN } from '../lib/sx'

export type FilaServicio = {
  id: string
  client: string
  type: TipoServicio
  route: string
  cust: string // número de custodios o '—'
  custNombres: string
  mon: string
  fee: string
  monto: number
  status: string
  activo: boolean
  inicio: string // ISO
  zona: string
  unidad: string
  fuente: string
  nuevo?: boolean
}

const DISEÑO: [string, string, TipoServicio, string, string, string, string, string][] = [
  ['SRV-24817', 'Alpura', 'Por evento', 'Cuautitlán → El Salto, Jal.', '2', 'L. Herrera', '$38,500', 'Con incidente'],
  ['SRV-24803', 'Marsh', 'Por evento', 'Tultitlán → Pachuca (Arco Norte)', '2', 'L. Herrera', '$24,900', 'En tránsito'],
  ['SRV-24822', 'Farmacéutica Orión', 'Por evento', 'Toluca → Monterrey', '3', 'P. Ruiz', '$71,200', 'En tránsito'],
  ['DED-0412', 'Electrónica del Bajío', 'Dedicado', '2 custodios · indefinido', '2', '—', '$96,000/mes', 'Activo'],
  ['MON-0087', 'Logística Pacífico Norte', 'Monitoreo', '48 unidades · SLA 5 min', '—', 'S. Campos', '$43,200/mes', 'Activo'],
  ['SRV-24830', 'Bebidas del Golfo', 'Por evento', 'Veracruz → Puebla', '1', 'A. Domínguez', '$18,700', 'Confirmado'],
  ['DED-0419', 'Autopartes Saltillo', 'Dedicado', '4 custodios · 12 meses', '4', '—', '$188,000/mes', 'Activo'],
  ['SRV-24791', 'Alpura', 'Por evento', 'Cuautitlán → Querétaro', '1', 'P. Ruiz', '$14,300', 'Entregado'],
  ['SRV-24836', 'Grupo Textil Arrayán', 'Por evento', 'Puebla → Lázaro Cárdenas', '2', '—', '$52,800', 'Cotizado'],
  ['MON-0091', 'Marsh', 'Monitoreo', '22 unidades · 24/7', '—', 'S. Campos', '$19,800/mes', 'Activo'],
]
const DISEÑO_CUST: Record<string, string> = { 'SRV-24817': 'R. Medina, E. Villa', 'SRV-24803': 'H. Salazar, I. Cetina', 'SRV-24822': 'M. Ríos, O. Bautista, R. Uc', 'DED-0412': 'J. Ordaz, F. Arce', 'SRV-24830': 'F. Arce', 'DED-0419': '4 custodios Noreste', 'SRV-24791': 'R. Medina', 'SRV-24836': 'por asignar' }

const activoDe = (status: string) => ['Confirmado', 'En tránsito', 'Con incidente', 'Activo'].includes(status)

export const filasServicios: FilaServicio[] = (() => {
  const usados = new Set<number>()
  const out: FilaServicio[] = []
  for (const [id, client, type, route, cust, mon, fee, status] of DISEÑO) {
    const activo = activoDe(status)
    // sustituye una fila de seed del mismo tipo y misma condición (activa = índice < 86)
    const k = servicios.findIndex((s, i) => !usados.has(i) && s.tipo === type && (i < 86) === activo && (status !== 'Entregado' || s.estatus === 'Entregado'))
    const base = servicios[k >= 0 ? k : servicios.findIndex((_, i) => !usados.has(i))]
    usados.add(servicios.indexOf(base))
    out.push({ id, client, type, route, cust, custNombres: DISEÑO_CUST[id] ?? '—', mon, fee, monto: parseInt(fee.replace(/\D/g, '')), status, activo, inicio: base.inicio, zona: base.zona, unidad: id === 'SRV-24817' ? 'AU-3321' : base.unidad, fuente: base.fuente })
  }
  servicios.forEach((s, i) => {
    if (usados.has(i)) return
    const activo = i < 86
    const status = activo && s.tipo !== 'Por evento' ? 'Activo' : s.estatus
    const nCust = s.tipo === 'Monitoreo' ? '—' : String(s.custodios.split(', ').length)
    out.push({ id: s.id, client: s.cliente, type: s.tipo, route: s.ruta, cust: nCust, custNombres: s.custodios, mon: s.monitorista, fee: fmtMXN(s.monto) + (s.tipo === 'Por evento' ? '' : '/mes'), monto: s.monto, status, activo, inicio: s.inicio, zona: s.zona, unidad: s.unidad, fuente: s.fuente })
  })
  return out
})()

export const MONITORISTAS = ['L. Herrera', 'P. Ruiz', 'S. Campos', 'A. Domínguez', 'M. Quintal', 'J. Pech']
