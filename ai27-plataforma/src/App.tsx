import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ROUTES, type PageName } from './lib/routes'

const pages: Record<PageName, ReturnType<typeof lazy>> = {
  Main: lazy(() => import('./pages/Main')),
  AsistenteIA: lazy(() => import('./pages/AsistenteIA')),
  Servicios: lazy(() => import('./pages/Servicios')),
  AsignacionIA: lazy(() => import('./pages/AsignacionIA')),
  Monitoreo: lazy(() => import('./pages/Monitoreo')),
  Reaccion: lazy(() => import('./pages/Reaccion')),
  ReporteIncidente: lazy(() => import('./pages/ReporteIncidente')),
  Custodios: lazy(() => import('./pages/Custodios')),
  Flotilla: lazy(() => import('./pages/Flotilla')),
  RH: lazy(() => import('./pages/RH')),
  PortalColaborador: lazy(() => import('./pages/PortalColaborador')),
  Usuarios: lazy(() => import('./pages/Usuarios')),
  Cotizador: lazy(() => import('./pages/Cotizador')),
  CotizacionPDF: lazy(() => import('./pages/CotizacionPDF')),
  CRM: lazy(() => import('./pages/CRM')),
  Finanzas: lazy(() => import('./pages/Finanzas')),
  Reportes: lazy(() => import('./pages/Reportes')),
  CustodioMovil: lazy(() => import('./pages/CustodioMovil')),
  Flujo: lazy(() => import('./pages/Flujo')),
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F6F7F9' }} />}>
        <Routes>
          {(Object.keys(ROUTES) as PageName[]).map(k => {
            const P = pages[k]
            return <Route key={k} path={ROUTES[k]} element={<P />} />
          })}
          <Route path="*" element={(() => { const P = pages.Main; return <P /> })()} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
