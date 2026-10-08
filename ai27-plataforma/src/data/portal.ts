/**
 * Datos y utilerías de Mi portal (colaborador Luis Herrera, Monitorista Sr, E-0188).
 * Genera recibos de nómina descargables (PDF mínimo válido y XML tipo CFDI) sin librerías.
 */
import { descargar } from './rh'

export const YO = { id: 'E-0188', nombre: 'Luis Herrera', area: 'Monitoreo', puesto: 'Monitorista Sr', jefe: 'Jorge Pérez', sueldo: 16000, rfc: 'HELU910512AB3', nss: '12-34-56-7890-1' }

export type Recibo = { periodo: string; pago: string; fechaISO: string; percepciones: number; deducciones: number; neto: number; uuid: string }
const quincenas: [string, string, string][] = [
  ['Quincena 18 · septiembre', '30 sep', '2026-09-30'], ['Quincena 17 · septiembre', '15 sep', '2026-09-15'], ['Quincena 16 · agosto', '29 ago', '2026-08-29'],
  ['Quincena 15 · agosto', '15 ago', '2026-08-15'], ['Quincena 14 · julio', '31 jul', '2026-07-31'], ['Quincena 13 · julio', '15 jul', '2026-07-15'],
  ['Quincena 12 · junio', '30 jun', '2026-06-30'], ['Quincena 11 · junio', '15 jun', '2026-06-15'], ['Quincena 10 · mayo', '30 may', '2026-05-30'], ['Quincena 9 · mayo', '15 may', '2026-05-15'],
]
export const recibos: Recibo[] = quincenas.map(([periodo, pago, fechaISO], i) => {
  const percepciones = YO.sueldo / 2
  const deducciones = 1148.6
  return { periodo, pago, fechaISO, percepciones, deducciones, neto: percepciones - deducciones, uuid: `A1B2C3D4-${String(1000 + i * 37)}-4E5F-9A8B-${fechaISO.replace(/-/g, '')}` }
})

export const money = (n: number) => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** PDF de una página con texto Helvetica (estructura mínima válida). */
function pdfDe(lineas: string[]) {
  const esc = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\\()]/g, m => '\\' + m)
  let y = 760
  const contenido = ['BT', '/F1 11 Tf', ...lineas.map((l, i) => { const size = i === 0 ? 16 : 11; const s = `/F1 ${size} Tf 1 0 0 1 56 ${y} Tm (${esc(l)}) Tj`; y -= i === 0 ? 28 : 18; return s }), 'ET'].join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
  ]
  let out = '%PDF-1.4\n'
  const offs: number[] = []
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([out], { type: 'application/pdf' })
}

export function descargarReciboPDF(r: Recibo) {
  const lineas = [
    'AI27 · Recibo de nómina', `${r.periodo} · pagado el ${r.pago} 2026`, '', `Colaborador: ${YO.nombre} (${YO.id}) · ${YO.puesto} · ${YO.area}`, `RFC ${YO.rfc} · NSS ${YO.nss}`, '',
    'PERCEPCIONES', `Sueldo quincenal ............ ${money(r.percepciones)}`, '', 'DEDUCCIONES', `ISR ......................... ${money(r.deducciones * 0.78)}`, `IMSS ........................ ${money(r.deducciones * 0.22)}`, `Total deducciones ........... ${money(r.deducciones)}`, '',
    `NETO DEPOSITADO ............. ${money(r.neto)}`, '', `Folio fiscal (UUID): ${r.uuid}`, 'Este documento es una representación impresa de un CFDI de nómina 1.2.',
  ]
  descargar(`recibo-${r.fechaISO}-${YO.id}.pdf`, pdfDe(lineas))
}

export function descargarReciboXML(r: Recibo) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:nomina12="http://www.sat.gob.mx/nomina12" Version="4.0" Fecha="${r.fechaISO}T12:00:00" TipoDeComprobante="N" SubTotal="${r.percepciones.toFixed(2)}" Descuento="${r.deducciones.toFixed(2)}" Total="${r.neto.toFixed(2)}" Moneda="MXN">
  <cfdi:Emisor Rfc="AIS190201XY7" Nombre="AI27 SEGURIDAD EN LOGISTICA" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${YO.rfc}" Nombre="${YO.nombre.toUpperCase()}" UsoCFDI="CN01"/>
  <cfdi:Complemento>
    <nomina12:Nomina Version="1.2" TipoNomina="O" FechaPago="${r.fechaISO}" NumDiasPagados="15" TotalPercepciones="${r.percepciones.toFixed(2)}" TotalDeducciones="${r.deducciones.toFixed(2)}">
      <nomina12:Receptor NumEmpleado="${YO.id}" Puesto="${YO.puesto}" Departamento="${YO.area}" NumSeguridadSocial="${YO.nss.replace(/-/g, '')}"/>
      <nomina12:Percepciones><nomina12:Percepcion TipoPercepcion="001" Concepto="Sueldo" ImporteGravado="${r.percepciones.toFixed(2)}" ImporteExento="0.00"/></nomina12:Percepciones>
      <nomina12:Deducciones><nomina12:Deduccion TipoDeduccion="002" Concepto="ISR" Importe="${(r.deducciones * 0.78).toFixed(2)}"/><nomina12:Deduccion TipoDeduccion="001" Concepto="IMSS" Importe="${(r.deducciones * 0.22).toFixed(2)}"/></nomina12:Deducciones>
    </nomina12:Nomina>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${r.uuid}" FechaTimbrado="${r.fechaISO}T12:04:11"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`
  descargar(`recibo-${r.fechaISO}-${YO.id}.xml`, xml, 'application/xml;charset=utf-8')
}

/** Constancia laboral / de percepciones en PDF. */
export function descargarConstancia(tipo: string, motivo: string) {
  const lineas = [
    `AI27 · ${tipo}`, 'Cuautitlán Izcalli, Estado de México, a 8 de octubre de 2026', '', 'A QUIEN CORRESPONDA:', '',
    `Por medio de la presente se hace constar que ${YO.nombre}, con número de empleado ${YO.id},`, `labora en AI27 desde mayo de 2021 ocupando el puesto de ${YO.puesto} en el área de ${YO.area},`,
    `con un sueldo mensual bruto de ${money(YO.sueldo)} M.N.`, '', motivo ? `Se extiende la presente para: ${motivo}.` : 'Se extiende la presente para los fines que al interesado convengan.', '', '', 'Karla May · Gerente de Recursos Humanos', 'rh@ai27.mx · 55 5000 2700',
  ]
  descargar(`${tipo.toLowerCase().replace(/[^a-z]+/g, '-')}-${YO.id}.pdf`, pdfDe(lineas))
}
