/** Mapa de archivos del diseño (.dc.html) → rutas de la app. */
export const ROUTES = {
  Main: '/',
  AsistenteIA: '/asistente',
  Servicios: '/servicios',
  AsignacionIA: '/asignacion',
  Monitoreo: '/monitoreo',
  Reaccion: '/reaccion',
  ReporteIncidente: '/reaccion/reporte',
  Custodios: '/custodios',
  Flotilla: '/flotilla',
  RH: '/personas',
  PortalColaborador: '/mi-portal',
  Usuarios: '/usuarios',
  Cotizador: '/cotizador',
  CotizacionPDF: '/cotizador/pdf',
  CRM: '/clientes',
  Finanzas: '/finanzas',
  Reportes: '/reportes',
  CustodioMovil: '/custodio',
  Flujo: '/flujo',
  Oportunidades: '/oportunidades',
} as const
export type PageName = keyof typeof ROUTES
