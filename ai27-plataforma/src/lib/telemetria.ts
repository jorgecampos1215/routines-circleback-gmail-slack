/**
 * Adaptador común de telemetría. Samsara (principal) y Ruptela (secundaria) se normalizan
 * a un solo modelo de eventos para que el cambio de proveedor no afecte la operación.
 * En el demo los eventos se simulan; para producción solo se implementa `fetchEventos` por proveedor.
 */
export type Fuente = 'samsara' | 'ruptela'
export type TipoEvento = 'ubicacion' | 'parada' | 'desvio' | 'geocerca' | 'panico' | 'gps_desconectado' | 'frenado_brusco' | 'separacion' | 'zona_riesgo'

export type EventoTelemetria = {
  fuente: Fuente
  tipo: TipoEvento
  unidad: string
  lat: number
  lng: number
  velocidad: number // km/h
  fecha: string // ISO
}

/** Forma cruda (simplificada) de un evento de Samsara. */
type SamsaraRaw = { vehicle: { id: string }; location: { latitude: number; longitude: number; speedMilesPerHour: number }; eventType: string; time: string }
/** Forma cruda (simplificada) de un registro de Ruptela. */
type RuptelaRaw = { imei: string; lat: number; lon: number; speed: number; ioEvent: number; ts: number }

const SAMSARA_TIPOS: Record<string, TipoEvento> = { GpsLocation: 'ubicacion', Stop: 'parada', RouteDeviation: 'desvio', GeofenceExit: 'geocerca', PanicButton: 'panico', GpsDisconnect: 'gps_desconectado', HarshBrake: 'frenado_brusco' }
const RUPTELA_TIPOS: Record<number, TipoEvento> = { 0: 'ubicacion', 1: 'parada', 2: 'geocerca', 3: 'panico', 4: 'gps_desconectado' }

export function normalizarSamsara(e: SamsaraRaw): EventoTelemetria {
  return { fuente: 'samsara', tipo: SAMSARA_TIPOS[e.eventType] ?? 'ubicacion', unidad: e.vehicle.id, lat: e.location.latitude, lng: e.location.longitude, velocidad: Math.round(e.location.speedMilesPerHour * 1.609), fecha: e.time }
}

export function normalizarRuptela(e: RuptelaRaw): EventoTelemetria {
  return { fuente: 'ruptela', tipo: RUPTELA_TIPOS[e.ioEvent] ?? 'ubicacion', unidad: e.imei, lat: e.lat, lng: e.lon, velocidad: e.speed, fecha: new Date(e.ts * 1000).toISOString() }
}

/** Simulador: genera eventos crudos de ambos proveedores y los pasa por el adaptador. */
export function simularEventos(n = 20, seed = 27): EventoTelemetria[] {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const out: EventoTelemetria[] = []
  const t0 = Date.parse('2026-10-07T14:00:00-06:00')
  for (let i = 0; i < n; i++) {
    const lat = 20.6 + rnd() * 1.6, lng = -100.4 - rnd() * 1.0
    const fecha = new Date(t0 + i * 90_000)
    if (rnd() < 0.7) {
      const tipos = Object.keys(SAMSARA_TIPOS)
      const eventType = rnd() < 0.8 ? 'GpsLocation' : tipos[Math.floor(rnd() * tipos.length)]
      out.push(normalizarSamsara({ vehicle: { id: 'TR-' + (4400 + Math.floor(rnd() * 80)) }, location: { latitude: lat, longitude: lng, speedMilesPerHour: 30 + rnd() * 40 }, eventType, time: fecha.toISOString() }))
    } else {
      out.push(normalizarRuptela({ imei: 'RP-' + (8600 + Math.floor(rnd() * 40)), lat, lon: lng, speed: Math.round(50 + rnd() * 50), ioEvent: rnd() < 0.85 ? 0 : 1 + Math.floor(rnd() * 4), ts: Math.floor(fecha.getTime() / 1000) }))
    }
  }
  return out
}
