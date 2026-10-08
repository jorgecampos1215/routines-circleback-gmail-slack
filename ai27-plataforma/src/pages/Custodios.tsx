import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { Field, Modal, Pager, btnPriStyle, btnStyle, inputStyle, usePagination, useToast } from '../components/ui'
import { ROUTES } from '../lib/routes'
import { sx } from '../lib/sx'
import { ESTATUS_CUSTODIO, ZONAS, conteoCustodios, custodios as SEED, servicios, type Custodio, type EstatusCustodio, type Zona } from '../data/seed'

const CSS = `
a{color:#B36B00}a:hover{color:#8A5300}
.card{background:#FFFFFF;border:1px solid #E4E8ED;border-radius:10px;padding:20px;box-sizing:border-box;min-width:0}
.lbl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5F6B7A;font-weight:500}
.mono{font-family:'IBM Plex Mono',monospace}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}
.p-ok{background:#E3F6EC;color:#17784A}.p-warn{background:#FFF1DB;color:#8A5300}.p-bad{background:#FDE8E8;color:#B42318}.p-info{background:#E3F2F8;color:#0B6A8A}.p-mute{background:#EBEEF2;color:#4A5868}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;font-size:12px;color:#5F6B7A;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;border-bottom:1px solid #E4E8ED;white-space:nowrap}
.tbl th.sort{cursor:pointer;user-select:none}
.tbl th.sort:hover{color:#121821}
.tbl td{padding:10px 12px;border-bottom:1px solid #EEF1F4;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #D5DBE3;background:#F3F5F8;color:#121821;font:500 14px 'IBM Plex Sans',sans-serif;cursor:pointer;text-decoration:none}
.btn-pri{background:#F2A93B;border-color:#F2A93B;color:#17110A}
.cus-row{cursor:pointer}
.cus-row:hover td{background:#FAFBFC}
`

