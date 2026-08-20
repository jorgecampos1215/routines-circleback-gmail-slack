/* ============================================================
   Jardines del Recuerdo — SPA (demo funcional)
   Router por hash + vistas de los módulos M1–M8.
   ============================================================ */

const $app = () => document.getElementById('app');

/* ---------- helpers UI ---------- */
function toast(msg) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast ok'; t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}

function openModal(html) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal"><button class="x" data-close>✕</button>${html}</div>`;
  back.addEventListener('click', e => { if (e.target === back || e.target.dataset.close !== undefined && e.target.hasAttribute('data-close')) closeModal(); });
  document.body.appendChild(back);
  return back;
}
function closeModal() { document.querySelectorAll('.modal-back').forEach(m => m.remove()); }

function descargarArchivo(nombre, contenido, mime) {
  const blob = new Blob([contenido], { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* imagen de respaldo si el CDN no responde: degradado sereno que varía por imagen */
const FALLBACK_TONES = [
  ['#dde7d6', '#a8bfa0', '#7d997a'], ['#e9e2cf', '#cbb98a', '#a08d55'],
  ['#d8e2e4', '#a3bcc2', '#7c979e'], ['#e6ddd2', '#c2a98e', '#98805f'],
  ['#dfe0d2', '#b0b491', '#878c67'], ['#e3dbe0', '#b3a3ad', '#8b7a85'],
];
window.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && !t.dataset.fallback) {
    t.dataset.fallback = '1';
    const h = (t.src || '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const [c1, c2, c3] = FALLBACK_TONES[h % FALLBACK_TONES.length];
    t.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".62" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><ellipse cx="${180 + (h % 440)}" cy="430" rx="330" ry="150" fill="#ffffff" opacity=".10"/><ellipse cx="${560 - (h % 320)}" cy="500" rx="420" ry="170" fill="#1e3d2b" opacity=".12"/><path d="M400 300 C 400 235, 358 215, 348 168 C 392 190, 396 224, 400 250 C 404 220, 414 194, 452 168 C 442 218, 402 236, 400 300 Z" fill="#f3ead6" opacity=".85"/></svg>`
    );
  }
}, true);

/* ---------- sesión (C2) ---------- */
function login(rol, nombre, email) {
  DB.user = { rol, nombre, email };
  saveDB(); renderHeader(); router();
  toast(`Bienvenido, ${nombre.split(' ')[0]}`);
}
function logout() { DB.user = null; saveDB(); renderHeader(); location.hash = '#/'; }

function modalLogin(despues) {
  openModal(`
    <h2>Iniciar sesión</h2>
    <p class="sub">Demo: elige un rol para explorar la plataforma. En producción este acceso usa correo y contraseña con recuperación.</p>
    <div class="role-cards">
      <div class="radio-card" id="rc-titular"><b>Titular / comprador</b><span>Gestiona espacios, contratos, pagos y familiares invitados.</span></div>
      <div class="radio-card" id="rc-admin"><b>Administrador del panteón</b><span>Inventario, precios, contratos, cobranza y reportes.</span></div>
    </div>
    <div id="login-form" style="margin-top:18px;display:none">
      <div class="form-grid">
        <div class="field"><label>Nombre completo</label><input id="lg-nombre" value="María Fernanda Álvarez Rivas"></div>
        <div class="field"><label>Correo electrónico</label><input id="lg-email" type="email" value="mf.alvarez@example.com"></div>
      </div>
      <button class="btn btn-primary btn-block" id="lg-go" style="margin-top:16px">Entrar como titular</button>
    </div>
  `);
  document.getElementById('rc-titular').onclick = () => {
    document.getElementById('rc-titular').classList.add('on');
    document.getElementById('rc-admin').classList.remove('on');
    document.getElementById('login-form').style.display = 'block';
  };
  document.getElementById('rc-admin').onclick = () => {
    closeModal(); login('admin', 'Administración del Panteón', 'admin@jardinesdelrecuerdo.mx');
    location.hash = '#/admin';
  };
  document.getElementById('lg-go').onclick = () => {
    const n = document.getElementById('lg-nombre').value.trim() || 'Titular demo';
    const e = document.getElementById('lg-email').value.trim() || 'titular@example.com';
    closeModal(); login('titular', n, e);
    if (despues) location.hash = despues;
  };
}

/* ---------- header / footer ---------- */
const NAV = [
  ['#/', 'Inicio'], ['#/mapa', 'Mapa del panteón'], ['#/memoriales', 'Memoriales'],
  ['#/tienda', 'Florería'], ['#/cuenta', 'Mi cuenta'], ['#/admin', 'Administración'],
];

function renderHeader() {
  const route = location.hash || '#/';
  document.getElementById('site-header').innerHTML = `
    <div class="container header-in">
      <a class="brand" href="#/">
        <svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#1e3d2b"/><path d="M15 23 C 15 16, 10.5 14.5, 9.5 9.5 C 14 12, 14.5 15.5, 15 18 C 15.5 14.5, 16.5 11.5, 21 8.5 C 19.5 14.5, 15.2 16, 15 23 Z" fill="#e8d9ae"/></svg>
        Jardines del Recuerdo
      </a>
      <nav class="main-nav">
        ${NAV.map(([h, l]) => `<a href="${h}" class="${route === h || (h !== '#/' && route.startsWith(h)) ? 'active' : ''}">${l}</a>`).join('')}
      </nav>
      <div class="header-cta">
        ${DB.user
          ? `<span class="userchip">${DB.user.rol === 'admin' ? '🛡️' : '👤'} <b>${DB.user.nombre.split(' ')[0]}</b></span>
             <button class="btn btn-ghost btn-sm" onclick="logout()">Salir</button>`
          : `<button class="btn btn-outline btn-sm" onclick="modalLogin()">Iniciar sesión</button>`}
      </div>
    </div>`;
}

function footerHTML() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-in">
        <div>
          <div class="footer-brand">Jardines del Recuerdo</div>
          <p style="font-size:13.5px;max-width:34ch">Panteón y memorial digital. Un lugar sereno para honrar la memoria, con la tranquilidad de tenerlo todo en orden.</p>
        </div>
        <div><h4>Plataforma</h4>
          <a href="#/mapa">Mapa interactivo</a><a href="#/mapa">Comprar un espacio</a>
          <a href="#/memoriales">Memoriales</a><a href="#/tienda">Florería y productos</a>
        </div>
        <div><h4>Titulares</h4>
          <a href="#/cuenta">Mi cuenta</a><a href="#/cuenta">Mis contratos</a>
          <a href="#/cuenta">Pagos y mantenimiento</a><a href="#/cuenta">Familiares invitados</a>
        </div>
        <div><h4>Contacto</h4>
          <a href="#/">Carretera al Panteón km 3.5, Mérida, Yuc.</a>
          <a href="#/">Tel. (999) 123 4567 · Atención 24 h</a>
          <a href="#/">hola@jardinesdelrecuerdo.mx</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Jardines del Recuerdo · Demo funcional desarrollada por DaCodes</span>
        <span>Aviso de privacidad · Reglamento del panteón</span>
      </div>
    </div>
  </footer>`;
}

/* ============================================================
   VISTA: Inicio (C1)
   ============================================================ */
function viewHome() {
  const destacadas = [SECCIONES[0], SECCIONES[1], SECCIONES[2]];
  const disponibles = ESPACIOS.filter(e => estadoDe(e) === 'disponible').length;
  return `
  <section class="hero">
    <img class="bg" src="${IMG.hero}" alt="Jardines del panteón al amanecer">
    <div class="container">
      <div class="eyebrow">Panteón & Memorial Digital</div>
      <h1>Un lugar sereno para honrar toda una vida</h1>
      <p class="lead">Explora el panteón en un mapa interactivo, elige y adquiere un espacio en línea con contrato y firma digital, y mantén vivo el recuerdo en un memorial para toda la familia.</p>
      <div class="actions">
        <a class="btn btn-gold" href="#/mapa">Explorar el mapa</a>
        <a class="btn btn-outline" style="border-color:#fff;color:#fff" href="#/memoriales">Visitar un memorial</a>
      </div>
      <div class="hero-stats">
        <div><b>${disponibles}</b><span>espacios disponibles hoy</span></div>
        <div><b>6</b><span>jardines y secciones</span></div>
        <div><b>24 h</b><span>atención a familias</span></div>
        <div><b>100%</b><span>trámite en línea</span></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head center">
        <div class="eyebrow">Cómo funciona</div>
        <h2>Todo el proceso, sin filas ni papeleo</h2>
        <p>Desde la selección del espacio hasta la firma del contrato y el pago, en minutos y desde cualquier dispositivo.</p>
      </div>
      <div class="grid grid-4 steps">
        <div class="step"><h3>Explora el mapa</h3><p>Recorre el plano del panteón y compara terrenos, gavetas y criptas murales disponibles en tiempo real.</p></div>
        <div class="step"><h3>Elige tu espacio</h3><p>Consulta la ficha con ubicación exacta, precio y desglose de derechos y mantenimiento anual.</p></div>
        <div class="step"><h3>Firma en línea</h3><p>El contrato se genera con tus datos y se firma digitalmente con sello de tiempo. El PDF queda resguardado en tu cuenta.</p></div>
        <div class="step"><h3>Paga seguro</h3><p>Pago único con tarjeta vía Stripe y mantenimiento anual como suscripción, con recordatorios automáticos.</p></div>
      </div>
    </div>
  </section>

  <section class="section tinted">
    <div class="container">
      <div class="section-head">
        <div class="eyebrow">Nuestros jardines</div>
        <h2>Secciones pensadas para el descanso</h2>
      </div>
      <div class="grid grid-3">
        ${destacadas.map(s => {
          const disp = ESPACIOS.filter(e => e.seccion === s.id && estadoDe(e) === 'disponible').length;
          return `<a class="card" href="#/mapa?sec=${s.id}">
            <div class="card-img"><img src="${s.img}" alt="${s.nombre}" loading="lazy"></div>
            <div class="card-body">
              <span class="badge green">${disp} disponibles</span>
              <h3 style="margin-top:10px">${s.nombre}</h3>
              <p>${TIPOS[s.tipo].nombre}s desde ${MXN(s.base * .92)} · Sección ${s.id}</p>
            </div></a>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container split">
      <div>
        <div class="section-head" style="margin-bottom:18px">
          <div class="eyebrow">Memorial digital</div>
          <h2>El recuerdo también merece un lugar</h2>
          <p>Cada difunto cuenta con una página conmemorativa donde la familia comparte mensajes, fotografías y recibe flores de quienes lo quisieron.</p>
        </div>
        <ul class="checklist">
          <li>Muro de recuerdos con mensajes de familiares y amigos</li>
          <li>Envío y donación de flores directamente a la lápida</li>
          <li>Código QR en la lápida que enlaza al memorial</li>
          <li>Acceso familiar administrado por el titular</li>
        </ul>
        <div style="margin-top:26px"><a class="btn btn-primary" href="#/memoriales">Explorar memoriales</a></div>
      </div>
      <div class="img-stack">
        <img src="${IMG.atardecer}" alt="Atardecer en los jardines">
        <img class="over" src="${IMG.floresRosa}" alt="Flores en memoria">
      </div>
    </div>
  </section>

  <section class="section tinted">
    <div class="container">
      <div class="section-head">
        <div class="eyebrow">Florería del panteón</div>
        <h2>Flores frescas, entregadas con respeto</h2>
        <p>Nuestro equipo coloca cada arreglo directamente en el espacio del difunto y notifica a la familia con fotografía de entrega.</p>
      </div>
      <div class="shop-grid">
        ${PRODUCTOS.slice(0, 4).map(p => `
          <a class="card product" href="#/tienda">
            <div class="card-img"><img src="${p.img}" alt="${p.nombre}" loading="lazy"></div>
            <div class="card-body"><h3 style="font-size:18px">${p.nombre}</h3>
            <div class="rowline"><span class="price">${MXN(p.precio)}</span><span class="badge gold">${p.cat}</span></div></div>
          </a>`).join('')}
      </div>
      <div style="text-align:center;margin-top:34px"><a class="btn btn-outline" href="#/tienda">Ver toda la florería</a></div>
    </div>
  </section>

  <section class="section">
    <div class="container split">
      <div class="img-stack"><img src="${IMG.valle}" alt="Vista del valle"></div>
      <div>
        <div class="section-head" style="margin-bottom:14px">
          <div class="eyebrow">Apps móviles</div>
          <h2>Llévalo contigo, iOS y Android</h2>
          <p>Consulta tus espacios, recibe recordatorios de mantenimiento, envía flores y visita memoriales desde tu teléfono.</p>
        </div>
        <div class="store-badges">
          <a class="store-badge" href="#/" onclick="toast('Demo: la app iOS se publica junto con la plataforma')"><span style="font-size:26px"></span><span><small>Descárgala en el</small><b>App Store</b></span></a>
          <a class="store-badge" href="#/" onclick="toast('Demo: la app Android se publica junto con la plataforma')"><span style="font-size:24px">▶</span><span><small>Disponible en</small><b>Google Play</b></span></a>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="panel" style="background:var(--forest);color:#fff;text-align:center;border:none">
        <h2 style="color:#fff;font-size:34px">La previsión es un acto de amor</h2>
        <p style="color:#c9d6cb;max-width:60ch;margin:10px auto 24px">Adquirir un espacio en previsión evita a tu familia decisiones difíciles en los momentos más delicados. Nuestro equipo te acompaña en todo el proceso.</p>
        <a class="btn btn-gold" href="#/mapa">Ver espacios disponibles</a>
      </div>
    </div>
  </section>
  ${footerHTML()}`;
}

/* ============================================================
   VISTA: Mapa (M1)
   ============================================================ */
let mapaSel = null;

function viewMapa(params) {
  if (params.sec) mapFiltro.seccion = params.sec;
  if (params.sel) mapaSel = params.sel;
  setTimeout(initMapa, 0);
  return `
  <div class="map-layout">
    <div class="map-canvas-wrap" id="map-wrap">
      ${renderMapaSVG(mapaSel)}
      <div class="map-toolbar">
        <label class="tool">Tipo
          <select id="f-tipo">
            <option value="">Todos</option>
            ${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${mapFiltro.tipo === k ? 'selected' : ''}>${t.nombre}</option>`).join('')}
          </select></label>
        <label class="tool">Sección
          <select id="f-seccion">
            <option value="">Todas</option>
            ${SECCIONES.map(s => `<option value="${s.id}" ${mapFiltro.seccion === s.id ? 'selected' : ''}>${s.id} · ${s.nombre}</option>`).join('')}
          </select></label>
        <label class="tool">Precio máx.
          <select id="f-precio">
            <option value="0">Sin límite</option>
            <option value="30000" ${mapFiltro.maxPrecio === 30000 ? 'selected' : ''}>Hasta $30,000</option>
            <option value="60000" ${mapFiltro.maxPrecio === 60000 ? 'selected' : ''}>Hasta $60,000</option>
            <option value="90000" ${mapFiltro.maxPrecio === 90000 ? 'selected' : ''}>Hasta $90,000</option>
          </select></label>
        <label class="tool"><input type="checkbox" id="f-disp" ${mapFiltro.soloDisp ? 'checked' : ''} style="accent-color:var(--forest)"> Solo disponibles</label>
        <label class="tool">🔍 <input type="search" id="f-buscar" list="dl-difuntos" placeholder="Buscar difunto en el mapa…"></label>
        <datalist id="dl-difuntos">${todosMemoriales().map(m => `<option value="${m.nombre}">`).join('')}</datalist>
      </div>
      <div class="zoom-controls">
        <button id="z-in" title="Acercar">+</button>
        <button id="z-out" title="Alejar">−</button>
        <button id="z-fit" title="Vista completa" style="font-size:13px">⤢</button>
      </div>
      <div class="map-legend">
        <b style="font-size:12px;color:var(--ink-2)">Estado de los espacios</b>
        ${Object.entries(ST_LABEL).map(([k, l]) => `<div class="row"><span class="sw" style="background:${ST_COLOR[k]}"></span>${l}</div>`).join('')}
      </div>
    </div>
    <aside class="map-side" id="map-side">${fichaEspacioHTML(mapaSel)}</aside>
  </div>`;
}

function fichaEspacioHTML(id) {
  const e = id && espacioById(id);
  if (!e) {
    return `<div class="empty">
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#8a8478" stroke-width="1.4"><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
      <h3 style="font-size:22px;color:var(--forest);margin-bottom:8px">Selecciona un espacio</h3>
      <p style="font-size:14px">Haz clic en cualquier espacio del plano para ver su ficha: tipo, ubicación, precio y disponibilidad. Usa la rueda del ratón para acercar.</p>
    </div>`;
  }
  const sec = seccionById(e.seccion);
  const est = estadoDe(e);
  const tipo = TIPOS[e.tipo];
  const mem = memorialDeEspacio(e.id);
  const precio = precioDe(e);
  let accion = '';
  if (est === 'disponible') {
    accion = `<a class="btn btn-gold btn-block" href="#/comprar/${e.id}">Iniciar compra en línea</a>
      <p style="font-size:12px;color:var(--ink-3);text-align:center;margin-top:10px">Se aparta 15 minutos mientras completas el proceso.</p>`;
  } else if (est === 'apartado') {
    accion = `<button class="btn btn-outline btn-block" disabled>Apartado temporalmente</button>`;
  } else if (mem) {
    accion = `<a class="btn btn-primary btn-block" href="#/memorial/${mem.id}">Ver memorial de ${mem.nombre.split(' ')[0]} ${mem.nombre.split(' ')[1] || ''}</a>
      <a class="btn btn-ghost btn-block" style="margin-top:8px" href="#/tienda?destino=${mem.id}">Enviar flores 🌹</a>`;
  } else {
    accion = `<button class="btn btn-outline btn-block" disabled>${est === 'vendido' ? 'Espacio vendido' : 'Espacio ocupado'}</button>`;
  }
  return `<div class="space-card">
    <img class="ficha-img" src="${sec.img}" alt="${sec.nombre}">
    <div class="body">
      <span class="tag ${est}"><span class="dot" style="background:${ST_COLOR[est]}"></span>${ST_LABEL[est]}</span>
      <h2 style="margin-top:10px">${tipo.icon} ${tipo.nombre} ${e.id}</h2>
      <div class="loc">Sección ${sec.id} · ${sec.nombre} · Fila ${e.fila}, Posición ${e.col}</div>
      <p style="font-size:13.5px;color:var(--ink-2)">${tipo.desc}</p>
      ${mem ? `<p style="font-size:13.5px;margin-top:10px">🕊️ Aquí descansa <b>${mem.nombre}</b> (${new Date(mem.nac).getFullYear()}–${new Date(mem.def).getFullYear()}).</p>` : ''}
      ${est === 'disponible' || est === 'apartado' ? `
      <table class="price-table">
        <tr><td>Espacio (${tipo.nombre.toLowerCase()})</td><td>${MXN(precio)}</td></tr>
        <tr><td>Derechos de inhumación</td><td>${MXN(tipo.derechos)}</td></tr>
        <tr><td>Mantenimiento anual (suscripción)</td><td>${MXN(tipo.mant)}/año</td></tr>
        <tr class="total"><td>Pago inicial</td><td>${MXN(precio + tipo.derechos + tipo.mant)}</td></tr>
      </table>` : ''}
      <div style="margin-top:16px">${accion}</div>
    </div>
  </div>`;
}

function refreshSpaces() {
  ESPACIOS.forEach(e => {
    const r = document.getElementById('sp-' + e.id);
    if (!r) return;
    const est = estadoDe(e);
    r.setAttribute('fill', ST_COLOR[est]);
    r.setAttribute('class', ['sp', espacioVisible(e) ? 'clickable' : 'dim', mapaSel === e.id ? 'selected' : ''].join(' '));
  });
}

function initMapa() {
  const svg = document.getElementById('mapa-svg');
  if (!svg) return;
  initPanZoom(svg);
  svg.onSpaceClick = id => {
    mapaSel = id;
    document.getElementById('map-side').innerHTML = fichaEspacioHTML(id);
    refreshSpaces();
  };
  const bind = (id, fn) => { const n = document.getElementById(id); if (n) n.onchange = fn; };
  bind('f-tipo', ev => { mapFiltro.tipo = ev.target.value; refreshSpaces(); });
  bind('f-seccion', ev => { mapFiltro.seccion = ev.target.value; refreshSpaces(); });
  bind('f-precio', ev => { mapFiltro.maxPrecio = +ev.target.value; refreshSpaces(); });
  bind('f-disp', ev => { mapFiltro.soloDisp = ev.target.checked; refreshSpaces(); });
  bind('f-buscar', ev => {
    const m = todosMemoriales().find(x => x.nombre.toLowerCase() === ev.target.value.toLowerCase());
    if (!m) return;
    const e = espacioById(m.espacio);
    if (!e) return;
    mapaSel = e.id;
    document.getElementById('map-side').innerHTML = fichaEspacioHTML(e.id);
    refreshSpaces();
    svg.centerOn(e.x + e.w / 2, e.y + e.h / 2, 420);
    const r = document.getElementById('sp-' + e.id);
    if (r) { r.classList.add('pulse'); setTimeout(() => r.classList.remove('pulse'), 3600); }
  });
  document.getElementById('z-in').onclick = () => svg.zoomBy(1.3);
  document.getElementById('z-out').onclick = () => svg.zoomBy(1 / 1.3);
  document.getElementById('z-fit').onclick = () => svg.centerOn(MAP_W / 2, MAP_H / 2, MAP_W);
  if (mapaSel) {
    const e = espacioById(mapaSel);
    if (e) svg.centerOn(e.x + e.w / 2, e.y + e.h / 2, 500);
  }
}

/* ============================================================
   VISTA: Compra (M2 + M3 + M4)
   ============================================================ */
let wiz = null;
let timerInt = null;

function viewComprar(params, espId) {
  const e = espacioById(espId);
  if (!e) return `<div class="wizard"><div class="panel"><h2>Espacio no encontrado</h2><p class="sub">El espacio solicitado no existe.</p><a class="btn btn-primary" href="#/mapa">Volver al mapa</a></div></div>`;
  const est = estadoDe(e);
  const esMio = DB.reserva && DB.reserva.espacioId === espId;
  if (est !== 'disponible' && !esMio && !(wiz && wiz.espacioId === espId)) {
    return `<div class="wizard"><div class="panel"><h2>Este espacio ya no está disponible</h2><p class="sub">Alguien más lo apartó o adquirió. Elige otro espacio en el mapa.</p><a class="btn btn-primary" href="#/mapa">Volver al mapa</a></div></div>`;
  }
  if (!wiz || wiz.espacioId !== espId) {
    wiz = { espacioId: espId, step: 1, modo: 'inmediato', titular: {}, difunto: {}, firma: '', acepto: false };
  }
  setTimeout(bindWizard, 0);
  return `<div class="wizard">${wizardHTML(e)}</div>`;
}

function wizardHTML(e) {
  const pasos = ['Espacio', 'Datos', 'Contrato', 'Pago', 'Confirmación'];
  const tipo = TIPOS[e.tipo];
  const sec = seccionById(e.seccion);
  const precio = precioDe(e);
  const total = precio + tipo.derechos;
  const stepsBar = `<div class="wizard-steps">${pasos.map((p, i) =>
    `<span class="wstep ${wiz.step === i + 1 ? 'active' : ''} ${wiz.step > i + 1 ? 'done' : ''}"><span class="n">${wiz.step > i + 1 ? '✓' : i + 1}</span>${p}</span>`).join('')}</div>`;

  const timer = DB.reserva && DB.reserva.espacioId === e.id && wiz.step > 1 && wiz.step < 5
    ? `<div style="margin-bottom:18px"><span class="reserve-timer">⏱ Espacio apartado para ti · <span id="rtimer">15:00</span></span></div>` : '';

  let body = '';
  if (wiz.step === 1) {
    body = `<div class="panel">
      <h2>${tipo.icon} ${tipo.nombre} ${e.id}</h2>
      <p class="sub">Sección ${sec.id} · ${sec.nombre} · Fila ${e.fila}, Posición ${e.col}</p>
      <img src="${sec.img}" alt="${sec.nombre}" style="border-radius:12px;height:220px;width:100%;object-fit:cover;margin-bottom:18px">
      <table class="price-table">
        <tr><td>Espacio (${tipo.nombre.toLowerCase()})</td><td>${MXN(precio)}</td></tr>
        <tr><td>Derechos de inhumación</td><td>${MXN(tipo.derechos)}</td></tr>
        <tr><td>Mantenimiento anual — suscripción Stripe</td><td>${MXN(tipo.mant)}/año</td></tr>
        <tr class="total"><td>Pago único hoy + primer año de mantenimiento</td><td>${MXN(total + tipo.mant)}</td></tr>
      </table>
      <div class="wizard-nav">
        <a class="btn btn-ghost" href="#/mapa?sel=${e.id}">← Volver al mapa</a>
        <button class="btn btn-gold" id="w-next">Continuar · se apartará 15 min</button>
      </div>
    </div>`;
  }
  if (wiz.step === 2) {
    body = `<div class="panel">
      ${timer}
      <h2>Datos del titular y del difunto</h2>
      <p class="sub">El titular es quien firma el contrato, realiza los pagos y administra el espacio y los accesos familiares.</p>
      <h3 style="font-size:17px;margin-bottom:12px;color:var(--forest)">Titular / comprador</h3>
      <div class="form-grid">
        <div class="field"><label>Nombre completo *</label><input id="t-nombre" value="${wiz.titular.nombre || (DB.user && DB.user.rol === 'titular' ? DB.user.nombre : '')}"></div>
        <div class="field"><label>Correo electrónico *</label><input id="t-email" type="email" value="${wiz.titular.email || (DB.user && DB.user.rol === 'titular' ? DB.user.email : '')}"></div>
        <div class="field"><label>Teléfono *</label><input id="t-tel" value="${wiz.titular.tel || ''}" placeholder="(999) 000 0000"></div>
        <div class="field"><label>Domicilio</label><input id="t-dom" value="${wiz.titular.dom || ''}" placeholder="Calle, número, colonia, ciudad"></div>
      </div>
      <h3 style="font-size:17px;margin:24px 0 12px;color:var(--forest)">¿Para quién es el espacio?</h3>
      <div class="radio-cards">
        <div class="radio-card ${wiz.modo === 'inmediato' ? 'on' : ''}" data-modo="inmediato"><b>Registro del difunto ahora</b><span>La inhumación es próxima; se crea el memorial de inmediato.</span></div>
        <div class="radio-card ${wiz.modo === 'prevision' ? 'on' : ''}" data-modo="prevision"><b>Compra en previsión</b><span>Adquieres el espacio a futuro. El registro del difunto se hace cuando sea necesario.</span></div>
      </div>
      <div id="difunto-form" style="margin-top:18px;display:${wiz.modo === 'inmediato' ? 'block' : 'none'}">
        <div class="form-grid">
          <div class="field"><label>Nombre completo del difunto *</label><input id="d-nombre" value="${wiz.difunto.nombre || ''}"></div>
          <div class="field"><label>Fecha de nacimiento</label><input id="d-nac" type="date" value="${wiz.difunto.nac || ''}"></div>
          <div class="field"><label>Fecha de defunción</label><input id="d-def" type="date" value="${wiz.difunto.def || ''}"></div>
          <div class="field"><label>Epitafio o dedicatoria (opcional)</label><input id="d-epi" value="${wiz.difunto.epi || ''}" placeholder="Unas palabras para recordarle"></div>
        </div>
      </div>
      <div class="wizard-nav">
        <button class="btn btn-ghost" id="w-back">← Regresar</button>
        <button class="btn btn-gold" id="w-next">Continuar al contrato</button>
      </div>
    </div>`;
  }
  if (wiz.step === 3) {
    body = `<div class="panel">
      ${timer}
      <h2>Contrato de cesión de uso</h2>
      <p class="sub">Lee el contrato generado con tus datos. La firma es de aceptación en línea (clickwrap) con sello de tiempo; el PDF queda resguardado en tu cuenta.</p>
      <div class="contract-box">${contratoTexto(e, wiz, null)}</div>
      <label class="check-line"><input type="checkbox" id="c-acepto" ${wiz.acepto ? 'checked' : ''}>
        He leído y acepto los términos del contrato, el reglamento interno del panteón y el aviso de privacidad.</label>
      <div class="signature-row">
        <div class="field"><label>Firma: escribe tu nombre completo tal como aparece arriba *</label>
          <input id="c-firma" value="${wiz.firma || ''}" placeholder="${wiz.titular.nombre || ''}" style="font-family:var(--font-display);font-size:20px;font-style:italic"></div>
      </div>
      <div class="stamp">🕐 Sello de tiempo al firmar: <b id="stamp-now">${new Date().toLocaleString('es-MX')}</b> · IP registrada · Folio por asignar</div>
      <div class="wizard-nav">
        <button class="btn btn-ghost" id="w-back">← Regresar</button>
        <button class="btn btn-gold" id="w-next">Firmar y continuar al pago</button>
      </div>
    </div>`;
  }
  if (wiz.step === 4) {
    body = `<div class="panel">
      ${timer}
      <h2>Pago seguro</h2>
      <p class="sub">Procesado por Stripe. Hoy se cobra el pago único; el mantenimiento anual queda como suscripción con renovación automática y recordatorios.</p>
      <div class="paybox">
        <div class="brandrow"><b>Tarjeta de crédito o débito</b><span class="cardlogos"><span>VISA</span><span>MC</span><span>AMEX</span></span></div>
        <div class="form-grid">
          <div class="field full"><label>Número de tarjeta</label><input id="p-num" inputmode="numeric" placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242"></div>
          <div class="field"><label>Vencimiento</label><input id="p-exp" placeholder="MM/AA" value="12/28"></div>
          <div class="field"><label>CVC</label><input id="p-cvc" placeholder="123" value="123"></div>
        </div>
        <p style="font-size:11.5px;color:var(--ink-3);margin-top:10px">🔒 Demo: no se realiza ningún cargo real. En producción, Stripe procesa el pago y la suscripción anual.</p>
      </div>
      <table class="price-table">
        <tr><td>Pago único (espacio + derechos)</td><td>${MXN(total)}</td></tr>
        <tr><td>Mantenimiento año 1 — inicia suscripción anual</td><td>${MXN(tipo.mant)}</td></tr>
        <tr class="total"><td>Total a pagar hoy</td><td>${MXN(total + tipo.mant)}</td></tr>
      </table>
      <div class="wizard-nav">
        <button class="btn btn-ghost" id="w-back">← Regresar</button>
        <button class="btn btn-gold" id="w-pay">Pagar ${MXN(total + tipo.mant)}</button>
      </div>
    </div>`;
  }
  if (wiz.step === 5) {
    const c = wiz.compra;
    body = `<div class="panel">
      <div class="confirm-hero">
        <div class="bigcheck">✓</div>
        <h2>¡Compra completada!</h2>
        <p class="sub">Enviamos el comprobante y el contrato firmado a <b>${c.titular.email}</b>.</p>
      </div>
      <table class="price-table">
        <tr><td>Folio de compra</td><td><span class="folio">${c.folio}</span></td></tr>
        <tr><td>Contrato</td><td><span class="folio">${c.contrato.folio}</span> · firmado ${new Date(c.contrato.fecha).toLocaleString('es-MX')}</td></tr>
        <tr><td>Espacio</td><td>${tipo.nombre} ${e.id} · Sección ${sec.id}</td></tr>
        <tr><td>Pago único</td><td>${MXN(c.pagoUnico)}</td></tr>
        <tr><td>Suscripción de mantenimiento</td><td>${MXN(tipo.mant)}/año · próxima renovación ${fmtFecha(c.mantenimiento.proximaRenovacion)}</td></tr>
      </table>
      <div class="wizard-nav" style="justify-content:center;gap:12px">
        <button class="btn btn-outline" onclick="verContrato('${c.folio}')">Ver contrato</button>
        <a class="btn btn-primary" href="#/cuenta">Ir a mi cuenta</a>
        ${c.memorialId ? `<a class="btn btn-gold" href="#/memorial/${c.memorialId}">Ver memorial</a>` : `<a class="btn btn-ghost" href="#/mapa?sel=${e.id}">Ver en el mapa</a>`}
      </div>
    </div>`;
  }
  return stepsBar + body;
}

function contratoTexto(e, w, compra) {
  const tipo = TIPOS[e.tipo];
  const sec = seccionById(e.seccion);
  const precio = precioDe(e);
  const titular = (w && w.titular.nombre) || (compra && compra.titular.nombre) || '____________________';
  const difunto = (w && w.modo === 'inmediato' && w.difunto.nombre) || (compra && compra.difunto && compra.difunto.nombre) || null;
  return `
    <h3>Contrato de cesión de derechos de uso a perpetuidad</h3>
    <p><b>Panteón Jardines del Recuerdo</b>, en lo sucesivo "EL PANTEÓN", y <b>${titular}</b>, en lo sucesivo "EL TITULAR", celebran el presente contrato respecto del espacio <b>${tipo.nombre} ${e.id}</b>, ubicado en la Sección ${sec.id} (${sec.nombre}), Fila ${e.fila}, Posición ${e.col}.</p>
    <h3>Primera — Objeto</h3>
    <p>EL PANTEÓN cede a EL TITULAR el derecho de uso del espacio descrito para fines de inhumación${difunto ? `, destinado en primer término a <b>${difunto}</b>` : ' (compra en previsión)'}, conforme al reglamento interno vigente.</p>
    <h3>Segunda — Contraprestación</h3>
    <p>EL TITULAR paga en este acto ${MXN(precio)} por el espacio y ${MXN(tipo.derechos)} por derechos de inhumación. El mantenimiento anual de ${MXN(tipo.mant)} se cobra como suscripción recurrente; su impago coloca la cuenta en estatus vencido conforme a las reglas de morosidad del reglamento.</p>
    <h3>Tercera — Firma electrónica</h3>
    <p>Las partes acuerdan que la aceptación en línea (clickwrap) con sello de tiempo constituye la manifestación del consentimiento de EL TITULAR. El documento PDF resultante queda resguardado y disponible en la cuenta del titular y en el panel administrativo.</p>
    <h3>Cuarta — Accesos familiares</h3>
    <p>EL TITULAR podrá invitar familiares con acceso limitado (ver memorial y enviar o donar flores y productos), pudiendo revocar dichos accesos en cualquier momento.</p>
    <h3>Quinta — Reglamento</h3>
    <p>EL TITULAR declara conocer y aceptar el reglamento interno del panteón, que forma parte integrante del presente contrato.</p>
    ${compra ? `<p style="margin-top:16px"><i>Firmado electrónicamente por <b>${compra.contrato.firma}</b> el ${new Date(compra.contrato.fecha).toLocaleString('es-MX')} · Folio ${compra.contrato.folio}</i></p>` : ''}
  `;
}

function bindWizard() {
  const e = espacioById(wiz.espacioId);
  if (!e) return;
  const next = document.getElementById('w-next');
  const back = document.getElementById('w-back');
  const pay = document.getElementById('w-pay');

  // temporizador de reserva
  if (timerInt) clearInterval(timerInt);
  const tEl = document.getElementById('rtimer');
  if (tEl && DB.reserva) {
    timerInt = setInterval(() => {
      const ms = DB.reserva ? DB.reserva.expira - Date.now() : 0;
      if (ms <= 0) {
        clearInterval(timerInt);
        liberarReserva(); wiz = null;
        toast('La reserva expiró; el espacio volvió a estar disponible.');
        location.hash = '#/mapa';
        return;
      }
      const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
      tEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }, 500);
  }

  document.querySelectorAll('.radio-card[data-modo]').forEach(rc => {
    rc.onclick = () => {
      wiz.modo = rc.dataset.modo;
      document.querySelectorAll('.radio-card[data-modo]').forEach(x => x.classList.toggle('on', x === rc));
      document.getElementById('difunto-form').style.display = wiz.modo === 'inmediato' ? 'block' : 'none';
    };
  });

  if (back) back.onclick = () => { guardarPaso(); wiz.step--; rerender(); };
  if (next) next.onclick = () => {
    if (wiz.step === 1) {
      iniciarReserva(e.id);
      wiz.step = 2; rerender(); return;
    }
    if (wiz.step === 2) {
      guardarPaso();
      if (!wiz.titular.nombre || !wiz.titular.email || !wiz.titular.tel) { toast('Completa nombre, correo y teléfono del titular.'); return; }
      if (wiz.modo === 'inmediato' && !wiz.difunto.nombre) { toast('Indica el nombre del difunto o elige compra en previsión.'); return; }
      wiz.step = 3; rerender(); return;
    }
    if (wiz.step === 3) {
      guardarPaso();
      if (!wiz.acepto) { toast('Debes aceptar los términos del contrato.'); return; }
      if ((wiz.firma || '').trim().toLowerCase() !== wiz.titular.nombre.trim().toLowerCase()) {
        toast('La firma debe coincidir exactamente con el nombre del titular.'); return;
      }
      wiz.step = 4; rerender(); return;
    }
  };
  if (pay) pay.onclick = () => {
    guardarPaso();
    pay.disabled = true; pay.textContent = 'Procesando pago…';
    setTimeout(() => { completarCompra(e); rerender(); }, 1500);
  };

  function guardarPaso() {
    const v = id => { const n = document.getElementById(id); return n ? n.value.trim() : undefined; };
    if (document.getElementById('t-nombre')) {
      wiz.titular = { nombre: v('t-nombre'), email: v('t-email'), tel: v('t-tel'), dom: v('t-dom') };
      wiz.difunto = { nombre: v('d-nombre'), nac: v('d-nac'), def: v('d-def'), epi: v('d-epi') };
    }
    const ac = document.getElementById('c-acepto');
    if (ac) { wiz.acepto = ac.checked; wiz.firma = v('c-firma'); }
  }
  function rerender() {
    document.querySelector('.wizard').innerHTML = wizardHTML(e);
    bindWizard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function completarCompra(e) {
  const tipo = TIPOS[e.tipo];
  const n = DB.compras.length + 1;
  const hoy = new Date();
  const unAno = new Date(hoy); unAno.setFullYear(unAno.getFullYear() + 1);
  const conDifunto = wiz.modo === 'inmediato' && wiz.difunto.nombre;
  let memorialId = null;
  if (conDifunto) {
    memorialId = 'mem-u' + (DB.memorialesNuevos.length + 1);
    DB.memorialesNuevos.push({
      id: memorialId, nombre: wiz.difunto.nombre, nac: wiz.difunto.nac || '', def: wiz.difunto.def || hoy.toISOString().slice(0, 10),
      foto: null, cover: IMG.hojas, publico: true, espacio: e.id,
      epitafio: wiz.difunto.epi || 'Siempre en nuestro corazón.',
      mensajes: [], flores: [],
    });
  }
  const compra = {
    folio: 'CP-2026-' + String(1000 + n),
    espacioId: e.id,
    titular: wiz.titular,
    difunto: conDifunto ? wiz.difunto : null,
    memorialId,
    pagoUnico: precioDe(e) + tipo.derechos,
    contrato: { folio: 'CT-2026-' + String(800 + n), firma: wiz.firma, fecha: hoy.toISOString(), estado: 'vigente' },
    pagos: [
      { concepto: `Pago único ${TIPOS[e.tipo].nombre} ${e.id} (espacio + derechos)`, monto: precioDe(e) + tipo.derechos, fecha: hoy.toISOString(), metodo: 'Tarjeta •••• 4242' },
      { concepto: `Mantenimiento anual ${e.id} — año 1 (suscripción)`, monto: tipo.mant, fecha: hoy.toISOString(), metodo: 'Tarjeta •••• 4242' },
    ],
    mantenimiento: { estado: 'al corriente', proximaRenovacion: unAno.toISOString() },
  };
  DB.compras.push(compra);
  DB.overrides[e.id] = conDifunto ? 'ocupado' : 'vendido';
  DB.reserva = null;
  if (!DB.user || DB.user.rol !== 'admin') DB.user = { rol: 'titular', nombre: wiz.titular.nombre, email: wiz.titular.email };
  saveDB();
  renderHeader();
  wiz.compra = compra;
  wiz.step = 5;
  if (timerInt) clearInterval(timerInt);
  toast('Pago aprobado y contrato firmado ✓');
}

function verContrato(folioCompra) {
  const c = DB.compras.find(x => x.folio === folioCompra);
  if (!c) return;
  const e = espacioById(c.espacioId);
  openModal(`
    <h2>Contrato ${c.contrato.folio}</h2>
    <p class="sub">Resguardado digitalmente · <span class="tag vigente">vigente</span></p>
    <div class="contract-box" style="height:380px">${contratoTexto(e, null, c)}</div>
    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="descargarContrato('${c.folio}')">Descargar PDF del contrato</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>
    </div>
  `);
}

function descargarContrato(folioCompra) {
  const c = DB.compras.find(x => x.folio === folioCompra);
  if (!c) return;
  const e = espacioById(c.espacioId);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Contrato ${c.contrato.folio}</title>
  <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#26221c;line-height:1.6;padding:0 20px}h3{color:#1e3d2b}</style>
  </head><body><h1>Jardines del Recuerdo</h1>${contratoTexto(e, null, c)}</body></html>`;
  descargarArchivo(`Contrato_${c.contrato.folio}.html`, html, 'text/html;charset=utf-8');
  toast('Contrato descargado (en producción se genera PDF sellado).');
}

/* ============================================================
   VISTA: Memoriales (M6)
   ============================================================ */
function viewMemoriales() {
  const lista = todosMemoriales().filter(m => m.publico);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">Memorial digital</div>
    <h1>Memoriales</h1>
    <p>Espacios conmemorativos públicos. Deja un mensaje o envía flores a quienes descansan en nuestros jardines.</p>
  </div></div>
  <section class="section"><div class="container">
    <div style="max-width:420px;margin-bottom:34px" class="field">
      <input id="mem-q" placeholder="Buscar por nombre…" oninput="filtrarMemoriales(this.value)">
    </div>
    <div class="grid grid-3" id="mem-grid">
      ${lista.map(m => memCardHTML(m)).join('')}
    </div>
  </div></section>
  ${footerHTML()}`;
}

function memCardHTML(m) {
  return `<a class="card mem-card" href="#/memorial/${m.id}" data-nombre="${m.nombre.toLowerCase()}">
    ${m.foto ? `<img class="p" src="${m.foto}" alt="${m.nombre}">`
             : `<div class="p" style="width:104px;height:104px;border-radius:50%;background:var(--sage);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-family:var(--font-display);font-size:34px;color:var(--gold)">${m.nombre.split(' ').filter(w => w[0] === w[0].toUpperCase()).slice(0, 2).map(w => w[0]).join('')}</div>`}
    <h3>${m.nombre}</h3>
    <div class="dates">${m.nac ? new Date(m.nac).getFullYear() : '·'} — ${new Date(m.def).getFullYear()}</div>
    <p style="font-style:italic;font-family:var(--font-display);font-size:15.5px">"${m.epitafio}"</p>
  </a>`;
}

function filtrarMemoriales(q) {
  document.querySelectorAll('#mem-grid .mem-card').forEach(c => {
    c.style.display = c.dataset.nombre.includes(q.toLowerCase()) ? '' : 'none';
  });
}

function qrSVG(seed) {
  const rnd = mulberry32(seed.split('').reduce((a, c) => a + c.charCodeAt(0) * 7, 0));
  const N = 21, S = 5;
  let cells = '';
  const finder = (x, y) => `<rect x="${x * S}" y="${y * S}" width="${7 * S}" height="${7 * S}" fill="#26221c"/><rect x="${(x + 1) * S}" y="${(y + 1) * S}" width="${5 * S}" height="${5 * S}" fill="#fff"/><rect x="${(x + 2) * S}" y="${(y + 2) * S}" width="${3 * S}" height="${3 * S}" fill="#26221c"/>`;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const enFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    if (!enFinder && rnd() > .52) cells += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="#26221c"/>`;
  }
  return `<svg width="${N * S + 16}" height="${N * S + 16}" viewBox="-8 -8 ${N * S + 16} ${N * S + 16}" role="img" aria-label="Código QR del memorial">
    <rect x="-8" y="-8" width="${N * S + 16}" height="${N * S + 16}" fill="#fff"/>${cells}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</svg>`;
}

function viewMemorial(params, id) {
  const m = memorialById(id);
  if (!m) return `<section class="section"><div class="container"><h2>Memorial no encontrado</h2><p><a href="#/memoriales">Volver a memoriales</a></p></div></section>`;
  const e = espacioById(m.espacio);
  const sec = e && seccionById(e.seccion);
  const msgs = mensajesDe(m);
  const flrs = floresDe(m);
  return `
  <div class="memorial-cover"><img src="${m.cover}" alt="Memorial de ${m.nombre}"></div>
  <div class="memorial-id container">
    ${m.foto ? `<img class="portrait" src="${m.foto}" alt="${m.nombre}">`
             : `<div class="portrait" style="display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:44px;color:var(--gold)">${m.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')}</div>`}
    <h1>${m.nombre}</h1>
    <div class="dates">${m.nac ? fmtFecha(m.nac) : ''} — ${fmtFecha(m.def)}</div>
    <p class="epitaph">"${m.epitafio}"</p>
  </div>
  <div class="memorial-body container">
    <div class="memorial-grid">
      <div class="muro">
        <h2 style="color:var(--forest);font-size:28px;margin-bottom:18px">Muro de recuerdos</h2>
        <div class="sidebox" style="margin-bottom:22px">
          <h3>Deja un mensaje</h3>
          <div class="field" style="margin-bottom:10px"><input id="msg-autor" placeholder="Tu nombre" value="${DB.user ? DB.user.nombre : ''}"></div>
          <textarea id="msg-texto" placeholder="Comparte un recuerdo o unas palabras de cariño…"></textarea>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="publicarMensaje('${m.id}')">Publicar mensaje</button>
          <p style="font-size:11.5px;color:var(--ink-3);margin-top:8px">Los mensajes de visitantes se validan antes de publicarse; los de familiares autorizados aparecen de inmediato.</p>
        </div>
        <div id="muro-msgs">
          ${msgs.map(x => `<div class="msg"><p>"${x.texto}"</p><div class="who">— ${x.autor} · ${fmtFecha(x.fecha)}</div></div>`).join('') || '<p style="color:var(--ink-3)">Aún no hay mensajes. Sé el primero en dejar un recuerdo.</p>'}
        </div>
      </div>
      <div>
        <div class="sidebox">
          <h3>Enviar flores y productos</h3>
          <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:14px">Nuestro equipo los coloca directamente en el espacio y notifica a la familia.</p>
          <a class="btn btn-gold btn-block" href="#/tienda?destino=${m.id}">Enviar flores 🌹</a>
        </div>
        <div class="sidebox">
          <h3>Flores recibidas</h3>
          <div class="flower-log">
            ${flrs.map(f => { const p = productoById(f.producto); return `<div class="fl"><img src="${p.img}" alt="${p.nombre}"><span><b>${p.nombre}</b><br>de ${f.de} · ${fmtFecha(f.fecha)}</span></div>`; }).join('') || '<p style="font-size:13px;color:var(--ink-3)">Aún no se han enviado flores.</p>'}
          </div>
        </div>
        <div class="sidebox">
          <h3>Ubicación en el panteón</h3>
          ${e ? `<p style="font-size:13.5px;color:var(--ink-2)">${TIPOS[e.tipo].nombre} <b>${e.id}</b> · Sección ${sec.id}, ${sec.nombre} · Fila ${e.fila}, Posición ${e.col}</p>
          <a class="btn btn-outline btn-sm btn-block" style="margin-top:12px" href="#/mapa?sel=${e.id}">Ver en el mapa</a>` : ''}
        </div>
        <div class="sidebox qr-wrap">
          <h3>QR para lápida</h3>
          ${qrSVG(m.id)}
          <p>Placa con QR físico que enlaza a este memorial (opcional, se solicita desde Mi cuenta).</p>
        </div>
      </div>
    </div>
  </div>
  ${footerHTML()}`;
}

function publicarMensaje(memId) {
  const autor = document.getElementById('msg-autor').value.trim();
  const texto = document.getElementById('msg-texto').value.trim();
  if (!autor || !texto) { toast('Escribe tu nombre y tu mensaje.'); return; }
  (DB.mensajesExtra[memId] = DB.mensajesExtra[memId] || []).push({ autor, texto, fecha: new Date().toISOString() });
  saveDB();
  router();
  toast('Tu mensaje fue publicado en el muro.');
}

/* ============================================================
   VISTA: Tienda (M7)
   ============================================================ */
let tiendaDestino = null;

function viewTienda(params) {
  if (params.destino) tiendaDestino = params.destino;
  const mems = todosMemoriales();
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">Florería del panteón</div>
    <h1>Flores y productos conmemorativos</h1>
    <p>Compra, envía o dona flores a un difunto. Cualquier visitante puede enviar; la familia recibe la notificación con foto de entrega.</p>
  </div></div>
  <section class="section"><div class="container">
    <div class="tool" style="display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:30px;gap:10px;align-items:center;box-shadow:var(--shadow)">
      🕊️ <b style="font-size:14px">Destinatario:</b>
      <select id="destino-sel" onchange="tiendaDestino=this.value||null" style="border:none;outline:none;font-size:14px;background:none">
        <option value="">Elegir al pagar…</option>
        ${mems.map(m => `<option value="${m.id}" ${tiendaDestino === m.id ? 'selected' : ''}>${m.nombre}</option>`).join('')}
      </select>
    </div>
    <div class="shop-grid">
      ${PRODUCTOS.map(p => `
        <div class="card product">
          <div class="card-img"><img src="${p.img}" alt="${p.nombre}" loading="lazy"></div>
          <div class="card-body">
            <span class="badge gold">${p.cat}</span>
            <h3 style="font-size:18px">${p.nombre}</h3>
            <p style="font-size:13px">${p.desc}</p>
            <div class="rowline"><span class="price">${MXN(p.precio)}</span>
            <button class="btn btn-primary btn-sm" onclick="agregarCarrito('${p.id}')">Agregar</button></div>
          </div>
        </div>`).join('')}
    </div>
  </div></section>
  ${carritoFabHTML()}
  ${footerHTML()}`;
}

function carritoFabHTML() {
  const n = DB.carrito.reduce((a, c) => a + c.qty, 0);
  return n ? `<button class="cart-fab" onclick="abrirCarrito()">🛒 Ver carrito <span class="count">${n}</span></button>` : '';
}

function agregarCarrito(pid) {
  const it = DB.carrito.find(c => c.productoId === pid);
  if (it) it.qty++; else DB.carrito.push({ productoId: pid, qty: 1 });
  saveDB();
  const fab = document.querySelector('.cart-fab');
  if (fab) fab.outerHTML = carritoFabHTML(); else document.body.insertAdjacentHTML('beforeend', carritoFabHTML());
  toast('Agregado al carrito.');
}

function abrirCarrito() {
  const mems = todosMemoriales();
  const total = DB.carrito.reduce((a, c) => a + productoById(c.productoId).precio * c.qty, 0);
  openModal(`
    <h2>Tu pedido</h2>
    <p class="sub">Las flores se entregan el mismo día en el espacio del difunto.</p>
    <div class="cart-list">
      ${DB.carrito.map(c => { const p = productoById(c.productoId); return `
        <div class="ci"><img src="${p.img}" alt="${p.nombre}"><div class="t"><b>${p.nombre}</b><span>${MXN(p.precio)} c/u</span></div>
        <div class="qty"><button onclick="qtyCarrito('${p.id}',-1)">−</button>${c.qty}<button onclick="qtyCarrito('${p.id}',1)">+</button></div></div>`; }).join('')}
    </div>
    <div class="form-grid" style="margin-top:18px">
      <div class="field full"><label>Dedicado a *</label>
        <select id="co-destino">${mems.map(m => `<option value="${m.id}" ${tiendaDestino === m.id ? 'selected' : ''}>${m.nombre}</option>`).join('')}</select></div>
      <div class="field"><label>De parte de *</label><input id="co-de" value="${DB.user ? DB.user.nombre : ''}" placeholder="Tu nombre o familia"></div>
      <div class="field"><label>Tarjeta (demo)</label><input value="4242 4242 4242 4242"></div>
    </div>
    <table class="price-table"><tr class="total"><td>Total</td><td>${MXN(total)}</td></tr></table>
    <button class="btn btn-gold btn-block" onclick="pagarCarrito()">Pagar y enviar ${MXN(total)}</button>
  `);
}

function qtyCarrito(pid, d) {
  const it = DB.carrito.find(c => c.productoId === pid);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) DB.carrito = DB.carrito.filter(c => c !== it);
  saveDB();
  if (DB.carrito.length) abrirCarrito(); else { closeModal(); router(); }
}

function pagarCarrito() {
  const destino = document.getElementById('co-destino').value;
  const de = document.getElementById('co-de').value.trim();
  if (!de) { toast('Indica de parte de quién va el envío.'); return; }
  const hoy = new Date().toISOString();
  DB.carrito.forEach(c => {
    for (let i = 0; i < c.qty; i++) {
      DB.pedidos.push({ folio: 'PD-' + (1100 + DB.pedidos.length), producto: c.productoId, destino, de, fecha: hoy, estado: 'en preparación' });
      (DB.floresExtra[destino] = DB.floresExtra[destino] || []).push({ producto: c.productoId, de, fecha: hoy });
    }
  });
  DB.carrito = [];
  saveDB();
  closeModal();
  const m = memorialById(destino);
  toast(`Pedido confirmado. La familia de ${m ? m.nombre.split(' ')[0] : ''} será notificada 🌹`);
  location.hash = '#/memorial/' + destino;
}

/* ============================================================
   VISTA: Mi cuenta (M5 + M3 + M4)
   ============================================================ */
let cuentaTab = 'espacios';

function viewCuenta() {
  if (!DB.user || DB.user.rol !== 'titular') {
    return `<section class="section"><div class="container" style="max-width:560px">
      <div class="panel" style="text-align:center">
        <h2>Mi cuenta</h2>
        <p class="sub">Inicia sesión como titular para ver tus espacios, contratos, pagos y familiares invitados.</p>
        <button class="btn btn-primary" onclick="modalLogin('#/cuenta')">Iniciar sesión</button>
      </div></div></section>${footerHTML()}`;
  }
  setTimeout(() => bindTabs('cuenta'), 0);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">Portal del titular</div>
    <h1>Hola, ${DB.user.nombre.split(' ')[0]}</h1>
    <p>Administra tus espacios, contratos, pagos de mantenimiento y los accesos de tu familia.</p>
  </div></div>
  <div class="container dash-layout">
    <nav class="dash-nav" id="tabs-cuenta">
      <button data-tab="espacios" class="${cuentaTab === 'espacios' ? 'active' : ''}">🌿 Mis espacios</button>
      <button data-tab="contratos" class="${cuentaTab === 'contratos' ? 'active' : ''}">📜 Contratos</button>
      <button data-tab="pagos" class="${cuentaTab === 'pagos' ? 'active' : ''}">💳 Pagos y recibos</button>
      <button data-tab="familia" class="${cuentaTab === 'familia' ? 'active' : ''}">👪 Familiares invitados</button>
    </nav>
    <div id="tab-body">${cuentaTabHTML()}</div>
  </div>
  ${footerHTML()}`;
}

function cuentaTabHTML() {
  if (cuentaTab === 'espacios') {
    if (!DB.compras.length) {
      return `<div class="panel" style="text-align:center">
        <h2>Aún no tienes espacios</h2>
        <p class="sub">Explora el mapa y adquiere un terreno, gaveta o cripta 100% en línea.</p>
        <a class="btn btn-gold" href="#/mapa">Explorar el mapa</a></div>`;
    }
    return DB.compras.map(c => {
      const e = espacioById(c.espacioId); const sec = seccionById(e.seccion); const tipo = TIPOS[e.tipo];
      const vencida = new Date(c.mantenimiento.proximaRenovacion) < new Date();
      return `<div class="card mis-espacios" style="margin-bottom:18px"><div class="esp">
        <img src="${sec.img}" alt="${sec.nombre}">
        <div>
          <h3>${tipo.icon} ${tipo.nombre} ${e.id} · Sección ${sec.id}</h3>
          <div class="meta">${sec.nombre} · Fila ${e.fila}, Posición ${e.col} · Folio ${c.folio}</div>
          <div style="margin-top:8px">
            ${c.difunto ? `<span class="badge gold">🕊️ ${c.difunto.nombre}</span>` : '<span class="badge green">Compra en previsión</span>'}
            <span class="tag ${vencida ? 'vencido' : 'alcorriente'}" style="margin-left:6px">Mantenimiento ${vencida ? 'vencido' : 'al corriente'}</span>
          </div>
          <div class="meta" style="margin-top:6px">Próxima renovación: ${fmtFecha(c.mantenimiento.proximaRenovacion)} · ${MXN(TIPOS[e.tipo].mant)}/año</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <a class="btn btn-outline btn-sm" href="#/mapa?sel=${e.id}">Ver en mapa</a>
          ${c.memorialId ? `<a class="btn btn-primary btn-sm" href="#/memorial/${c.memorialId}">Memorial</a>` : ''}
          <button class="btn btn-gold btn-sm" onclick="renovarMantenimiento('${c.folio}')">Renovar mantenimiento</button>
        </div>
      </div></div>`;
    }).join('');
  }
  if (cuentaTab === 'contratos') {
    if (!DB.compras.length) return `<div class="panel"><p>No hay contratos aún. Los contratos firmados aparecen aquí con su PDF resguardado.</p></div>`;
    return `<div class="table-wrap"><table class="data">
      <tr><th>Folio</th><th>Espacio</th><th>Firmado</th><th>Estado</th><th></th></tr>
      ${DB.compras.map(c => `<tr>
        <td><span class="folio">${c.contrato.folio}</span></td>
        <td>${c.espacioId}</td>
        <td>${new Date(c.contrato.fecha).toLocaleString('es-MX')}</td>
        <td><span class="tag vigente">vigente</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="verContrato('${c.folio}')">Ver / descargar</button></td>
      </tr>`).join('')}
    </table></div>`;
  }
  if (cuentaTab === 'pagos') {
    const pagos = DB.compras.flatMap(c => c.pagos.map(p => ({ ...p, folio: c.folio })));
    if (!pagos.length) return `<div class="panel"><p>Sin pagos registrados todavía.</p></div>`;
    return `<div class="table-wrap"><table class="data">
      <tr><th>Fecha</th><th>Concepto</th><th>Método</th><th>Monto</th><th></th></tr>
      ${pagos.map((p, i) => `<tr>
        <td>${new Date(p.fecha).toLocaleDateString('es-MX')}</td><td>${p.concepto}</td><td>${p.metodo}</td>
        <td><b>${MXN(p.monto)}</b></td>
        <td><button class="btn btn-ghost btn-sm" onclick="descargarRecibo(${i})">Recibo ⬇</button></td>
      </tr>`).join('')}
    </table></div>`;
  }
  if (cuentaTab === 'familia') {
    return `<div class="panel">
      <h2 style="font-size:22px">Familiares invitados</h2>
      <p class="sub">Los familiares invitados pueden ver el memorial y enviar o donar flores y productos. No tienen acceso a contratos ni pagos, y puedes revocar su acceso en cualquier momento.</p>
      <div class="invite-row">
        <input id="inv-nombre" placeholder="Nombre del familiar">
        <input id="inv-email" type="email" placeholder="correo@ejemplo.com">
        <button class="btn btn-primary" onclick="invitarFamiliar()">Enviar invitación</button>
      </div>
      ${DB.invitados.length ? `<div class="table-wrap"><table class="data">
        <tr><th>Nombre</th><th>Correo</th><th>Invitado</th><th>Permisos</th><th></th></tr>
        ${DB.invitados.map((f, i) => `<tr>
          <td>${f.nombre}</td><td>${f.email}</td><td>${new Date(f.fecha).toLocaleDateString('es-MX')}</td>
          <td><span class="badge green">Memorial + flores</span></td>
          <td><button class="btn btn-danger btn-sm" onclick="revocarFamiliar(${i})">Revocar</button></td>
        </tr>`).join('')}
      </table></div>` : '<p style="color:var(--ink-3);font-size:14px">Aún no has invitado a nadie.</p>'}
    </div>`;
  }
  return '';
}

function bindTabs(cual) {
  const nav = document.getElementById('tabs-' + cual);
  if (!nav) return;
  nav.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (cual === 'cuenta') cuentaTab = b.dataset.tab; else adminTab = b.dataset.tab;
    nav.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    document.getElementById('tab-body').innerHTML = cual === 'cuenta' ? cuentaTabHTML() : adminTabHTML();
    if (cual === 'admin') setTimeout(bindAdminBody, 0);
  });
  if (cual === 'admin') bindAdminBody();
}

function renovarMantenimiento(folio) {
  const c = DB.compras.find(x => x.folio === folio);
  if (!c) return;
  const e = espacioById(c.espacioId);
  const prox = new Date(c.mantenimiento.proximaRenovacion);
  prox.setFullYear(prox.getFullYear() + 1);
  c.mantenimiento.proximaRenovacion = prox.toISOString();
  c.mantenimiento.estado = 'al corriente';
  c.pagos.push({ concepto: `Mantenimiento anual ${c.espacioId} — renovación`, monto: TIPOS[e.tipo].mant, fecha: new Date().toISOString(), metodo: 'Suscripción Stripe' });
  saveDB();
  document.getElementById('tab-body').innerHTML = cuentaTabHTML();
  toast('Mantenimiento renovado un año más ✓');
}

function descargarRecibo(i) {
  const pagos = DB.compras.flatMap(c => c.pagos.map(p => ({ ...p, folio: c.folio })));
  const p = pagos[i];
  if (!p) return;
  descargarArchivo(`Recibo_${p.folio}_${i + 1}.txt`,
`JARDINES DEL RECUERDO — RECIBO DE PAGO
--------------------------------------
Fecha:    ${new Date(p.fecha).toLocaleString('es-MX')}
Concepto: ${p.concepto}
Método:   ${p.metodo}
Monto:    ${MXN(p.monto)}
Folio de compra: ${p.folio}
--------------------------------------
Demo: en producción este recibo se emite como PDF con folio fiscal.`);
}

function invitarFamiliar() {
  const nombre = document.getElementById('inv-nombre').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  if (!nombre || !email) { toast('Escribe nombre y correo del familiar.'); return; }
  DB.invitados.push({ nombre, email, fecha: new Date().toISOString() });
  saveDB();
  document.getElementById('tab-body').innerHTML = cuentaTabHTML();
  toast(`Invitación enviada a ${email} ✉️`);
}
function revocarFamiliar(i) {
  DB.invitados.splice(i, 1);
  saveDB();
  document.getElementById('tab-body').innerHTML = cuentaTabHTML();
  toast('Acceso revocado.');
}

/* ============================================================
   VISTA: Administración (M8)
   ============================================================ */
let adminTab = 'dashboard';
const invFiltro = { seccion: '', estado: '' };

function viewAdmin() {
  if (!DB.user || DB.user.rol !== 'admin') {
    return `<section class="section"><div class="container" style="max-width:560px">
      <div class="panel" style="text-align:center">
        <h2>Panel administrativo</h2>
        <p class="sub">Acceso exclusivo del personal del panteón: inventario, precios, contratos, cobranza y reportes.</p>
        <button class="btn btn-primary" onclick="login('admin','Administración del Panteón','admin@jardinesdelrecuerdo.mx')">Entrar como administrador (demo)</button>
      </div></div></section>${footerHTML()}`;
  }
  setTimeout(() => bindTabs('admin'), 0);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">Panel administrativo</div>
    <h1>Operación del panteón</h1>
    <p>Inventario sobre plano, contratos, cobranza de mantenimiento, tienda y reportes.</p>
  </div></div>
  <div class="container dash-layout">
    <nav class="dash-nav" id="tabs-admin">
      <button data-tab="dashboard" class="${adminTab === 'dashboard' ? 'active' : ''}">📊 Dashboard</button>
      <button data-tab="inventario" class="${adminTab === 'inventario' ? 'active' : ''}">🗺️ Inventario y precios</button>
      <button data-tab="contratos" class="${adminTab === 'contratos' ? 'active' : ''}">📜 Contratos</button>
      <button data-tab="cobranza" class="${adminTab === 'cobranza' ? 'active' : ''}">💰 Cobranza</button>
      <button data-tab="tienda" class="${adminTab === 'tienda' ? 'active' : ''}">🌹 Tienda y pedidos</button>
      <button data-tab="reportes" class="${adminTab === 'reportes' ? 'active' : ''}">⬇ Reportes</button>
    </nav>
    <div id="tab-body">${adminTabHTML()}</div>
  </div>
  ${footerHTML()}`;
}

function conteoEstados() {
  const c = { disponible: 0, apartado: 0, ocupado: 0, vendido: 0 };
  ESPACIOS.forEach(e => c[estadoDe(e)]++);
  return c;
}

function adminTabHTML() {
  if (adminTab === 'dashboard') return adminDashboardHTML();
  if (adminTab === 'inventario') return adminInventarioHTML();
  if (adminTab === 'contratos') return adminContratosHTML();
  if (adminTab === 'cobranza') return adminCobranzaHTML();
  if (adminTab === 'tienda') return adminTiendaHTML();
  if (adminTab === 'reportes') return adminReportesHTML();
  return '';
}

/* --- Dashboard con gráficas accesibles --- */
function adminDashboardHTML() {
  const c = conteoEstados();
  const total = ESPACIOS.length;
  const ocupPct = Math.round(((c.ocupado + c.vendido) / total) * 100);
  const ventas12 = VENTAS_MES.reduce((a, v) => a + v.monto, 0) + DB.compras.reduce((a, x) => a + x.pagoUnico, 0);
  const vencidos = COBRANZA_SEED.filter(x => x.estado === 'vencido').length;
  const mantAnual = ESPACIOS.reduce((a, e) => a + (['ocupado', 'vendido'].includes(estadoDe(e)) ? TIPOS[e.tipo].mant : 0), 0);
  return `
  <div class="kpis">
    <div class="kpi"><div class="v">${ocupPct}%</div><div class="l">Ocupación total (${c.ocupado + c.vendido} de ${total} espacios)</div><span class="delta up">▲ 2.1 pts vs. trimestre anterior</span></div>
    <div class="kpi"><div class="v">${c.disponible}</div><div class="l">Espacios disponibles para venta</div></div>
    <div class="kpi"><div class="v">${MXN(ventas12).replace(' MXN', '')}</div><div class="l">Ventas últimos 12 meses (MXN)</div><span class="delta up">▲ 12% anual</span></div>
    <div class="kpi"><div class="v">${vencidos}</div><div class="l">Cuentas de mantenimiento vencidas</div><span class="delta down">Requieren seguimiento</span></div>
  </div>
  ${chartVentasHTML()}
  <div class="chart-card">
    <h3>Ocupación por estado</h3>
    <div class="sub">Distribución actual de los ${total} espacios del panteón</div>
    <div class="chart-flex">
      <div style="display:flex;justify-content:center">${donutEstadosSVG(c)}</div>
      <div class="legend-list">
        ${Object.entries(c).map(([k, v]) => `<div class="li"><span class="sw" style="background:${ST_COLOR[k]}"></span>${ST_LABEL[k]}<b>${v} · ${Math.round(v / total * 100)}%</b></div>`).join('')}
        <div class="li" style="border-top:1px solid var(--line);padding-top:8px;margin-top:4px">Ingreso anual por mantenimiento<b>${MXN(mantAnual)}</b></div>
      </div>
    </div>
  </div>`;
}

function chartVentasHTML() {
  const W = 720, H = 260, padL = 56, padB = 34, padT = 16;
  const max = 800000;
  const bw = (W - padL - 10) / VENTAS_MES.length;
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  const grid = [0, 200000, 400000, 600000, 800000].map(v =>
    `<line x1="${padL}" y1="${y(v)}" x2="${W - 6}" y2="${y(v)}" stroke="#eee9df" stroke-width="1"/>
     <text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10.5" fill="#8a8478">${v / 1000}k</text>`).join('');
  const maxIdx = VENTAS_MES.reduce((mi, v, i, a) => v.monto > a[mi].monto ? i : mi, 0);
  const bars = VENTAS_MES.map((v, i) => {
    const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
    const yy = y(v.monto), h = H - padB - yy;
    return `<path d="M${x} ${yy + 4} q0-4 4-4 h${w - 8} q4 0 4 4 V${H - padB} H${x} Z" fill="#2c5a3f"
        class="bar-mes" data-tip="${v.mes}: ${MXN(v.monto)}"/>
      ${i === maxIdx ? `<text x="${x + w / 2}" y="${yy - 7}" text-anchor="middle" font-size="11" font-weight="600" fill="#5c564b">${MXN(v.monto).replace(' MXN', '')}</text>` : ''}
      <text x="${x + w / 2}" y="${H - padB + 16}" text-anchor="middle" font-size="10" fill="#8a8478">${v.mes.split(' ')[0]}</text>`;
  }).join('');
  return `<div class="chart-card">
    <h3>Ventas de espacios por mes</h3>
    <div class="sub">Pago único (espacio + derechos), septiembre 2025 – agosto 2026 · pasa el cursor para ver el detalle</div>
    <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:560px" role="img" aria-label="Gráfica de barras de ventas mensuales">
      ${grid}${bars}
      <line x1="${padL}" y1="${H - padB}" x2="${W - 6}" y2="${H - padB}" stroke="#d8d2c4" stroke-width="1"/>
    </svg></div>
    <details style="margin-top:10px"><summary style="font-size:12.5px;color:var(--ink-3);cursor:pointer">Ver datos en tabla</summary>
      <div class="table-wrap" style="margin-top:10px"><table class="data"><tr><th>Mes</th><th>Ventas (MXN)</th></tr>
      ${VENTAS_MES.map(v => `<tr><td>${v.mes}</td><td>${MXN(v.monto)}</td></tr>`).join('')}</table></div>
    </details>
  </div>`;
}

function donutEstadosSVG(c) {
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const R = 74, CX = 110, CY = 110, SW = 30;
  let a0 = -Math.PI / 2, arcs = '';
  Object.entries(c).forEach(([k, v]) => {
    if (!v) return;
    const a1 = a0 + (v / total) * Math.PI * 2 - 0.028;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    arcs += `<path d="M${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)}"
      stroke="${ST_COLOR[k]}" stroke-width="${SW}" fill="none" stroke-linecap="butt" class="bar-mes" data-tip="${ST_LABEL[k]}: ${v} espacios (${Math.round(v / total * 100)}%)"/>`;
    a0 = a1 + 0.028;
  });
  return `<svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Distribución de espacios por estado">
    ${arcs}
    <text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="30" font-weight="700" fill="#1e3d2b" font-family="Georgia">${total}</text>
    <text x="${CX}" y="${CY + 18}" text-anchor="middle" font-size="11" fill="#8a8478">espacios</text>
  </svg>`;
}

/* --- Inventario --- */
function adminInventarioHTML() {
  const filas = ESPACIOS.filter(e =>
    (!invFiltro.seccion || e.seccion === invFiltro.seccion) &&
    (!invFiltro.estado || estadoDe(e) === invFiltro.estado)
  ).slice(0, 80);
  return `
  <div class="panel" style="padding:20px;margin-bottom:18px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
    <b style="font-size:14px">Filtros:</b>
    <select id="inv-sec" style="border:1px solid var(--line);border-radius:8px;padding:8px 12px">
      <option value="">Todas las secciones</option>
      ${SECCIONES.map(s => `<option value="${s.id}" ${invFiltro.seccion === s.id ? 'selected' : ''}>${s.id} · ${s.nombre}</option>`).join('')}
    </select>
    <select id="inv-est" style="border:1px solid var(--line);border-radius:8px;padding:8px 12px">
      <option value="">Todos los estados</option>
      ${Object.entries(ST_LABEL).map(([k, l]) => `<option value="${k}" ${invFiltro.estado === k ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
    <span style="font-size:12.5px;color:var(--ink-3)">Mostrando ${filas.length} de ${ESPACIOS.length} espacios · los cambios se reflejan al instante en el mapa público</span>
  </div>
  <div class="table-wrap"><table class="data">
    <tr><th>Espacio</th><th>Sección</th><th>Tipo</th><th>Precio (editable)</th><th>Estado</th><th>Difunto</th></tr>
    ${filas.map(e => {
      const est = estadoDe(e); const mem = memorialDeEspacio(e.id);
      return `<tr>
        <td><b>${e.id}</b></td>
        <td>${e.seccion} · Fila ${e.fila}</td>
        <td>${TIPOS[e.tipo].nombre}</td>
        <td><input type="number" value="${precioDe(e)}" data-precio="${e.id}" style="width:110px;border:1px solid var(--line);border-radius:8px;padding:6px 8px"></td>
        <td><select data-estado="${e.id}" style="border:1px solid var(--line);border-radius:8px;padding:6px 8px">
          ${Object.entries(ST_LABEL).map(([k, l]) => `<option value="${k}" ${est === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></td>
        <td>${mem ? mem.nombre : '<span style="color:var(--ink-3)">—</span>'}</td>
      </tr>`;
    }).join('')}
  </table></div>`;
}

/* --- Contratos --- */
function adminContratosHTML() {
  const propios = DB.compras.map(c => ({ folio: c.contrato.folio, titular: c.titular.nombre, espacio: c.espacioId, fecha: c.contrato.fecha.slice(0, 10), estado: 'vigente', compra: c.folio }));
  const todos = CONTRATOS_SEED.concat(propios);
  return `<div class="table-wrap"><table class="data">
    <tr><th>Folio</th><th>Titular</th><th>Espacio</th><th>Fecha de firma</th><th>Estado</th><th></th></tr>
    ${todos.map(c => `<tr>
      <td><span class="folio">${c.folio}</span></td><td>${c.titular}</td><td>${c.espacio}</td>
      <td>${fmtFecha(c.fecha)}</td><td><span class="tag ${c.estado}">${c.estado}</span></td>
      <td>${c.compra ? `<button class="btn btn-outline btn-sm" onclick="verContrato('${c.compra}')">Ver PDF</button>` : '<span style="font-size:12px;color:var(--ink-3)">Archivo físico digitalizado</span>'}</td>
    </tr>`).join('')}
  </table></div>`;
}

/* --- Cobranza --- */
function adminCobranzaHTML() {
  const propias = DB.compras.map(c => {
    const e = espacioById(c.espacioId);
    return { titular: c.titular.nombre, espacio: c.espacioId, vence: c.mantenimiento.proximaRenovacion.slice(0, 10), monto: TIPOS[e.tipo].mant, estado: new Date(c.mantenimiento.proximaRenovacion) < new Date() ? 'vencido' : 'al corriente', email: c.titular.email };
  });
  const todas = COBRANZA_SEED.concat(propias);
  const vencidas = todas.filter(x => x.estado === 'vencido');
  return `
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="v">${todas.length}</div><div class="l">Suscripciones de mantenimiento activas</div></div>
    <div class="kpi"><div class="v">${vencidas.length}</div><div class="l">Cuentas vencidas</div></div>
    <div class="kpi"><div class="v">${MXN(vencidas.reduce((a, x) => a + x.monto, 0)).replace(' MXN', '')}</div><div class="l">Cartera vencida (MXN)</div></div>
  </div>
  <div class="table-wrap"><table class="data">
    <tr><th>Titular</th><th>Espacio</th><th>Renovación</th><th>Cuota anual</th><th>Estatus</th><th></th></tr>
    ${todas.map(x => `<tr>
      <td>${x.titular}<br><span style="font-size:11.5px;color:var(--ink-3)">${x.email}</span></td>
      <td>${x.espacio}</td><td>${fmtFecha(x.vence)}</td><td>${MXN(x.monto)}</td>
      <td><span class="tag ${x.estado === 'vencido' ? 'vencido' : 'alcorriente'}">${x.estado}</span></td>
      <td>${x.estado === 'vencido' ? `<button class="btn btn-outline btn-sm" onclick="toast('Recordatorio de pago enviado a ${x.email} ✉️')">Enviar recordatorio</button>` : '<span style="font-size:12px;color:var(--ink-3)">Renovación automática</span>'}</td>
    </tr>`).join('')}
  </table></div>`;
}

/* --- Tienda admin --- */
function adminTiendaHTML() {
  const pedidos = PEDIDOS_SEED.concat(DB.pedidos);
  return `
  <div class="chart-card"><h3>Catálogo de productos</h3><div class="sub">${PRODUCTOS.length} productos activos en la florería</div>
  <div class="table-wrap"><table class="data">
    <tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Inventario</th></tr>
    ${PRODUCTOS.map(p => `<tr>
      <td><img src="${p.img}" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:cover"></td>
      <td><b>${p.nombre}</b></td><td>${p.cat}</td><td>${MXN(p.precio)}</td>
      <td><span class="badge green">En stock</span></td>
    </tr>`).join('')}
  </table></div></div>
  <div class="chart-card"><h3>Pedidos</h3><div class="sub">Entregas de flores y productos en los espacios</div>
  <div class="table-wrap"><table class="data">
    <tr><th>Folio</th><th>Producto</th><th>Dedicado a</th><th>De parte de</th><th>Fecha</th><th>Estado</th></tr>
    ${pedidos.map(p => { const prod = productoById(p.producto); const m = memorialById(p.destino); return `<tr>
      <td><span class="folio">${p.folio}</span></td><td>${prod.nombre}</td><td>${m ? m.nombre : p.destino}</td>
      <td>${p.de}</td><td>${fmtFecha(p.fecha)}</td>
      <td><span class="tag ${p.estado === 'entregado' ? 'alcorriente' : 'apartado'}">${p.estado}</span></td>
    </tr>`; }).join('')}
  </table></div></div>`;
}

/* --- Reportes --- */
function adminReportesHTML() {
  return `<div class="panel">
    <h2 style="font-size:22px">Exportar reportes</h2>
    <p class="sub">Descarga la información operativa en CSV para conciliación y análisis.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="exportCSV('inventario')">⬇ Inventario de espacios</button>
      <button class="btn btn-primary" onclick="exportCSV('cobranza')">⬇ Cobranza de mantenimiento</button>
      <button class="btn btn-primary" onclick="exportCSV('ventas')">⬇ Ventas por mes</button>
    </div>
  </div>`;
}

function exportCSV(cual) {
  let csv = '';
  if (cual === 'inventario') {
    csv = 'espacio,seccion,tipo,fila,posicion,estado,precio_mxn,difunto\n' + ESPACIOS.map(e => {
      const m = memorialDeEspacio(e.id);
      return [e.id, e.seccion, e.tipo, e.fila, e.col, estadoDe(e), precioDe(e), m ? `"${m.nombre}"` : ''].join(',');
    }).join('\n');
  }
  if (cual === 'cobranza') {
    csv = 'titular,espacio,vence,cuota_mxn,estatus\n' + COBRANZA_SEED.map(x => [`"${x.titular}"`, x.espacio, x.vence, x.monto, x.estado].join(',')).join('\n');
  }
  if (cual === 'ventas') {
    csv = 'mes,ventas_mxn\n' + VENTAS_MES.map(v => [v.mes, v.monto].join(',')).join('\n');
  }
  descargarArchivo(`reporte_${cual}_jardines.csv`, csv, 'text/csv;charset=utf-8');
  toast('Reporte descargado.');
}

function bindAdminBody() {
  document.querySelectorAll('[data-estado]').forEach(sel => sel.onchange = () => {
    DB.overrides[sel.dataset.estado] = sel.value;
    saveDB();
    toast(`Espacio ${sel.dataset.estado} → ${ST_LABEL[sel.value]}`);
  });
  document.querySelectorAll('[data-precio]').forEach(inp => inp.onchange = () => {
    DB.precioOverrides[inp.dataset.precio] = +inp.value || precioDe(espacioById(inp.dataset.precio));
    saveDB();
    toast(`Precio de ${inp.dataset.precio} actualizado`);
  });
  const s = document.getElementById('inv-sec'), e2 = document.getElementById('inv-est');
  if (s) s.onchange = () => { invFiltro.seccion = s.value; document.getElementById('tab-body').innerHTML = adminTabHTML(); bindAdminBody(); };
  if (e2) e2.onchange = () => { invFiltro.estado = e2.value; document.getElementById('tab-body').innerHTML = adminTabHTML(); bindAdminBody(); };
}

/* tooltip flotante para las gráficas */
document.addEventListener('mousemove', ev => {
  const t = ev.target.closest ? ev.target.closest('.bar-mes') : null;
  let tip = document.querySelector('.chart-tip');
  if (t && t.dataset.tip) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.appendChild(tip); }
    tip.textContent = t.dataset.tip;
    tip.style.left = (ev.clientX + 14) + 'px';
    tip.style.top = (ev.clientY - 14) + 'px';
    tip.style.opacity = 1;
  } else if (tip) tip.style.opacity = 0;
});

/* ============================================================
   Router
   ============================================================ */
const ROUTES = [
  [/^#\/$/, () => viewHome()],
  [/^#\/mapa/, p => viewMapa(p)],
  [/^#\/comprar\/([\w-]+)/, (p, id) => viewComprar(p, id)],
  [/^#\/memoriales/, () => viewMemoriales()],
  [/^#\/memorial\/([\w-]+)/, (p, id) => viewMemorial(p, id)],
  [/^#\/tienda/, p => viewTienda(p)],
  [/^#\/cuenta/, () => viewCuenta()],
  [/^#\/admin/, () => viewAdmin()],
];

function parseParams(hash) {
  const q = hash.split('?')[1];
  const out = {};
  if (q) q.split('&').forEach(kv => { const [k, v] = kv.split('='); out[k] = decodeURIComponent(v || ''); });
  return out;
}

function router() {
  checarReservaExpirada();
  const hash = location.hash || '#/';
  const base = hash.split('?')[0];
  const params = parseParams(hash);
  let html = null;
  for (const [re, fn] of ROUTES) {
    const m = base.match(re);
    if (m) { html = fn(params, m[1]); break; }
  }
  if (html === null) html = viewHome();
  $app().innerHTML = html;
  renderHeader();
  if (!hash.startsWith('#/tienda')) {
    const fab = document.querySelector('.cart-fab');
    if (fab) fab.remove();
  }
  if (timerInt && !hash.startsWith('#/comprar')) { clearInterval(timerInt); timerInt = null; }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => { renderHeader(); router(); });
