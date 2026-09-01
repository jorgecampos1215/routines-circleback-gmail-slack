/* ============================================================
   M1 — Mapa interactivo 2D · NAJ PIXAM Casa del Alma
   Plano SVG generado por código sobre el master plan:
   acceso, oficinas/velatorios, capilla con velaria y espejo de
   agua, campo santo, criptas, muros de nichos y crematorio.
   ============================================================ */

const MAP_W = 1280, MAP_H = 900;
const ST_COLOR = { disponible: '#308a45', apartado: '#e0a33e', ocupado: '#b05e30', vendido: '#3d6db5' };
const ST_LABEL = { disponible: 'Disponible', apartado: 'Apartado', ocupado: 'Ocupado', vendido: 'Vendido · preventa' };

function arbolSelva(x, y, s) {
  return `<g opacity=".92">
    <ellipse cx="${x}" cy="${y}" rx="${12 * s}" ry="${9 * s}" fill="#7e9464"/>
    <ellipse cx="${x - 7 * s}" cy="${y + 4 * s}" rx="${8 * s}" ry="${6 * s}" fill="#6c8355"/>
    <ellipse cx="${x + 8 * s}" cy="${y + 3 * s}" rx="${7 * s}" ry="${6 * s}" fill="#93a877"/>
  </g>`;
}
function flamboyanSVG(x, y, s) {
  return `<g opacity=".95">
    <ellipse cx="${x}" cy="${y}" rx="${11 * s}" ry="${8 * s}" fill="#c45f3c"/>
    <ellipse cx="${x - 6 * s}" cy="${y + 3 * s}" rx="${7 * s}" ry="${5 * s}" fill="#b04f30"/>
  </g>`;
}

function decorMapa() {
  const arboles = [
    [545, 92, 1], [590, 168, .8], [560, 250, 1.1], [598, 336, .9], [545, 470, 1],
    [590, 552, .85], [560, 640, 1], [598, 780, .9], [545, 852, 1.05],
    [30, 92, .8], [30, 336, .9], [30, 580, .8], [30, 840, .9],
    [1244, 92, .9], [1248, 330, .8], [905, 95, .8], [940, 610, .9], [1248, 852, .9],
  ];
  const flamboyanes = [[500, 300, 1], [620, 560, .9], [1230, 560, 1], [70, 350, .8]];
  return `
    <rect x="0" y="0" width="${MAP_W}" height="${MAP_H}" fill="#e9e0c8"/>
    <!-- andadores de sascab -->
    <rect x="512" y="0" width="66" height="${MAP_H}" rx="8" fill="#dccfa9"/>
    <rect x="0" y="500" width="${MAP_W}" height="52" rx="8" fill="#dccfa9"/>
    <rect x="892" y="0" width="40" height="500" rx="8" fill="#e2d7b5"/>
    <line x1="545" y1="0" x2="545" y2="${MAP_H}" stroke="#cbbb90" stroke-width="2" stroke-dasharray="10 12"/>
    <!-- capilla con velaria y espejo de agua -->
    <g>
      <ellipse cx="742" cy="470" rx="86" ry="24" fill="#b9cfd3"/>
      <ellipse cx="742" cy="470" rx="64" ry="15" fill="#cbdee1"/>
      <rect x="668" y="330" width="148" height="104" rx="6" fill="#efe6cf" stroke="#c6b791"/>
      <path d="M650 330 Q 742 268 834 330 L 816 344 Q 742 296 668 344 Z" fill="#d8c69b" opacity=".9"/>
      <rect x="736" y="352" width="12" height="34" fill="#a9682f"/>
      <rect x="728" y="362" width="28" height="8" fill="#a9682f"/>
      <text x="742" y="522" text-anchor="middle" class="map-deco-label">Capilla · espejo de agua</text>
    </g>
    <!-- oficinas / velatorios / crematorio -->
    <g>
      <rect x="640" y="560" width="120" height="56" rx="6" fill="#e7dcbd" stroke="#c6b791"/>
      <text x="700" y="594" text-anchor="middle" class="map-deco-label">Velatorios</text>
    </g>
    <g>
      <rect x="792" y="560" width="120" height="56" rx="6" fill="#e7dcbd" stroke="#c6b791"/>
      <text x="852" y="588" text-anchor="middle" class="map-deco-label">Crematorio y</text>
      <text x="852" y="602" text-anchor="middle" class="map-deco-label">fábrica de placas</text>
    </g>
    <!-- acceso -->
    <g>
      <rect x="486" y="856" width="118" height="30" rx="6" fill="#c6b791"/>
      <text x="545" y="876" text-anchor="middle" font-size="12" fill="#5f5544" font-weight="700">ACCESO PRINCIPAL</text>
    </g>
    ${arboles.map(a => arbolSelva(a[0], a[1], a[2])).join('')}
    ${flamboyanes.map(a => flamboyanSVG(a[0], a[1], a[2])).join('')}
  `;
}

/* filtros del mapa */
const mapFiltro = { linea: '', seccion: '', maxPrecio: 0, soloDisp: false, q: '' };