const CLS: Record<string, string> = { 'Disponible': 'pill p-ok', 'Asignado': 'pill p-info', 'En servicio': 'pill p-info', 'Descanso': 'pill p-mute', 'Vacaciones': 'pill p-mute', 'Incapacidad': 'pill p-warn', 'Baja': 'pill p-bad' }
const docCls = (docs: string) => docs === 'Al día' ? 'pill p-ok' : (docs.indexOf('días') > 0 && parseInt(docs.replace(/\D/g, '')) <= 14 ? 'pill p-bad' : 'pill p-warn')
const DOC_CLS: Record<string, string> = { ok: 'pill p-ok', warn: 'pill p-warn', bad: 'pill p-bad' }
const shiftStyle = (c: string) => 'height:32px;border-radius:4px;background:' + (c === 's' ? '#3FA7C9' : c === 'd' ? '#CBD3DD' : '#4CC38A')
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtIngreso = (iso: string) => { const [y, m] = iso.split('-'); return `${MES[parseInt(m) - 1]} ${y}` }
const inicial = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0][0]}. ${p[1]}` : n }
const FILTROS: string[] = ['Todos', ...ESTATUS_CUSTODIO]
const DIAS = ['Lun 5', 'Mar 6', 'Mié 7', 'Jue 8', 'Vie 9', 'Sáb 10', 'Dom 11']

type SortKey = 'nombre' | 'zona' | 'estatus' | 'asignacion' | 'horasSemana' | 'calificacion' | 'docs'
const COLS: [SortKey, string][] = [['nombre', 'Custodio'], ['zona', 'Zona'], ['estatus', 'Estatus'], ['asignacion', 'Asignación actual'], ['horasSemana', 'Horas sem.'], ['calificacion', 'Desempeño'], ['docs', 'Docs']]

/** Historial del custodio: SRV-24817 y compañía para el héroe del diseño; para el resto, servicios de seed donde participa. */
function historial(c: Custodio): string[] {
  if (c.id === 'C-1102') return ['SRV-24803 Marsh · en curso · 2 custodios', 'SRV-24760 Alpura · entregado sin incidente', 'SRV-24711 Orión · parada no autorizada (justificada)']
  const ini = inicial(c.nombre)
  const propios = servicios.filter(s => s.custodios.split(', ').includes(ini)).slice(0, 3)
  const out = propios.map(s => `${s.id} ${s.cliente} · ${s.estatus === 'En tránsito' || s.estatus === 'Confirmado' ? 'en curso' : s.estatus === 'Con incidente' ? 'con incidente reportado' : 'entregado sin incidente'}`)
  if (c.asignacion !== '—' && !out.some(x => x.startsWith(c.asignacion.split(' · ')[1] ?? ''))) out.unshift(`${c.asignacion.split(' · ')[1] ?? c.asignacion} ${c.asignacion.split(' · ')[0]} · ${c.estatus === 'Asignado' ? 'asignado · inicia mañana' : 'en curso'}`)
  if (!out.length) out.push(`${c.serviciosAcumulados} servicios acumulados · ${c.incidentes === 0 ? 'sin incidentes' : c.incidentes + ' incidente(s)'}`)
  return out.slice(0, 3)
}

export default function Custodios() {
  const toast = useToast()
  const nav = useNavigate()
  const [lista, setLista] = useState<Custodio[]>(SEED)
  const [f, setF] = useState('Todos')
  const [zona, setZona] = useState<'Todas' | Zona>('Todas')
  const [selId, setSelId] = useState('C-1102')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 } | null>(null)
  const [alta, setAlta] = useState(false)
  const [editar, setEditar] = useState(false)
  const [form, setForm] = useState({ nombre: '', zona: 'Centro' as Zona, base: '', telefono: '', estatus: 'Disponible' as EstatusCustodio, portacion: true })
  const [nuevoEstatus, setNuevoEstatus] = useState<EstatusCustodio>('Disponible')

  const counts = useMemo(() => conteoCustodios(lista), [lista])
  const nq = norm(q.trim())
  const rows = useMemo(() => {
    const r = lista
      .filter(c => f === 'Todos' || c.estatus === f)
      .filter(c => zona === 'Todas' || c.zona === zona)
      .filter(c => !nq || norm(c.nombre + ' ' + c.id + ' ' + c.zona + ' ' + c.base + ' ' + c.asignacion).includes(nq))
    if (!sort) return r
    return [...r].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * sort.dir })
  }, [lista, f, zona, nq, sort])
  const pg = usePagination(rows.length, 25)
  const pagina = rows.slice(pg.from, pg.to)
  const sel = lista.find(c => c.id === selId) ?? lista[0]
  const utilizacion = Math.round(lista.reduce((a, c) => a + c.horasSemana, 0) / (lista.length * 52) * 100)
  const horasProm = Math.round(lista.reduce((a, c) => a + c.horasSemana, 0) / lista.length)

  // Turnos: el seleccionado primero y luego los demás de la página visible (hasta 8)
  const turnos = [sel, ...pagina.filter(c => c.id !== sel.id)].slice(0, 8)
  const tituloTurnos = zona !== 'Todas' ? zona : f !== 'Todos' ? f : sel.zona

  const cambiarFiltro = (label: string) => { setF(label); pg.setPage(0) }
  const ordenar = (k: SortKey) => setSort(s => (s && s.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 }))

  const guardarAlta = () => {
    if (!form.nombre.trim()) { toast('Escribe el nombre del custodio', 'warn'); return }
    const usados = new Set(lista.map(c => c.id))
    let n = 1400; while (usados.has('C-' + n)) n++
    const id = 'C-' + n
    const nuevo: Custodio = {
      id, nombre: form.nombre.trim(), zona: form.zona, base: form.base.trim() || form.zona, estatus: form.estatus, asignacion: '—', horasSemana: 0, calificacion: 0, docs: 'Al día',
      documentos: [{ k: 'Licencia federal', v: 'vigente · 2028', estado: 'ok' }, { k: 'Portación / permiso', v: form.portacion ? 'vigente · 2027' : 'en trámite', estado: form.portacion ? 'ok' : 'warn' }, { k: 'Evaluación de confianza', v: 'programada', estado: 'warn' }, { k: 'Certificación carga alto valor', v: 'pendiente', estado: 'warn' }, { k: 'Alta en Samsara', v: 'activo', estado: 'ok' }],
      telefono: form.telefono.trim() || '—', ingreso: new Date().toISOString().slice(0, 10), serviciosAcumulados: 0, incidentes: 0, certificaciones: ['Primeros auxilios'], portacion: form.portacion, turnos: 'lllllll',
    }
    setLista(l => [nuevo, ...l])
    setSelId(id); setF('Todos'); setZona('Todas'); setQ(''); pg.setPage(0)
    setAlta(false)
    setForm({ nombre: '', zona: 'Centro', base: '', telefono: '', estatus: 'Disponible', portacion: true })
    toast(`Custodio ${nuevo.nombre} dado de alta como ${id}`)
  }
  const guardarEstatus = () => {
    setLista(l => l.map(c => (c.id === sel.id ? { ...c, estatus: nuevoEstatus, asignacion: nuevoEstatus === 'En servicio' || nuevoEstatus === 'Asignado' ? c.asignacion : '—' } : c)))
    setEditar(false)
    toast(`${sel.nombre} ahora está “${nuevoEstatus}”`)
  }
  const exportar = () => {
    const head = ['ID', 'Nombre', 'Zona', 'Base', 'Estatus', 'Asignación', 'Horas semana', 'Desempeño', 'Documentos', 'Teléfono', 'Ingreso']
    const csv = [head, ...rows.map(c => [c.id, c.nombre, c.zona, c.base, c.estatus, c.asignacion, c.horasSemana, c.calificacion, c.docs, c.telefono, c.ingreso])].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `custodios-${f.toLowerCase().replace(' ', '-')}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast(`Exportados ${rows.length} custodios a CSV`)
  }

  return (
    <Shell active="custodios" css={CSS}>
      <header style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}>
          <span className="lbl">Recursos</span>
          <h1 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:32px;font-weight:600")}>Custodios</h1>
          <span style={sx('color:#5F6B7A;font-size:14px')}>{lista.length} custodios en {ZONAS.length} zonas · utilización {utilizacion}% · {horasProm} h promedio por semana</span>
        </div>
        <div style={sx('display:flex;gap:12px;flex-wrap:wrap')}>
          <label style={sx('display:flex')}><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Buscar custodio</span><input type="search" placeholder="Buscar por nombre, ID o zona" value={q} onChange={e => { setQ(e.target.value); pg.setPage(0) }} style={sx("min-height:40px;min-width:260px;background:#F3F5F8;border:1px solid #D5DBE3;border-radius:8px;color:#121821;padding:0 12px;font:400 14px 'IBM Plex Sans',sans-serif")} /></label>
          <button type="button" className="btn btn-pri" onClick={() => setAlta(true)}>Alta de custodio</button>
        </div>
      </header>

      <section aria-label="Sugerencia de IA" style={sx('display:flex;flex-wrap:wrap;gap:16px;align-items:center;background:#FFF8EC;border:1px solid #F3D9A8;border-radius:10px;padding:16px 18px')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B36B00" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={sx('flex:none')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <div style={sx('flex:1 1 360px;display:flex;flex-direction:column;gap:4px;min-width:0')}><span style={sx('font-weight:600')}>IA · fatiga y cobertura</span><span style={sx('font-size:14px;color:#3E4A59')}>J. Ordaz lleva 52 h esta semana y 3 custodios de Bajío acumulan semanas sin descanso completo. <button type="button" onClick={() => { setSelId('C-0931'); setF('Todos'); setZona('Todas'); setQ('Rafael Uc'); pg.setPage(0) }} style={sx('background:none;border:0;padding:0;font:inherit;color:#B36B00;cursor:pointer;text-decoration:underline')}>Rafael Uc</button> lleva 9 días sin asignar: sugiero asignarlo al hueco de Bajío de mañana.</span></div>
        <figure style={sx('margin:0;display:flex;flex-direction:column;gap:4px')}>
          <svg width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="Utilización semanal de custodios en las últimas 6 semanas: 72, 74, 76, 79, 77 y 78 por ciento" style={sx('display:block')}><path d="M10 60H210" stroke="#E4E8ED"></path><path d="M10 12.8H210" stroke="#F3D9A8" strokeDasharray="4 3"></path><polyline points="10,46.4 50,36.8 90,27.2 130,12.8 170,22.4 210,17.6" fill="none" stroke="#2B7FA8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline><circle cx="210" cy="17.6" r="4" fill="#2B7FA8"></circle><text x="176" y="34" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#1E6488">78%</text></svg>
          <figcaption style={sx('font-size:11px;color:#5F6B7A')}>Utilización semanal · línea punteada: tope sano</figcaption>
        </figure>
        <Link className="btn" to={ROUTES.AsignacionIA}>Abrir asignación</Link>
      </section>

      <div role="group" aria-label="Filtrar por estatus" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr));gap:10px')}>
        {FILTROS.map(label => (
          <button key={label} type="button" aria-pressed={label === f} onClick={() => cambiarFiltro(label)} style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;border-radius:10px;cursor:pointer;font-family:inherit;color:#121821;text-align:left;background:#FFFFFF;border:1px solid ' + (label === f ? '#F2A93B' : '#E4E8ED'))}>
            <span style={sx('font-size:12px;color:#5F6B7A')}>{label}</span>
            <span style={sx("font-family:'Archivo',sans-serif;font-size:24px;font-weight:600")}>{counts[label]}</span>
          </button>
        ))}
      </div>

      <div style={sx('display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start')}>
        <section className="card" style={sx('flex:999 1 560px;padding:8px 8px 8px')}>
          <div style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:6px 4px 10px')}>
            <div style={sx('display:flex;gap:10px;flex-wrap:wrap;align-items:center')}>
              <label style={sx('display:flex;align-items:center;gap:8px;font-size:12px;color:#5F6B7A')}>Zona
                <select value={zona} onChange={e => { setZona(e.target.value as 'Todas' | Zona); pg.setPage(0) }} style={sx(inputStyle + ';width:auto;min-height:36px')}>
                  <option value="Todas">Todas</option>
                  {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
              <span style={sx('font-size:13px;color:#5F6B7A')}>{rows.length} custodio{rows.length === 1 ? '' : 's'}{f !== 'Todos' ? ` · ${f}` : ''}{sort ? ` · orden: ${COLS.find(c => c[0] === sort.k)?.[1]}` : ''}</span>
            </div>
            <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={exportar}>Exportar CSV</button>
          </div>
          <div style={sx('overflow-x:auto')}>
            <table className="tbl">
              <thead><tr>{COLS.map(([k, label]) => <th key={k} className="sort" aria-sort={sort?.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} onClick={() => ordenar(k)}>{label}{sort?.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</th>)}<th><span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Acción</span></th></tr></thead>
              <tbody>
                {pagina.map(r => (
                  <tr key={r.id} className="cus-row" aria-selected={r.id === sel.id} style={sx(r.id === sel.id ? 'background:#F3F5F8' : '')} onClick={() => setSelId(r.id)}>
                    <td><span style={sx('display:flex;flex-direction:column')}><span>{r.nombre}</span><span className="mono" style={sx('font-size:12px;color:#5F6B7A')}>{r.id}</span></span></td>
                    <td>{r.zona}</td><td><span className={CLS[r.estatus]}>{r.estatus}</span></td><td>{r.asignacion}</td><td className="mono">{r.horasSemana}</td><td className="mono">{r.calificacion ? r.calificacion.toFixed(1) : '—'}</td><td><span className={docCls(r.docs)}>{r.docs}</span></td>
                    <td><button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={e => { e.stopPropagation(); setSelId(r.id); document.getElementById('expediente')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }}>Expediente</button></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={sx('padding:24px 12px;color:#5F6B7A;text-align:center;white-space:normal')}>Sin custodios {f === 'Todos' ? '' : 'con estatus “' + f + '” '}{zona !== 'Todas' ? 'en ' + zona + ' ' : ''}{nq ? 'que coincidan con “' + q.trim() + '” ' : ''}en esta vista.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={sx('padding:0 4px')}><Pager {...pg} /></div>
        </section>

        <aside id="expediente" className="card" aria-label="Expediente" style={sx('flex:1 1 320px;display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;gap:14px;align-items:center')}>
            <div style={sx('width:64px;height:64px;border-radius:10px;background:#FFF1DB;border:1px dashed #D5DBE3;display:flex;align-items:center;justify-content:center;font-size:11px;color:#5F6B7A')}>Foto</div>
            <div style={sx('display:flex;flex-direction:column;gap:4px')}>
              <span style={sx('font-weight:600;font-size:18px')}>{sel.nombre}</span>
              <span className="mono" style={sx('font-size:13px;color:#5F6B7A')}>{sel.id} · {sel.zona}</span>
              <span className={CLS[sel.estatus]} style={sx('align-self:flex-start')}>{sel.estatus}</span>
            </div>
          </div>
          <dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:14px')}>
            <div><dt className="lbl">Base</dt><dd style={sx('margin:4px 0 0')}>{sel.base}</dd></div>
            <div><dt className="lbl">Cobertura</dt><dd style={sx('margin:4px 0 0')}>{sel.zona === 'Centro' ? 'Centro, Bajío' : sel.zona === 'Bajío' ? 'Bajío, Centro' : sel.zona}</dd></div>
            <div><dt className="lbl">Ingreso</dt><dd style={sx('margin:4px 0 0')}>{fmtIngreso(sel.ingreso)}</dd></div>
            <div><dt className="lbl">Desempeño</dt><dd style={sx('margin:4px 0 0')}>{sel.calificacion ? sel.calificacion.toFixed(1) + ' / 5' : 'sin evaluar'}</dd></div>
            <div><dt className="lbl">Teléfono</dt><dd className="mono" style={sx('margin:4px 0 0')}>{sel.telefono}</dd></div>
            <div><dt className="lbl">Servicios</dt><dd style={sx('margin:4px 0 0')}>{sel.serviciosAcumulados} · {sel.incidentes} incidente{sel.incidentes === 1 ? '' : 's'}</dd></div>
          </dl>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Documentos y vigencias</span>
            {sel.documentos.map(d => (
              <div key={d.k} style={sx('display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:6px 0;border-top:1px solid #EEF1F4')}><span>{d.k}</span><span className={DOC_CLS[d.estado]}>{d.v}</span></div>
            ))}
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:8px')}>
            <span className="lbl">Historial reciente</span>
            {historial(sel).map(h => <span key={h} style={sx('font-size:14px;color:#3E4A59')}>{h}</span>)}
          </div>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #EEF1F4;padding-top:12px')}>
            <button type="button" className="btn btn-pri" style={sx('min-height:36px;padding:0 12px')} onClick={() => { if (sel.estatus === 'Disponible') nav(ROUTES.AsignacionIA); else toast(`${sel.nombre} no está disponible (${sel.estatus})`, 'warn') }}>Asignar</button>
            <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { setNuevoEstatus(sel.estatus); setEditar(true) }}>Cambiar estatus</button>
            <a className="btn" style={sx('min-height:36px;padding:0 12px')} href={`tel:${sel.telefono.replace(/\s/g, '')}`} onClick={() => toast(`Llamando a ${sel.nombre} · ${sel.telefono}`, 'info')}>Llamar</a>
            <button type="button" className="btn" style={sx('min-height:36px;padding:0 12px')} onClick={() => { window.print(); toast(`Expediente de ${sel.nombre} enviado a impresión`, 'info') }}>Imprimir</button>
          </div>
        </aside>
      </div>

      <section className="card" style={sx('display:flex;flex-direction:column;gap:14px')}>
        <div style={sx('display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center')}>
          <h2 style={sx("margin:0;font-family:'Archivo',sans-serif;font-size:18px;font-weight:600")}>Turnos · {tituloTurnos} · semana 41</h2>
          <div style={sx('display:flex;gap:14px;font-size:12px;color:#3E4A59;flex-wrap:wrap')}>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#3FA7C9')}></span>En servicio</span>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#CBD3DD')}></span>Descanso</span>
            <span style={sx('display:flex;gap:6px;align-items:center')}><span style={sx('width:10px;height:10px;border-radius:2px;background:#4CC38A')}></span>Libre</span>
          </div>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('display:grid;grid-template-columns:160px repeat(7,minmax(70px,1fr));gap:4px;min-width:720px;font-size:13px')}>
            <span></span>{DIAS.map(d => <span key={d} className="lbl" style={sx('text-align:center')}>{d}</span>)}
            {turnos.map(c => [
              <button key={c.id} type="button" onClick={() => setSelId(c.id)} style={sx('display:flex;align-items:center;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left;' + (c.id === sel.id ? 'font-weight:600' : ''))}>{c.nombre}</button>,
              ...c.turnos.split('').map((d, j) => <span key={c.id + j} title={d === 's' ? 'En servicio' : d === 'd' ? 'Descanso' : 'Libre'} style={sx(shiftStyle(d))}></span>),
            ])}
          </div>
        </div>
      </section>

      <Modal open={alta} onClose={() => setAlta(false)} title="Alta de custodio" footer={<><button type="button" style={sx(btnStyle)} onClick={() => setAlta(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarAlta}>Dar de alta</button></>}>
        <Field label="Nombre completo"><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre y apellido" style={sx(inputStyle)} autoFocus /></Field>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
          <Field label="Zona"><select value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value as Zona })} style={sx(inputStyle)}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></Field>
          <Field label="Base"><input value={form.base} onChange={e => setForm({ ...form, base: e.target.value })} placeholder="p. ej. Cuautitlán" style={sx(inputStyle)} /></Field>
          <Field label="Teléfono"><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="55 0000 0000" style={sx(inputStyle)} /></Field>
          <Field label="Estatus inicial"><select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value as EstatusCustodio })} style={sx(inputStyle)}>{ESTATUS_CUSTODIO.map(z => <option key={z}>{z}</option>)}</select></Field>
        </div>
        <label style={sx('display:flex;align-items:center;gap:8px;font-size:14px')}><input type="checkbox" checked={form.portacion} onChange={e => setForm({ ...form, portacion: e.target.checked })} /> Cuenta con permiso de portación vigente</label>
        <span style={sx('font-size:12px;color:#5F6B7A')}>Se generará el expediente con licencia federal y alta en Samsara; la evaluación de confianza y la certificación de carga de alto valor quedan programadas.</span>
      </Modal>

      <Modal open={editar} onClose={() => setEditar(false)} title={`Cambiar estatus · ${sel.nombre}`} width={440} footer={<><button type="button" style={sx(btnStyle)} onClick={() => setEditar(false)}>Cancelar</button><button type="button" style={sx(btnPriStyle)} onClick={guardarEstatus}>Guardar</button></>}>
        <Field label="Nuevo estatus"><select value={nuevoEstatus} onChange={e => setNuevoEstatus(e.target.value as EstatusCustodio)} style={sx(inputStyle)}>{ESTATUS_CUSTODIO.map(z => <option key={z}>{z}</option>)}</select></Field>
        <span style={sx('font-size:12px;color:#5F6B7A')}>Estatus actual: {sel.estatus}. Los contadores de la pantalla se actualizan al guardar.</span>
      </Modal>
    </Shell>
  )
}
