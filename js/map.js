/* ============================================================
   M1 — Mapa interactivo 2D del panteón
   SVG generado por código: secciones, espacios, capilla, lago,
   caminos y arboledas. Pan + zoom con puntero y rueda.
   ============================================================ */

const MAP_W = 1280, MAP_H = 900;
const ST_COLOR = { disponible: '#308a45', apartado: '#e0a33e', ocupado: '#b05e30', vendido: '#3d6db5' };
const ST_LABEL = { disponible: 'Disponible', apartado: 'Apartado', ocupado: 'Ocupado', vendido: 'Vendido' };

function arbol(x, y, s) {
  return `<g opacity=".9">
    <ellipse cx="${x}" cy="${y}" rx="${11 * s}" ry="${9 * s}" fill="#9db98a"/>
    <ellipse cx="${x - 6 * s}" cy="${y + 4 * s}" rx="${8 * s}" ry="${7 * s}" fill="#8aa878"/>
    <ellipse cx="${x + 7 * s}" cy="${y + 3 * s}" rx="${7 * s}" ry="${6 * s}" fill="#a8c295"/>
  </g>`;
}

function decorMapa() {
  const arboles = [
    [545, 90, 1], [590, 150, .8], [560, 240, 1.1], [600, 330, .9], [545, 430, 1],
    [590, 520, .85], [560, 640, 1], [600, 760, .9], [545, 840, 1.05],
    [30, 90, .8], [30, 330, .9], [30, 560, .8], [30, 800, .9],
    [1240, 90, .9], [1245, 300, .8], [905, 95, .8], [920, 590, .9], [1245, 840, .9],
    [1100, 560, 1], [1180, 610, .8], [1060, 620, .9],
  ];
  return `
    <rect x="0" y="0" width="${MAP_W}" height="${MAP_H}" fill="#e4ebdc"/>
    <!-- caminos -->
    <rect x="510" y="0" width="70" height="${MAP_H}" rx="8" fill="#ddd6c6"/>
    <rect x="0" y="480" width="${MAP_W}" height="56" rx="8" fill="#ddd6c6"/>
    <rect x="880" y="0" width="44" height="480" rx="8" fill="#e2dccd"/>
    <line x1="545" y1="0" x2="545" y2="${MAP_H}" stroke="#cfc7b2" stroke-width="2" stroke-dasharray="10 12"/>
    <!-- lago -->
    <ellipse cx="1105" cy="400" rx="150" ry="82" fill="#b7cfd9"/>
    <ellipse cx="1105" cy="400" rx="118" ry="60" fill="#c7dde5"/>
    <text x="1105" y="405" text-anchor="middle" class="map-deco-label">Lago del Recuerdo</text>
    <!-- capilla -->
    <g>
      <rect x="668" y="330" width="150" height="110" rx="8" fill="#f0ebdf" stroke="#c9bfa6"/>
      <polygon points="668,330 743,290 818,330" fill="#d8cdb2"/>
      <rect x="736" y="255" width="14" height="42" fill="#d8cdb2"/>
      <rect x="740" y="236" width="6" height="26" fill="#8a6a24"/>
      <rect x="732" y="244" width="22" height="6" fill="#8a6a24"/>
      <rect x="731" y="392" width="24" height="48" rx="10" fill="#b08d3e" opacity=".7"/>
      <text x="743" y="465" text-anchor="middle" class="map-deco-label">Capilla San Rafael</text>
    </g>
    <!-- acceso -->
    <g>
      <rect x="492" y="856" width="106" height="30" rx="6" fill="#c9bfa6"/>
      <text x="545" y="876" text-anchor="middle" font-size="12" fill="#5c564b" font-weight="700">ACCESO PRINCIPAL</text>
    </g>
    ${arboles.map(a => arbol(a[0], a[1], a[2])).join('')}
  `;
}

/* filtros activos del mapa */
const mapFiltro = { tipo: '', seccion: '', maxPrecio: 0, soloDisp: false, q: '' };

function espacioVisible(e) {
  if (mapFiltro.tipo && e.tipo !== mapFiltro.tipo) return false;
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
      return `<rect id="sp-${e.id}" class="${cls}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="4"
        fill="${ST_COLOR[est]}" data-id="${e.id}">
        <title>${e.id} · ${TIPOS[e.tipo].nombre} · ${ST_LABEL[est]}${mem ? ' · ' + mem.nombre : ''} · ${MXN(precioDe(e))}</title>
      </rect>`;
    }).join('');
    const labelY = sec.y - 12;
    return `<g>
      <text x="${sec.x}" y="${labelY}" class="sec-label">SECCIÓN ${sec.id} · ${sec.nombre.toUpperCase()}</text>
      ${spaces}
    </g>`;
  }).join('');
}

function renderMapaSVG(seleccionado) {
  return `<svg id="mapa-svg" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet"
    role="img" aria-label="Plano interactivo del panteón">
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
      // clic sin arrastre: seleccionar el espacio bajo el puntero
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