function espacioVisible(e) {
  if (mapFiltro.linea && e.linea !== mapFiltro.linea) return false;
  if (mapFiltro.seccion && e.seccion !== mapFiltro.seccion) return false;
  if (mapFiltro.maxPrecio && precioDe(e) > mapFiltro.maxPrecio) return false;
  if (mapFiltro.soloDisp && estadoDe(e) !== 'disponible') return false;
  return true;
}

function svgEspacios(seleccionado) {
  return SECCIONES.map(sec => {
    const spaces = ESPACIOS.filter(e => e.seccion === sec.id).map(e => {
      const est = estadoDe(e);
      const dim = !espacioVisible(e);
      const mem = memorialDeEspacio(e.id);
      const cls = ['sp', dim ? 'dim' : 'clickable', seleccionado === e.id ? 'selected' : ''].join(' ');
      /* los nichos se dibujan con esquinas rectas; tumbas redondeadas */
      const rx = e.linea === 'nicho' ? 1.5 : 4;
      return `<rect id="sp-${e.id}" class="${cls}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${rx}"
        fill="${ST_COLOR[est]}" data-id="${e.id}">
        <title>${e.id} · ${TIPOS[e.tipo].nombre} (${sec.atributo}) · ${ST_LABEL[est]}${mem ? ' · ' + mem.nombre : ''} · ${MXN(precioDe(e))}</title>
      </rect>`;
    }).join('');
    return `<g>
      <text x="${sec.x}" y="${sec.y - 12}" class="sec-label">${sec.id} · ${sec.nombre.toUpperCase()}</text>
      ${spaces}
    </g>`;
  }).join('');
}

function renderMapaSVG(seleccionado) {
  return `<svg id="mapa-svg" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet"
    role="img" aria-label="Plano interactivo del panteón NAJ PIXAM">
    ${decorMapa()}
    ${svgEspacios(seleccionado)}
  </svg>`;
}

/* ---------- pan & zoom ---------- */
function initPanZoom(svg) {
  let vb = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

  svg.zoomBy = (f, cx, cy) => {
    const nw = Math.min(Math.max(vb.w / f, 220), MAP_W * 1.4);
    const nh = nw * (MAP_H / MAP_W);
    const px = cx !== undefined ? cx : vb.x + vb.w / 2;
    const py = cy !== undefined ? cy : vb.y + vb.h / 2;
    vb.x = px - (px - vb.x) * (nw / vb.w);
    vb.y = py - (py - vb.y) * (nh / vb.h);
    vb.w = nw; vb.h = nh;
    apply();
  };
  svg.centerOn = (x, y, w) => {
    vb.w = w; vb.h = w * (MAP_H / MAP_W);
    vb.x = x - vb.w / 2; vb.y = y - vb.h / 2;
    apply();
  };

  svg.addEventListener('wheel', ev => {
    ev.preventDefault();
    const pt = svgPoint(svg, ev);
    svg.zoomBy(ev.deltaY < 0 ? 1.18 : 1 / 1.18, pt.x, pt.y);
  }, { passive: false });

  let drag = null;
  svg.addEventListener('pointerdown', ev => {
    drag = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y, moved: false };
    svg.setPointerCapture(ev.pointerId);
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag) return;
    if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 5) {
      drag.moved = true;
      svg.classList.add('dragging');
    }
    if (!drag.moved) return;
    const scale = vb.w / svg.clientWidth;
    vb.x = drag.vx - (ev.clientX - drag.x) * scale;
    vb.y = drag.vy - (ev.clientY - drag.y) * scale;
    apply();
  });
  const end = ev => {
    if (drag && !drag.moved && ev.type === 'pointerup') {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const id = el && el.dataset ? el.dataset.id : null;
      if (id && svg.onSpaceClick) svg.onSpaceClick(id);
    }
    drag = null;
    svg.classList.remove('dragging');
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}

function svgPoint(svg, ev) {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/* plano de localización en miniatura para el contrato (M3) */
function planoLocalizacionSVG(esp) {
  const sec = seccionById(esp.seccion);
  const pad = 26;
  const x0 = sec.x - pad, y0 = sec.y - pad;
  const w = sec.cols * (sec.cw + 4) + pad * 2, h = sec.rows * (sec.ch + 4) + pad * 2;
  const rects = ESPACIOS.filter(e => e.seccion === sec.id).map(e =>
    `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="2"
      fill="${e.id === esp.id ? '#a9682f' : '#e0d6ba'}" stroke="#b8a97f" stroke-width="1"/>`).join('');
  return `<svg viewBox="${x0} ${y0} ${w} ${h}" width="100%" style="max-width:420px;background:#f4eddb;border:1px solid #d8cba4;border-radius:8px" role="img" aria-label="Plano de localización del espacio ${esp.id}">
    ${rects}
    <text x="${esp.x + esp.w / 2}" y="${esp.y - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="#a9682f">${esp.id}</text>
  </svg>`;
}
