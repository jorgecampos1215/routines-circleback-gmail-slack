/* ============================================================
   NAJ PIXAM · Casa del Alma — SPA (demo funcional)
   Router por hash + vistas de los módulos M1–M10.
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
  back.addEventListener('click', e => { if (e.target === back || e.target.hasAttribute('data-close')) closeModal(); });
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

/* respaldo si alguna imagen no carga: degradado sereno en tonos caliza */
const FALLBACK_TONES = [
  ['#e9dfc6', '#cbb98a', '#a08d55'], ['#e5e0cd', '#b0b491', '#878c67'],
  ['#e6ddd2', '#c2a98e', '#98805f'], ['#dde7d6', '#a8bfa0', '#7d997a'],
];
window.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && !t.dataset.fallback) {
    t.dataset.fallback = '1';
    const h = (t.src || '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const [c1, c2, c3] = FALLBACK_TONES[h % FALLBACK_TONES.length];
    t.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".62" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><ellipse cx="${180 + (h % 440)}" cy="430" rx="330" ry="150" fill="#ffffff" opacity=".10"/><ellipse cx="${560 - (h % 320)}" cy="500" rx="420" ry="170" fill="#3f5233" opacity=".12"/><path d="M400 300 C 400 235, 358 215, 348 168 C 392 190, 396 224, 400 250 C 404 220, 414 194, 452 168 C 442 218, 402 236, 400 300 Z" fill="#f3e6d2" opacity=".85"/></svg>`
    );
  }
}, true);

const monograma = (nombre, size, font) =>
  `<div class="p" style="width:${size}px;height:${size}px;font-size:${font}px">${nombre.split(' ').slice(0, 2).map(w => w[0]).join('')}</div>`;

/* ---------- sesión y roles (C2 / M6) ---------- */
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
      <div class="radio-card" id="rc-titular"><b>👤 Titular / comprador</b><span>Compra y administra espacios, contratos, pagos y accesos familiares.</span></div>
      <div class="radio-card" id="rc-funeraria"><b>🤝 Funeraria aliada</b><span>Acceso B2B con ${cfg('descFuneraria')}% de descuento; compra a nombre de su cliente final.</span></div>
      <div class="radio-card" id="rc-admin"><b>🛡️ Administrador del panteón</b><span>Inventario, precios, financiamiento, contratos, cobranza y reportes.</span></div>
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
    document.querySelectorAll('.role-cards .radio-card').forEach(x => x.classList.remove('on'));
    document.getElementById('rc-titular').classList.add('on');
    document.getElementById('login-form').style.display = 'block';
  };
  document.getElementById('rc-funeraria').onclick = () => {
    closeModal(); login('funeraria', 'Funeraria La Paz de Kanasín', 'ventas@lapazkanasin.mx');
  };
  document.getElementById('rc-admin').onclick = () => {
    closeModal(); login('admin', 'Administración NAJ PIXAM', 'admin@najpixam.mx');
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

const LOGO_SVG = `<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="16" fill="#3f5233"/><path d="M17 27 C 17 19, 11.5 17, 10.5 10.5 C 16 13.5, 16.4 17.5, 17 20.5 C 17.6 17, 18.6 13.5, 23.5 9.5 C 22 17, 17.2 19, 17 27 Z" fill="#e9d3a8"/><circle cx="17" cy="7.4" r="1.6" fill="#c99a52"/></svg>`;

function renderHeader() {
  const route = location.hash || '#/';
  document.getElementById('site-header').innerHTML = `
    <div class="container header-in">
      <a class="brand" href="#/">${LOGO_SVG}<span class="bt"><b>NAJ PIXAM</b><span>Casa del Alma</span></span></a>
      <nav class="main-nav">
        ${NAV.map(([h, l]) => `<a href="${h}" class="${route === h || (h !== '#/' && route.startsWith(h)) ? 'active' : ''}">${l}</a>`).join('')}
      </nav>
      <div class="header-cta">
        ${DB.user
          ? `<span class="userchip">${DB.user.rol === 'admin' ? '🛡️' : DB.user.rol === 'funeraria' ? '🤝' : '👤'} <b>${DB.user.nombre.split(' ')[0]}</b>${DB.user.rol === 'funeraria' ? ` · aliado −${cfg('descFuneraria')}%` : ''}</span>
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
          <div class="footer-brand">NAJ PIXAM<small>Casa del Alma</small></div>
          <p style="font-size:13.5px;max-width:36ch;margin-top:10px">Panteón y memorial digital en Kanasín, Yucatán. Un lugar para el alma, con la tranquilidad de tenerlo todo en orden.</p>
        </div>
        <div><h4>Plataforma</h4>
          <a href="#/mapa">Mapa interactivo</a><a href="#/mapa">Tumbas y nichos</a>
          <a href="#/memoriales">Memoriales</a><a href="#/tienda">Florería y productos</a>
        </div>
        <div><h4>Titulares y aliados</h4>
          <a href="#/cuenta">Mi cuenta</a><a href="#/cuenta">Contratos y pagos</a>
          <a href="#/" onclick="modalLogin()">Portal de funerarias</a><a href="#/" onclick="toast('Demo: el esquema de gobierno se atiende con convenio directo')">Esquema gobierno</a>
        </div>
        <div><h4>Contacto</h4>
          <a href="#/">Kanasín, Yucatán · junto al anillo periférico</a>
          <a href="#/">Tel. (999) 123 4567 · Atención 24 h, 365 días</a>
          <a href="#/">hola@najpixam.mx</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 NAJ PIXAM · Casa del Alma · Demo funcional desarrollada por DaCodes</span>
        <span>Contrato de adhesión NOM-036-SCFI-2016 · Reglamento del panteón · Aviso de privacidad</span>
      </div>
    </div>
  </footer>`;
}

/* ============================================================
   VISTA: Inicio (C1 + M6)
   ============================================================ */
function viewHome() {
  const disponibles = ESPACIOS.filter(e => estadoDe(e) === 'disponible').length;
  const destacadas = [SECCIONES[0], SECCIONES[4], SECCIONES[2]];
  return `
  <section class="hero">
    <img class="bg" src="${IMG.acceso}" alt="Acceso principal de NAJ PIXAM Casa del Alma">
    <div class="container">
      <div class="eyebrow">Panteón & Memorial Digital · Kanasín, Yucatán</div>
      <h1>La casa del alma, bajo la luz del Mayab</h1>
      <p class="lead">Recorre el panteón en un plano interactivo, adquiere tumbas y nichos en línea —de contado o financiado— con contrato de adhesión y firma digital, y honra la memoria con un memorial y una placa diseñada por ti.</p>
      <div class="actions">
        <a class="btn btn-gold" href="#/mapa">Explorar el mapa</a>
        <a class="btn btn-outline" style="border-color:#fff;color:#fff" href="#/memoriales">Visitar un memorial</a>
      </div>
      <div class="hero-stats">
        <div><b>${disponibles}</b><span>espacios disponibles hoy</span></div>
        <div><b>2</b><span>líneas: tumbas y nichos</span></div>
        <div><b>24 h</b><span>atención a familias</span></div>
        <div><b>0%</b><span>interés en financiamiento</span></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head center">
        <div class="eyebrow">Cómo funciona</div>
        <h2>Todo el proceso, sin filas ni papeleo</h2>
        <p>A necesidad o en preventa: desde la selección del espacio hasta la firma del contrato de adhesión y el pago, en minutos.</p>
      </div>
      <div class="grid grid-4 steps">
        <div class="step"><h3>Explora el mapa</h3><p>Recorre el plano del panteón y compara tumbas y nichos disponibles en tiempo real, por sección y atributo.</p></div>
        <div class="step"><h3>Elige tu espacio</h3><p>Ficha con ubicación exacta y desglose completo: espacio, excavación, extras normativos y mantenimiento.</p></div>
        <div class="step"><h3>Firma en línea</h3><p>Contrato de adhesión registrado ante Profeco (NOM-036), con titular sustituto y beneficiarios, firmado digitalmente.</p></div>
        <div class="step"><h3>Paga a tu ritmo</h3><p>De contado o financiado con enganche y mensualidades sin intereses. El título de derechos se entrega al liquidar.</p></div>
      </div>
    </div>
  </section>

  <section class="section tinted">
    <div class="container">
      <div class="section-head">
        <div class="eyebrow">Líneas de servicio</div>
        <h2>Tumbas y nichos, cada uno a su manera</h2>
      </div>
      <div class="grid grid-2">
        <a class="card" href="#/mapa?linea=tumba">
          <div class="card-img" style="height:250px"><img src="${IMG.camposanto}" alt="Campo santo bajo la velaria" loading="lazy"></div>
          <div class="card-body">
            <span class="badge gold">⚱️ Tumba · inhumación de cuerpo</span>
            <h3 style="margin-top:10px">Lotes, criptas y campo santo</h3>
            <p>El precio depende de la ubicación (sección). La excavación se cobra aparte, conforme al Reglamento de Panteones de Kanasín. Desde ${MXN(SECCIONES[1].base * .94)}.</p>
          </div></a>
        <a class="card" href="#/mapa?linea=nicho">
          <div class="card-img" style="height:250px"><img src="${IMG.nichosTechados}" alt="Muros de nichos techados" loading="lazy"></div>
          <div class="card-body">
            <span class="badge gold">🕊️ Nicho · restos cremados</span>
            <h3 style="margin-top:10px">Nichos techados, jardín y familiares</h3>
            <p>El precio depende de si el nicho es techado o no techado. Ideales tras la cremación en el crematorio del propio panteón. Desde ${MXN(SECCIONES[5].base * .94)}.</p>
          </div></a>
      </div>
      <div style="display:flex;gap:12px;margin-top:26px;flex-wrap:wrap">
        <span class="badge green">Compra a necesidad · cuerpo presente</span>
        <span class="badge blue">Preventa / provisión · para ti o un beneficiario</span>
        <span class="badge gold">Financiamiento sin intereses · título al liquidar</span>
      </div>
    </div>
  </section>

  <section class="section">
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
              <h3 style="margin-top:10px;font-size:19px">${s.nombre}</h3>
              <p>${TIPOS[s.tipo].nombre} · desde ${MXN(s.base * .94)}</p>
            </div></a>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="section tinted">
    <div class="container split">
      <div>
        <div class="section-head" style="margin-bottom:18px">
          <div class="eyebrow">El proyecto</div>
          <h2>Arquitectura que abraza a la selva</h2>
          <p>Master plan de Ricardo Yslas Gámez Arquitectos: capilla con espejo de agua, velatorios, crematorio, campo santo, criptas, muros de nichos y fábrica de placas, entre andadores de sascab y flamboyanes.</p>
        </div>
        <ul class="checklist">
          <li>Diseño conforme al Reglamento de Panteones de Kanasín y la Ley de Salud de Yucatán</li>
          <li>Capilla San Rafael con velaria y espejo de agua</li>
          <li>Crematorio y velatorios dentro del propio panteón</li>
          <li>Fábrica propia de nichos, tumbas y placas conmemorativas</li>
        </ul>
        <div style="margin-top:26px"><a class="btn btn-primary" href="#/mapa">Recorrer el plano interactivo</a></div>
      </div>
      <div class="img-stack">
        <img src="${IMG.conjunto}" alt="Vista aérea del conjunto NAJ PIXAM">
        <img class="over" src="${IMG.capillaInterior}" alt="Interior de la capilla">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container split">
      <div class="img-stack">
        <img src="${IMG.flamboyan}" alt="Flamboyán entre columnas de caliza">
        <img class="over" src="${IMG.andadores}" alt="Andadores del panteón">
      </div>
      <div>
        <div class="section-head" style="margin-bottom:18px">
          <div class="eyebrow">Memorial digital & placa</div>
          <h2>El recuerdo también merece un lugar</h2>
          <p>Cada difunto cuenta con una página conmemorativa con muro de recuerdos y flores, y su placa se diseña en línea dentro de los formatos del reglamento — nuestra fábrica la talla y la instala.</p>
        </div>
        <ul class="checklist">
          <li>Muro de recuerdos con mensajes de familiares y amigos</li>
          <li>Diseñador de placa con vista previa en vivo (M8)</li>
          <li>Código QR en la placa que enlaza al memorial</li>
          <li>Acceso familiar administrado por el titular</li>
        </ul>
        <div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/memoriales">Explorar memoriales</a>
          <a class="btn btn-outline" href="#/placa">Diseñar una placa</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section tinted">
    <div class="container">
      <div class="section-head">
        <div class="eyebrow">Florería del panteón</div>
        <h2>Flores frescas, entregadas con respeto</h2>
        <p>Cualquier persona puede enviar o donar flores a un difunto; nuestro equipo las coloca en el espacio y notifica a la familia.</p>
      </div>
      <div class="shop-grid">
        ${PRODUCTOS.slice(0, 4).map(p => `
          <a class="card product" href="#/tienda">
            <div class="card-img"><img src="${p.img}" alt="${p.nombre}" loading="lazy"></div>
            <div class="card-body"><h3 style="font-size:17px">${p.nombre}</h3>
            <div class="rowline"><span class="price">${MXN(p.precio)}</span><span class="badge gold">${p.cat}</span></div></div>
          </a>`).join('')}
      </div>
      <div style="text-align:center;margin-top:34px"><a class="btn btn-outline" href="#/tienda">Ver toda la florería</a></div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head center">
        <div class="eyebrow">Un panteón para todos</div>
        <h2>Público, funerarias y gobierno</h2>
      </div>
      <div class="grid grid-3">
        <div class="card seg-card">
          <h3>Público general</h3>
          <ul><li>Lista de precios pública</li><li>Compra a necesidad o en preventa</li><li>Financiamiento sin intereses</li></ul>
          <a class="btn btn-primary btn-sm" href="#/mapa">Explorar espacios</a>
        </div>
        <div class="card seg-card">
          <h3>Funerarias aliadas</h3>
          <ul><li>${cfg('descFuneraria')}% de descuento de aliado</li><li>Compra a nombre del cliente final</li><li>Nicho tras cremación o tumba con cuerpo presente</li></ul>
          <button class="btn btn-outline btn-sm" onclick="modalLogin()">Acceso de aliado</button>
        </div>
        <div class="card seg-card">
          <h3>Gobierno</h3>
          <ul><li>Esquema y condiciones propias</li><li>Convenios institucionales</li><li>Atención directa con la administración</li></ul>
          <button class="btn btn-ghost btn-sm" onclick="toast('Demo: los convenios de gobierno se gestionan con la administración')">Solicitar convenio</button>
        </div>
      </div>
    </div>
  </section>

  <section class="section tinted" style="padding-bottom:0">
    <div class="container split" style="padding-bottom:84px">
      <div>
        <div class="section-head" style="margin-bottom:14px">
          <div class="eyebrow">Apps móviles</div>
          <h2>La relación continúa en tu teléfono</h2>
          <p>Memorial, placa, flores, ubicación del espacio en tus visitas, recordatorios de mensualidades y pago del mantenimiento — iOS y Android.</p>
        </div>
        <div class="store-badges">
          <a class="store-badge" href="#/" onclick="toast('Demo: la app iOS se publica junto con la plataforma')"><span style="font-size:26px"></span><span><small>Descárgala en el</small><b>App Store</b></span></a>
          <a class="store-badge" href="#/" onclick="toast('Demo: la app Android se publica junto con la plataforma')"><span style="font-size:24px">▶</span><span><small>Disponible en</small><b>Google Play</b></span></a>
        </div>
      </div>
      <div class="img-stack"><img src="${IMG.porticoAcceso}" alt="Pórtico de acceso"></div>
    </div>
  </section>

  <section class="section" style="padding-top:64px">
    <div class="container">
      <div class="panel" style="background:var(--jungle);color:#fff;text-align:center;border:none">
        <h2 style="color:#fdf9ee;font-size:34px">La previsión es un acto de amor</h2>
        <p style="color:#cfd6c0;max-width:62ch;margin:10px auto 24px">Adquirir un espacio en preventa —para ti o para un beneficiario— evita a tu familia decisiones difíciles en los momentos más delicados, con mensualidades sin intereses.</p>
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
  if (params.linea) mapFiltro.linea = params.linea;
  if (params.sel) mapaSel = params.sel;
  setTimeout(initMapa, 0);
  return `
  <div class="map-layout">
    <div class="map-canvas-wrap" id="map-wrap">
      ${renderMapaSVG(mapaSel)}
      <div class="map-toolbar">
        <label class="tool">Línea
          <select id="f-linea">
            <option value="">Todas</option>
            ${Object.entries(LINEAS).map(([k, l]) => `<option value="${k}" ${mapFiltro.linea === k ? 'selected' : ''}>${l.nombre}</option>`).join('')}
          </select></label>
        <label class="tool">Sección
          <select id="f-seccion">
            <option value="">Todas</option>
            ${SECCIONES.map(s => `<option value="${s.id}" ${mapFiltro.seccion === s.id ? 'selected' : ''}>${s.id} · ${s.nombre}</option>`).join('')}
          </select></label>
        <label class="tool">Precio máx.
          <select id="f-precio">
            <option value="0">Sin límite</option>
            <option value="40000" ${mapFiltro.maxPrecio === 40000 ? 'selected' : ''}>Hasta $40,000</option>
            <option value="80000" ${mapFiltro.maxPrecio === 80000 ? 'selected' : ''}>Hasta $80,000</option>
            <option value="120000" ${mapFiltro.maxPrecio === 120000 ? 'selected' : ''}>Hasta $120,000</option>
          </select></label>
        <label class="tool"><input type="checkbox" id="f-disp" ${mapFiltro.soloDisp ? 'checked' : ''} style="accent-color:var(--jungle)"> Solo disponibles</label>
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
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#94886f" stroke-width="1.4"><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
      <h3 style="font-size:22px;color:var(--jungle);margin-bottom:8px">Selecciona un espacio</h3>
      <p style="font-size:14px">Haz clic en cualquier espacio del plano para ver su ficha: línea, tipo, ubicación, atributo de precio y disponibilidad. Acerca con la rueda del ratón.</p>
    </div>`;
  }
  const sec = seccionById(e.seccion);
  const est = estadoDe(e);
  const mem = memorialDeEspacio(e.id);
  const rol = DB.user && DB.user.rol;
  const d = desglose(e, 'necesidad', rol);
  let accion = '';
  if (est === 'disponible') {
    accion = `<a class="btn btn-gold btn-block" href="#/comprar/${e.id}">Iniciar compra en línea</a>
      <p style="font-size:12px;color:var(--ink-3);text-align:center;margin-top:10px">Se aparta 15 minutos mientras completas el proceso. Contado o financiado sin intereses.</p>`;
  } else if (est === 'apartado') {
    accion = `<button class="btn btn-outline btn-block" disabled>Apartado temporalmente</button>`;
  } else if (mem) {
    accion = `<a class="btn btn-primary btn-block" href="#/memorial/${mem.id}">Ver memorial de ${mem.nombre.split(' ')[1] || mem.nombre}</a>
      <a class="btn btn-ghost btn-block" style="margin-top:8px" href="#/tienda?destino=${mem.id}">Enviar flores 🌹</a>`;
  } else {
    accion = `<button class="btn btn-outline btn-block" disabled>${est === 'vendido' ? 'Vendido en preventa' : 'Espacio ocupado'}</button>`;
  }
  return `<div class="space-card">
    <img class="ficha-img" src="${sec.img}" alt="${sec.nombre}">
    <div class="body">
      <span class="tag ${est}"><span class="dot" style="background:${ST_COLOR[est]}"></span>${ST_LABEL[est]}</span>
      <h2 style="margin-top:10px">${LINEAS[e.linea].icon} ${TIPOS[e.tipo].nombre} ${e.id}</h2>
      <div class="loc">${sec.nombre} · ${e.linea === 'nicho' ? sec.atributo : 'Sección ' + sec.id} · Fila ${e.fila}, Posición ${e.col}</div>
      <p style="font-size:13.5px;color:var(--ink-2)">${LINEAS[e.linea].desc}</p>
      ${mem ? `<p style="font-size:13.5px;margin-top:10px">🕊️ Aquí descansa <b>${mem.nombre}</b> (${mem.nac ? new Date(mem.nac).getFullYear() : '·'}–${new Date(mem.def).getFullYear()}).</p>` : ''}
      ${est === 'disponible' || est === 'apartado' ? `
      <table class="price-table">
        <tr><td>Espacio (${TIPOS[e.tipo].nombre.toLowerCase()})</td><td>${MXN(precioDe(e))}</td></tr>
        ${rol === 'funeraria' ? `<tr><td>Descuento aliado (−${cfg('descFuneraria')}%)</td><td>−${MXN(d.descuento)}</td></tr>` : ''}
        ${e.linea === 'tumba' ? `<tr><td>Excavación (a necesidad, aparte)</td><td>${MXN(cfg('excavacion'))}</td></tr>` : `<tr><td>Apertura/cierre por urna</td><td>${MXN(cfg('aperturaCierreNicho'))}</td></tr>`}
        <tr><td>Mantenimiento anual</td><td>${MXN(mantDe(e))}/año</td></tr>
        <tr class="sub"><td colspan="2">Extras normativos por cuenta del consumidor: IVA ${cfg('ivaPct')}%, derechos municipales, Registro Civil y maniobras — se desglosan al comprar.</td></tr>
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
  bind('f-linea', ev => { mapFiltro.linea = ev.target.value; refreshSpaces(); });
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
  if (!e) return `<div class="wizard"><div class="panel"><h2>Espacio no encontrado</h2><a class="btn btn-primary" href="#/mapa">Volver al mapa</a></div></div>`;
  const est = estadoDe(e);
  const esMio = DB.reserva && DB.reserva.espacioId === espId;
  if (est !== 'disponible' && !esMio && !(wiz && wiz.espacioId === espId)) {
    return `<div class="wizard"><div class="panel"><h2>Este espacio ya no está disponible</h2><p class="sub">Alguien más lo apartó o adquirió. Elige otro espacio en el mapa.</p><a class="btn btn-primary" href="#/mapa">Volver al mapa</a></div></div>`;
  }
  if (!wiz || wiz.espacioId !== espId) {
    wiz = { espacioId: espId, step: 1, modalidad: 'necesidad', titular: {}, difunto: {}, sustituto: {}, ben1: {}, ben2: {},
            clienteFinal: '', firma: '', acepto: false, pagoTipo: 'contado', engPct: cfg('engancheMin'), plazo: cfg('plazos')[1] };
  }
  setTimeout(bindWizard, 0);
  return `<div class="wizard">${wizardHTML(e)}</div>`;
}

function wizardHTML(e) {
  const pasos = ['Espacio', 'Datos', 'Contrato', 'Pago', 'Confirmación'];
  const sec = seccionById(e.seccion);
  const rol = DB.user && DB.user.rol;
  const d = desglose(e, wiz.modalidad, rol);
  const stepsBar = `<div class="wizard-steps">${pasos.map((p, i) =>
    `<span class="wstep ${wiz.step === i + 1 ? 'active' : ''} ${wiz.step > i + 1 ? 'done' : ''}"><span class="n">${wiz.step > i + 1 ? '✓' : i + 1}</span>${p}</span>`).join('')}</div>`;

  const timer = DB.reserva && DB.reserva.espacioId === e.id && wiz.step > 1 && wiz.step < 5
    ? `<div style="margin-bottom:18px"><span class="reserve-timer">⏱ Espacio apartado para ti · <span id="rtimer">15:00</span></span></div>` : '';

  let body = '';
  if (wiz.step === 1) {
    body = `<div class="panel">
      <h2>${LINEAS[e.linea].icon} ${TIPOS[e.tipo].nombre} ${e.id}</h2>
      <p class="sub">${sec.nombre} · ${e.linea === 'nicho' ? sec.atributo : 'Sección ' + sec.id} · Fila ${e.fila}, Posición ${e.col}</p>
      <img src="${sec.img}" alt="${sec.nombre}" style="border-radius:12px;height:230px;width:100%;object-fit:cover;margin-bottom:18px">
      <table class="price-table">
        <tr><td>Espacio (${TIPOS[e.tipo].nombre.toLowerCase()})</td><td>${MXN(precioDe(e))}</td></tr>
        ${rol === 'funeraria' ? `<tr><td>Descuento aliado (−${cfg('descFuneraria')}%)</td><td>−${MXN(d.descuento)}</td></tr>` : ''}
        ${e.linea === 'tumba' ? `<tr><td>Excavación (solo compra a necesidad)</td><td>${MXN(cfg('excavacion'))}</td></tr>` : ''}
        <tr><td>Mantenimiento anual (recurrente)</td><td>${MXN(mantDe(e))}/año</td></tr>
        <tr class="sub"><td colspan="2">Más extras normativos por cuenta del consumidor (IVA ${cfg('ivaPct')}%, derechos municipales de Kanasín, Registro Civil y maniobras) — se desglosan en el paso de pago según la modalidad.</td></tr>
        <tr class="total"><td>Vigencia del derecho de uso</td><td>${cfg('vigenciaAnios')} años desde la ocupación</td></tr>
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
      <h2>Datos del contrato</h2>
      <p class="sub">El titular firma el contrato de adhesión, paga y administra el espacio. Puede designar titular sustituto y hasta dos beneficiarios (cláusulas décima cuarta y décima quinta).</p>
      <h3 class="ft">Titular / consumidor</h3>
      <div class="form-grid">
        <div class="field"><label>Nombre completo *</label><input id="t-nombre" value="${wiz.titular.nombre || (DB.user && DB.user.rol !== 'admin' ? DB.user.nombre : '')}"></div>
        <div class="field"><label>Correo electrónico *</label><input id="t-email" type="email" value="${wiz.titular.email || (DB.user ? DB.user.email : '')}"></div>
        <div class="field"><label>Teléfono *</label><input id="t-tel" value="${wiz.titular.tel || ''}" placeholder="(999) 000 0000"></div>
        <div class="field"><label>Domicilio</label><input id="t-dom" value="${wiz.titular.dom || ''}" placeholder="Calle, número, colonia, municipio"></div>
      </div>
      ${rol === 'funeraria' ? `
      <h3 class="ft">Cliente final (compra de aliado)</h3>
      <div class="form-grid"><div class="field full"><label>Nombre del cliente final *</label><input id="t-cliente" value="${wiz.clienteFinal || ''}" placeholder="La funeraria compra a nombre de su cliente"></div></div>` : ''}
      <h3 class="ft">Modalidad de compra</h3>
      <div class="radio-cards three">
        <div class="radio-card ${wiz.modalidad === 'necesidad' ? 'on' : ''}" data-modo="necesidad"><b>A necesidad</b><span>Cuerpo presente o cenizas por depositar; se registra al difunto y se crea el memorial.</span></div>
        <div class="radio-card ${wiz.modalidad === 'prevision-propia' ? 'on' : ''}" data-modo="prevision-propia"><b>Preventa · para mí</b><span>El titular adquiere su propio espacio a futuro.</span></div>
        <div class="radio-card ${wiz.modalidad === 'prevision-beneficiario' ? 'on' : ''}" data-modo="prevision-beneficiario"><b>Preventa · beneficiario</b><span>El espacio se destina a un beneficiario designado.</span></div>
      </div>
      <div id="difunto-form" style="margin-top:18px;display:${wiz.modalidad === 'necesidad' ? 'block' : 'none'}">
        <h3 class="ft">Datos del difunto</h3>
        <div class="form-grid">
          <div class="field"><label>Nombre completo del difunto *</label><input id="d-nombre" value="${wiz.difunto.nombre || ''}"></div>
          <div class="field"><label>Fecha de nacimiento</label><input id="d-nac" type="date" value="${wiz.difunto.nac || ''}"></div>
          <div class="field"><label>Fecha de defunción</label><input id="d-def" type="date" value="${wiz.difunto.def || ''}"></div>
          <div class="field"><label>Epitafio o dedicatoria (opcional)</label><input id="d-epi" value="${wiz.difunto.epi || ''}" placeholder="Unas palabras para recordarle"></div>
        </div>
      </div>
      <h3 class="ft">Titular sustituto (opcional)</h3>
      <div class="form-grid">
        <div class="field"><label>Nombre</label><input id="s-nombre" value="${wiz.sustituto.nombre || ''}"></div>
        <div class="field"><label>Parentesco</label><input id="s-par" value="${wiz.sustituto.par || ''}" placeholder="Cónyuge, hijo(a)…"></div>
      </div>
      <h3 class="ft">Beneficiarios (hasta dos, opcional)</h3>
      <div class="form-grid">
        <div class="field"><label>Beneficiario 1 · nombre</label><input id="b1-nombre" value="${wiz.ben1.nombre || ''}"></div>
        <div class="field"><label>Parentesco</label><input id="b1-par" value="${wiz.ben1.par || ''}"></div>
        <div class="field"><label>Beneficiario 2 · nombre</label><input id="b2-nombre" value="${wiz.ben2.nombre || ''}"></div>
        <div class="field"><label>Parentesco</label><input id="b2-par" value="${wiz.ben2.par || ''}"></div>
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
      <h2>Contrato de adhesión</h2>
      <p class="sub">Derechos de uso de lotes o nichos en temporalidad, conforme a la NOM-036-SCFI-2016 y registrado ante Profeco. La firma es de aceptación en línea (clickwrap) con sello de tiempo; el PDF queda resguardado en tu cuenta.</p>
      <div class="contract-box">${contratoTexto(e, wiz, null)}</div>
      <label class="check-line"><input type="checkbox" id="c-acepto" ${wiz.acepto ? 'checked' : ''}>
        He leído y acepto el contrato de adhesión, el reglamento interno del panteón y el aviso de privacidad. Entiendo que los derechos no son transferibles salvo a un familiar, con consentimiento por escrito del proveedor.</label>
      <div class="signature-row">
        <div class="field"><label>Firma: escribe tu nombre completo tal como aparece en el contrato *</label>
          <input id="c-firma" value="${wiz.firma || ''}" placeholder="${wiz.titular.nombre || ''}" style="font-family:var(--font-serif);font-size:20px;font-style:italic"></div>
      </div>
      <div class="stamp">🕐 Sello de tiempo al firmar: <b>${new Date().toLocaleString('es-MX')}</b> · IP registrada · Folio por asignar</div>
      <div class="wizard-nav">
        <button class="btn btn-ghost" id="w-back">← Regresar</button>
        <button class="btn btn-gold" id="w-next">Firmar y continuar al pago</button>
      </div>
    </div>`;
  }
  if (wiz.step === 4) {
    const engMonto = Math.round(d.financiable * wiz.engPct / 100);
    const mensualidad = Math.ceil((d.financiable - engMonto) / wiz.plazo);
    const hoyFin = engMonto + d.extras + d.mant;
    body = `<div class="panel">
      ${timer}
      <h2>Pago seguro</h2>
      <p class="sub">Procesado por Stripe. Precio fijo que no genera intereses (cláusula tercera). El título de derechos se entrega al liquidar.</p>
      <h3 class="ft">Forma de pago</h3>
      <div class="radio-cards">
        <div class="radio-card ${wiz.pagoTipo === 'contado' ? 'on' : ''}" data-pago="contado"><b>De contado</b><span>Un solo pago hoy. Título de derechos inmediato.</span></div>
        <div class="radio-card ${wiz.pagoTipo === 'financiado' ? 'on' : ''}" data-pago="financiado"><b>Financiado sin intereses</b><span>Enganche + mensualidades fijas vía suscripción Stripe.</span></div>
      </div>
      <div id="fin-opts" style="display:${wiz.pagoTipo === 'financiado' ? 'block' : 'none'}">
        <div class="fin-grid">
          <div class="field"><label>Enganche (mín. ${cfg('engancheMin')}%)</label>
            <select id="p-eng">${[30, 40, 50].filter(x => x >= cfg('engancheMin')).map(x => `<option value="${x}" ${wiz.engPct === x ? 'selected' : ''}>${x}%</option>`).join('')}</select></div>
          <div class="field"><label>Plazo (mensualidades)</label>
            <select id="p-plazo">${cfg('plazos').map(x => `<option value="${x}" ${wiz.plazo === x ? 'selected' : ''}>${x} meses</option>`).join('')}</select></div>
          <div class="field"><label>Mensualidad resultante</label><input value="${MXN(mensualidad)}" disabled></div>
        </div>
        <div class="fin-summary">La cuota anual de mantenimiento (${MXN(d.mant)}) se integra a tu suscripción y continúa tras la liquidación.</div>
      </div>
      <h3 class="ft">Desglose</h3>
      <table class="price-table">
        <tr><td>Espacio ${e.id}${d.descuento ? ` (con descuento de aliado −${cfg('descFuneraria')}%)` : ''}</td><td>${MXN(d.precioEspacio - d.descuento)}</td></tr>
        ${d.excavacion ? `<tr><td>Excavación (tumba, a necesidad)</td><td>${MXN(d.excavacion)}</td></tr>` : ''}
        <tr><td>IVA ${cfg('ivaPct')}% (extra normativo)</td><td>${MXN(d.iva)}</td></tr>
        <tr><td>Derechos municipales de Kanasín</td><td>${MXN(d.derechos)}</td></tr>
        ${d.registro ? `<tr><td>Registro Civil</td><td>${MXN(d.registro)}</td></tr>` : ''}
        ${d.maniobras ? `<tr><td>Maniobras de inhumación</td><td>${MXN(d.maniobras)}</td></tr>` : ''}
        <tr><td>Mantenimiento — año 1</td><td>${MXN(d.mant)}</td></tr>
        ${wiz.pagoTipo === 'financiado' ? `
          <tr><td>Enganche ${wiz.engPct}% sobre ${MXN(d.financiable)}</td><td>${MXN(engMonto)}</td></tr>
          <tr class="total"><td>Total a pagar hoy</td><td>${MXN(hoyFin)}</td></tr>
          <tr class="sub"><td colspan="2">Después: ${wiz.plazo} mensualidades de ${MXN(mensualidad)} sin intereses.</td></tr>`
        : `<tr class="total"><td>Total a pagar hoy (contado)</td><td>${MXN(d.totalHoyContado)}</td></tr>`}
      </table>
      <div class="paybox">
        <div class="brandrow"><b>Tarjeta de crédito o débito</b><span class="cardlogos"><span>VISA</span><span>MC</span><span>AMEX</span></span></div>
        <div class="form-grid">
          <div class="field full"><label>Número de tarjeta</label><input id="p-num" inputmode="numeric" value="4242 4242 4242 4242"></div>
          <div class="field"><label>Vencimiento</label><input id="p-exp" value="12/28"></div>
          <div class="field"><label>CVC</label><input id="p-cvc" value="123"></div>
        </div>
        <p style="font-size:11.5px;color:var(--ink-3);margin-top:10px">🔒 Demo: no se realiza ningún cargo real. En producción, Stripe procesa el pago, el plan de mensualidades y el mantenimiento recurrente.</p>
      </div>
      <div class="wizard-nav">
        <button class="btn btn-ghost" id="w-back">← Regresar</button>
        <button class="btn btn-gold" id="w-pay">Pagar ${MXN(wiz.pagoTipo === 'financiado' ? hoyFin : d.totalHoyContado)}</button>
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
        <tr><td>Contrato de adhesión</td><td><span class="folio">${c.contrato.folio}</span> · firmado ${new Date(c.contrato.fecha).toLocaleString('es-MX')}</td></tr>
        <tr><td>Espacio</td><td>${TIPOS[e.tipo].nombre} ${e.id} · ${sec.nombre}</td></tr>
        <tr><td>Forma de pago</td><td>${c.pago.tipo === 'contado' ? 'Contado · título de derechos disponible' : `Financiado: ${c.pago.plazo} mensualidades de ${MXN(c.pago.mensualidad)} sin intereses`}</td></tr>
        <tr><td>Mantenimiento</td><td>${MXN(mantDe(e))}/año · próxima renovación ${fmtFecha(c.mantenimiento.proximaRenovacion)}</td></tr>
      </table>
      <div class="wizard-nav" style="justify-content:center;gap:12px">
        <button class="btn btn-outline" onclick="verContrato('${c.folio}')">Ver contrato</button>
        <a class="btn btn-primary" href="#/cuenta">Ir a mi cuenta</a>
        ${c.memorialId ? `<a class="btn btn-gold" href="#/placa?mem=${c.memorialId}">Diseñar la placa</a>` : `<a class="btn btn-ghost" href="#/mapa?sel=${e.id}">Ver en el mapa</a>`}
      </div>
    </div>`;
  }
  return stepsBar + body;
}

/* ---------- Contrato de adhesión (M3, modelo Profeco / NOM-036) ---------- */
function contratoTexto(e, w, compra) {
  const sec = seccionById(e.seccion);
  const src = compra || w;
  const titular = (src.titular && src.titular.nombre) || '____________________';
  const modalidad = src.modalidad || 'necesidad';
  const difunto = modalidad === 'necesidad' && src.difunto && src.difunto.nombre ? src.difunto.nombre : null;
  const sust = src.sustituto && src.sustituto.nombre;
  const bens = [src.ben1, src.ben2].filter(b => b && b.nombre);
  const rolFun = compra ? compra.segmento === 'funeraria' : (DB.user && DB.user.rol === 'funeraria');
  const d = compra ? compra.desglose : desglose(e, modalidad, rolFun ? 'funeraria' : null);
  return `
    <h3>Contrato de derechos de uso de lotes o nichos en panteón en temporalidad</h3>
    <p>Que celebran por una parte <b>NAJ PIXAM · CASA DEL ALMA, S.A. DE C.V.</b>, con domicilio en Kanasín, Yucatán, en lo sucesivo <b>"EL PROVEEDOR"</b>, y por la otra <b>${titular}</b>, en lo sucesivo <b>"EL CONSUMIDOR"</b>, conforme al siguiente glosario, declaraciones y cláusulas.</p>
    <h3>Glosario</h3>
    <p><b>Titular sustituto:</b> persona designada por el consumidor para disponer de los derechos en su ausencia o imposibilidad. <b>Beneficiarios:</b> hasta dos personas que, al faltar el consumidor y el titular sustituto, adquieren los derechos y obligaciones de este contrato. <b>Usuario:</b> la persona a quien se destinan los derechos de uso.</p>
    <h3>Primera · Consentimiento y objeto</h3>
    <p>La naturaleza jurídica de este contrato es la venta de derechos de uso <b>en temporalidad</b> del espacio descrito a continuación, en el panteón NAJ PIXAM · Casa del Alma:</p>
    <table>
      <tr><td><b>Espacio</b></td><td>${TIPOS[e.tipo].nombre} ${e.id}</td></tr>
      <tr><td><b>Línea de servicio</b></td><td>${LINEAS[e.linea].nombre} — ${e.linea === 'tumba' ? 'inhumación de cuerpo' : 'restos cremados'}</td></tr>
      <tr><td><b>Ubicación</b></td><td>${sec.nombre}, fila ${e.fila}, posición ${e.col} (${sec.atributo})</td></tr>
      <tr><td><b>Modalidad</b></td><td>${modalidad === 'necesidad' ? 'A necesidad (uso inmediato)' : 'Preventa / provisión' + (modalidad === 'prevision-beneficiario' ? ' a favor de beneficiario' : ' del propio titular')}</td></tr>
      <tr><td><b>Vigencia</b></td><td>${cfg('vigenciaAnios')} años contados a partir de la ocupación del espacio</td></tr>
      ${difunto ? `<tr><td><b>Usuario</b></td><td>${difunto}</td></tr>` : ''}
      ${compra && compra.clienteFinal ? `<tr><td><b>Cliente final (aliado)</b></td><td>${compra.clienteFinal}</td></tr>` : (!compra && src.clienteFinal ? `<tr><td><b>Cliente final (aliado)</b></td><td>${src.clienteFinal}</td></tr>` : '')}
    </table>
    <p>Al término de la temporalidad, el consumidor se obliga a retirar los restos en un plazo no mayor a 90 días; podrá contratar la <b>perpetuidad</b> del mismo espacio mediante contrato separado. Tratándose de nichos, la apertura y cierre por resguardo o retiro de urna se cubre a la tarifa vigente del catálogo informativo.</p>
    <h3>Segunda · Precio</h3>
    <p>El consumidor pagará como precio de los derechos de uso la cantidad de <b>${MXN(d.precioEspacio - d.descuento)}</b>${d.descuento ? ` (precio de lista ${MXN(d.precioEspacio)} con descuento de aliado)` : ''}${d.excavacion ? `, más <b>${MXN(d.excavacion)}</b> por excavación` : ''}. Dicha cantidad es <b>fija y no generará intereses</b> de ninguna especie.</p>
    <h3>Tercera · Forma de pago</h3>
    <p>${compra
      ? (compra.pago.tipo === 'contado'
        ? `Pago de contado en una sola exhibición por <b>${MXN(compra.desglose.totalHoyContado)}</b> (incluye extras normativos y primer año de mantenimiento).`
        : `Un pago inicial (enganche ${compra.pago.engPct}%) de <b>${MXN(compra.pago.enganche)}</b> y ${compra.pago.plazo} mensualidades fijas de <b>${MXN(compra.pago.mensualidad)}</b>, sin intereses, mediante cargo recurrente.`)
      : 'De contado o mediante pago inicial (enganche) y mensualidades fijas sin intereses, según la carátula de pago elegida por el consumidor, que forma parte integrante de este contrato.'}
    El consumidor podrá realizar pagos por adelantado o liquidar el total sin penalización alguna. El proveedor entregará el <b>título de derechos</b> una vez cubierto el precio total.</p>
    <h3>Cuarta · Extras normativos por cuenta del consumidor</h3>
    <p>Serán por cuenta del consumidor el IVA (${cfg('ivaPct')}%), los derechos municipales conforme al Reglamento de Panteones de Kanasín, los derechos ante el Registro Civil y las maniobras de inhumación o exhumación, a la tarifa vigente del catálogo informativo.</p>
    <h3>Quinta · Mantenimiento</h3>
    <p>El proveedor tiene a su cargo el arreglo y mantenimiento de las áreas comunes. El consumidor pagará una cuota anual de mantenimiento de <b>${MXN(d.mant)}</b> (tarifa vigente del catálogo) a partir de la ocupación del espacio. La falta de uno o más pagos anuales consecutivos es causa de rescisión.</p>
    <h3>Sexta · Titular sustituto y beneficiarios</h3>
    <p>${sust ? `El consumidor designa como titular sustituto a <b>${src.sustituto.nombre}</b> (${src.sustituto.par || 'parentesco por acreditar'}).` : 'El consumidor podrá designar en cualquier momento un titular sustituto, sin que ello condicione el otorgamiento de los derechos.'}
    ${bens.length ? ` Designa como beneficiario(s): ${bens.map((b, i) => `<b>${b.nombre}</b> (${b.par || 's/parentesco'})`).join(' y ')}.` : ' Podrá designar hasta dos beneficiarios.'}</p>
    <h3>Séptima · Cesión de derechos</h3>
    <p>Los derechos de este contrato <b>no son transferibles, salvo a un familiar</b>, previo consentimiento expreso y por escrito del proveedor, estando el consumidor al corriente de sus pagos y cubriendo el costo del catálogo informativo. El proveedor responderá la solicitud en un plazo de 10 días naturales.</p>
    <h3>Octava · Rescisión, pena convencional y cancelación</h3>
    <p>Son causas de rescisión imputables al consumidor: dejar de efectuar tres o más pagos consecutivos, la falta de pagos anuales de mantenimiento y la cesión sin consentimiento. La parte que incumpla pagará una pena convencional del <b>20%</b> del precio total. El consumidor puede <b>cancelar sin costo dentro de los 5 días hábiles</b> siguientes a la firma, con devolución íntegra en un plazo máximo de 5 días hábiles.</p>
    <h3>Novena · Firma electrónica y reglamento</h3>
    <p>Las partes acuerdan que la aceptación en línea (clickwrap) con sello de tiempo constituye la manifestación del consentimiento del consumidor. El consumidor declara conocer y aceptar el reglamento interno del panteón, que forma parte integrante del presente contrato. El servicio se presta las 24 horas, los 365 días del año.</p>
    <h3>Plano de localización del derecho de uso contratado</h3>
    ${typeof planoLocalizacionSVG === 'function' ? planoLocalizacionSVG(e) : ''}
    ${compra ? `<p style="margin-top:16px"><i>Firmado electrónicamente por <b>${compra.contrato.firma}</b> el ${new Date(compra.contrato.fecha).toLocaleString('es-MX')} · Folio ${compra.contrato.folio}</i></p>` : ''}
    <p class="reg">Este modelo de contrato de adhesión se basa en el registrado ante la Procuraduría Federal del Consumidor conforme a la NOM-036-SCFI-2016 (referencia: registro 4667-2025). NAJ PIXAM tramitará su propio registro; cualquier variación en perjuicio del consumidor frente al contrato registrado se tendrá por no puesta.</p>
  `;
}

function bindWizard() {
  const e = espacioById(wiz.espacioId);
  if (!e) return;
  const next = document.getElementById('w-next');
  const back = document.getElementById('w-back');
  const pay = document.getElementById('w-pay');

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
      guardarPaso();
      wiz.modalidad = rc.dataset.modo;
      document.querySelectorAll('.radio-card[data-modo]').forEach(x => x.classList.toggle('on', x === rc));
      document.getElementById('difunto-form').style.display = wiz.modalidad === 'necesidad' ? 'block' : 'none';
    };
  });
  document.querySelectorAll('.radio-card[data-pago]').forEach(rc => {
    rc.onclick = () => { guardarPaso(); wiz.pagoTipo = rc.dataset.pago; rerender(); };
  });
  const pe = document.getElementById('p-eng'), pp = document.getElementById('p-plazo');
  if (pe) pe.onchange = () => { wiz.engPct = +pe.value; rerender(); };
  if (pp) pp.onchange = () => { wiz.plazo = +pp.value; rerender(); };

  if (back) back.onclick = () => { guardarPaso(); wiz.step--; rerender(); };
  if (next) next.onclick = () => {
    if (wiz.step === 1) { iniciarReserva(e.id); wiz.step = 2; rerender(); return; }
    if (wiz.step === 2) {
      guardarPaso();
      if (!wiz.titular.nombre || !wiz.titular.email || !wiz.titular.tel) { toast('Completa nombre, correo y teléfono del titular.'); return; }
      if (wiz.modalidad === 'necesidad' && !wiz.difunto.nombre) { toast('Indica el nombre del difunto o elige preventa.'); return; }
      if (DB.user && DB.user.rol === 'funeraria' && !wiz.clienteFinal) { toast('Indica el nombre del cliente final.'); return; }
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
      wiz.sustituto = { nombre: v('s-nombre'), par: v('s-par') };
      wiz.ben1 = { nombre: v('b1-nombre'), par: v('b1-par') };
      wiz.ben2 = { nombre: v('b2-nombre'), par: v('b2-par') };
      if (document.getElementById('t-cliente')) wiz.clienteFinal = v('t-cliente');
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
  const rol = DB.user && DB.user.rol;
  const d = desglose(e, wiz.modalidad, rol);
  const n = DB.compras.length + 1;
  const hoy = new Date();
  const unAno = new Date(hoy); unAno.setFullYear(unAno.getFullYear() + 1);
  const conDifunto = wiz.modalidad === 'necesidad' && wiz.difunto.nombre;
  let memorialId = null;
  if (conDifunto) {
    memorialId = 'mem-u' + (DB.memorialesNuevos.length + 1);
    DB.memorialesNuevos.push({
      id: memorialId, nombre: wiz.difunto.nombre, nac: wiz.difunto.nac || '', def: wiz.difunto.def || hoy.toISOString().slice(0, 10),
      foto: null, cover: seccionById(e.seccion).img, publico: true, espacio: e.id,
      epitafio: wiz.difunto.epi || 'Siempre en nuestro corazón.',
      mensajes: [], flores: [],
    });
  }
  const engMonto = Math.round(d.financiable * wiz.engPct / 100);
  const mensualidad = Math.ceil((d.financiable - engMonto) / wiz.plazo);
  const contado = wiz.pagoTipo === 'contado';
  const compra = {
    folio: 'CP-2026-' + String(1000 + n),
    espacioId: e.id,
    modalidad: wiz.modalidad,
    segmento: rol === 'funeraria' ? 'funeraria' : 'publico',
    clienteFinal: wiz.clienteFinal || null,
    titular: wiz.titular, sustituto: wiz.sustituto, ben1: wiz.ben1, ben2: wiz.ben2,
    difunto: conDifunto ? wiz.difunto : null,
    memorialId,
    desglose: d,
    pago: contado
      ? { tipo: 'contado' }
      : { tipo: 'financiado', engPct: wiz.engPct, enganche: engMonto, plazo: wiz.plazo, mensualidad, pagadas: 0 },
    liquidado: contado,
    contrato: { folio: 'NP-2026-' + String(800 + n), firma: wiz.firma, fecha: hoy.toISOString(), estado: 'vigente' },
    pagos: [{
      concepto: contado ? `Pago de contado ${e.id} (espacio, extras y mantenimiento año 1)` : `Enganche ${wiz.engPct}% + extras y mantenimiento año 1 · ${e.id}`,
      monto: contado ? d.totalHoyContado : engMonto + d.extras + d.mant,
      fecha: hoy.toISOString(), metodo: 'Tarjeta •••• 4242',
    }],
    mantenimiento: { estado: 'al corriente', proximaRenovacion: unAno.toISOString() },
  };
  DB.compras.push(compra);
  DB.overrides[e.id] = conDifunto ? 'ocupado' : 'vendido';
  DB.reserva = null;
  if (!DB.user || DB.user.rol === 'admin') DB.user = { rol: 'titular', nombre: wiz.titular.nombre, email: wiz.titular.email };
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
    <p class="sub">Resguardado digitalmente · <span class="tag vigente">vigente</span> ${c.liquidado ? '· <span class="tag liquidado">liquidado</span>' : ''}</p>
    <div class="contract-box" style="height:400px">${contratoTexto(e, null, c)}</div>
    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="descargarContrato('${c.folio}')">Descargar PDF del contrato</button>
      ${c.liquidado ? `<button class="btn btn-gold" onclick="descargarTitulo('${c.folio}')">Descargar título de derechos</button>` : ''}
      <button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>
    </div>
  `);
}

function descargarContrato(folioCompra) {
  const c = DB.compras.find(x => x.folio === folioCompra);
  if (!c) return;
  const e = espacioById(c.espacioId);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Contrato ${c.contrato.folio}</title>
  <style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;color:#2b241a;line-height:1.6;padding:0 20px}h1,h3{color:#3f5233}table{border-collapse:collapse;width:100%}td{border:1px solid #c9bd9a;padding:6px 10px}</style>
  </head><body><h1>NAJ PIXAM · Casa del Alma</h1>${contratoTexto(e, null, c)}</body></html>`;
  descargarArchivo(`Contrato_${c.contrato.folio}.html`, html, 'text/html;charset=utf-8');
  toast('Contrato descargado (en producción se genera PDF sellado).');
}

function descargarTitulo(folioCompra) {
  const c = DB.compras.find(x => x.folio === folioCompra);
  if (!c || !c.liquidado) return;
  const e = espacioById(c.espacioId);
  const sec = seccionById(e.seccion);
  descargarArchivo(`Titulo_de_derechos_${c.contrato.folio}.txt`,
`NAJ PIXAM · CASA DEL ALMA — TÍTULO DE DERECHOS DE USO
======================================================
Titular:   ${c.titular.nombre}
Espacio:   ${TIPOS[e.tipo].nombre} ${e.id} · ${sec.nombre}
Vigencia:  ${cfg('vigenciaAnios')} años desde la ocupación
Contrato:  ${c.contrato.folio} (liquidado)
Emitido:   ${new Date().toLocaleString('es-MX')}
======================================================
Cláusula séptima del contrato: el título se entrega al
cubrir el precio total. Demo: en producción se emite como
PDF sellado y foliado.`);
  toast('Título de derechos descargado.');
}

/* ============================================================
   VISTA: Memoriales (M7)
   ============================================================ */
function viewMemoriales() {
  const lista = todosMemoriales().filter(m => m.publico);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">Memorial digital</div>
    <h1>Memoriales</h1>
    <p>Espacios conmemorativos públicos. Deja un mensaje o envía flores a quienes descansan en NAJ PIXAM.</p>
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
    ${m.foto ? `<img class="p" src="${m.foto}" alt="${m.nombre}">` : monograma(m.nombre, 104, 32)}
    <h3>${m.nombre}</h3>
    <div class="dates">${m.nac ? new Date(m.nac).getFullYear() : '·'} — ${new Date(m.def).getFullYear()}</div>
    <p style="font-style:italic;font-family:var(--font-serif);font-size:15.5px">"${m.epitafio}"</p>
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
  const finder = (x, y) => `<rect x="${x * S}" y="${y * S}" width="${7 * S}" height="${7 * S}" fill="#2b241a"/><rect x="${(x + 1) * S}" y="${(y + 1) * S}" width="${5 * S}" height="${5 * S}" fill="#fff"/><rect x="${(x + 2) * S}" y="${(y + 2) * S}" width="${3 * S}" height="${3 * S}" fill="#2b241a"/>`;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const enFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    if (!enFinder && rnd() > .52) cells += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="#2b241a"/>`;
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
             : `<div class="portrait" style="display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:44px;color:var(--copper)">${m.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')}</div>`}
    <h1>${m.nombre}</h1>
    <div class="dates">${m.nac ? fmtFecha(m.nac) : ''} — ${fmtFecha(m.def)}</div>
    <p class="epitaph">"${m.epitafio}"</p>
  </div>
  <div class="memorial-body container">
    <div class="memorial-grid">
      <div class="muro">
        <h2 style="color:var(--jungle);font-size:28px;margin-bottom:18px">Muro de recuerdos</h2>
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
          <h3>Placa conmemorativa</h3>
          <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:14px">Diseña la placa dentro de los formatos del reglamento; nuestra fábrica la produce e instala.</p>
          <a class="btn btn-outline btn-sm btn-block" href="#/placa?mem=${m.id}">Diseñar placa ✦</a>
        </div>
        <div class="sidebox">
          <h3>Ubicación en el panteón</h3>
          ${e ? `<p style="font-size:13.5px;color:var(--ink-2)">${TIPOS[e.tipo].nombre} <b>${e.id}</b> · ${sec.nombre} · Fila ${e.fila}, Posición ${e.col}</p>
          <a class="btn btn-outline btn-sm btn-block" style="margin-top:12px" href="#/mapa?sel=${e.id}">Ver en el mapa</a>` : ''}
        </div>
        <div class="sidebox qr-wrap">
          <h3>QR para la placa</h3>
          ${qrSVG(m.id)}
          <p>QR físico grabado en la placa que enlaza a este memorial.</p>
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
   VISTA: Diseñador de placa (M8)
   ============================================================ */
let placaSt = null;

function viewPlaca(params) {
  const mem = params.mem ? memorialById(params.mem) : null;
  if (!placaSt || (params.mem && placaSt.memId !== params.mem)) {
    const esp = mem && espacioById(mem.espacio);
    const linea = esp ? esp.linea : 'tumba';
    placaSt = {
      memId: mem ? mem.id : null,
      formato: linea === 'tumba' ? 'lapida-caliza' : (esp && seccionById(esp.seccion).atributo === 'Familiar techado' ? 'placa-familiar' : 'placa-bronce'),
      nombre: mem ? mem.nombre : 'Nombre del difunto',
      f1: mem && mem.nac ? new Date(mem.nac).getFullYear() : '1940',
      f2: mem ? new Date(mem.def).getFullYear() : '2026',
      texto: mem ? mem.epitafio : 'Siempre en nuestro corazón',
      ornamento: 'flor', fuente: 'display', qr: true,
    };
  }
  setTimeout(bindPlaca, 0);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">M8 · Diseñador de placa</div>
    <h1>Diseña la placa conmemorativa</h1>
    <p>Dentro de los formatos y medidas del reglamento del panteón (placa, florero y cruz permitidos). La especificación se envía a la fábrica de nichos y tumbas de NAJ PIXAM.</p>
  </div></div>
  <section class="section"><div class="container placa-layout">
    <div class="panel" style="position:sticky;top:96px">
      <h2 style="font-size:21px">Configuración</h2>
      <div class="field" style="margin-top:14px"><label>Formato (según tipo de espacio)</label>
        <select id="pl-formato">${Object.entries(PLACA_FORMATOS).map(([k, f]) => `<option value="${k}" ${placaSt.formato === k ? 'selected' : ''}>${f.nombre} · ${f.medidas} · ${MXN(f.precio)}</option>`).join('')}</select>
      </div>
      <div class="field" style="margin-top:12px"><label>Dedicado a</label>
        ${placaSt.memId ? `<input id="pl-nombre" value="${placaSt.nombre}" disabled><span class="hint">Tomado del memorial vinculado.</span>` :
        `<select id="pl-mem"><option value="">Escribir manualmente…</option>${todosMemoriales().map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')}</select>
         <input id="pl-nombre" value="${placaSt.nombre}" style="margin-top:8px">`}
      </div>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label>Año inicial</label><input id="pl-f1" value="${placaSt.f1}"></div>
        <div class="field"><label>Año final</label><input id="pl-f2" value="${placaSt.f2}"></div>
      </div>
      <div class="field" style="margin-top:12px"><label>Texto o dedicatoria (máx. 80)</label><input id="pl-texto" maxlength="80" value="${placaSt.texto}"></div>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label>Ornamento</label>
          <select id="pl-orn">${Object.entries(PLACA_ORNAMENTOS).map(([k, l]) => `<option value="${k}" ${placaSt.ornamento === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Tipografía</label>
          <select id="pl-fuente"><option value="display" ${placaSt.fuente === 'display' ? 'selected' : ''}>Lapidaria (Marcellus)</option><option value="serif" ${placaSt.fuente === 'serif' ? 'selected' : ''}>Clásica (Cormorant)</option></select></div>
      </div>
      <label class="check-line" style="margin-top:12px"><input type="checkbox" id="pl-qr" ${placaSt.qr ? 'checked' : ''}> Incluir QR al memorial digital</label>
      <button class="btn btn-gold btn-block" style="margin-top:20px" onclick="generarPlaca()">Generar especificación · ${MXN(PLACA_FORMATOS[placaSt.formato].precio)}</button>
      <p class="hint" style="margin-top:10px;font-size:12px;color:var(--ink-3)">La fábrica valida la especificación y programa la instalación. Reutiliza los datos del difunto y del memorial.</p>
    </div>
    <div class="placa-preview">
      <div class="placa-svg-wrap">
        <div id="placa-svg">${placaSVG()}</div>
        <p class="placa-spec" id="placa-spec">${PLACA_FORMATOS[placaSt.formato].nombre} · ${PLACA_FORMATOS[placaSt.formato].medidas} · ${PLACA_FORMATOS[placaSt.formato].desc}</p>
      </div>
    </div>
  </div></section>
  ${footerHTML()}`;
}

function placaOrnamentoSVG(tipo, x, y, color) {
  if (tipo === 'cruz') return `<g stroke="${color}" stroke-width="7" stroke-linecap="round"><line x1="${x}" y1="${y - 26}" x2="${x}" y2="${y + 26}"/><line x1="${x - 18}" y1="${y - 8}" x2="${x + 18}" y2="${y - 8}"/></g>`;
  if (tipo === 'flor') return `<g fill="${color}">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${x}" cy="${y - 15}" rx="7" ry="15" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="6" fill="${color}" opacity=".55"/></g>`;
  if (tipo === 'paloma') return `<g fill="${color}"><path d="M${x - 26} ${y + 6} Q ${x - 6} ${y - 22} ${x + 24} ${y - 12} Q ${x + 8} ${y - 6} ${x + 2} ${y + 4} Q ${x + 16} ${y + 2} ${x + 26} ${y + 10} Q ${x} ${y + 18} ${x - 26} ${y + 6} Z"/></g>`;
  return '';
}

function placaSVG() {
  const f = PLACA_FORMATOS[placaSt.formato];
  const W = 560, H = placaSt.formato === 'placa-bronce' ? 380 : 400;
  const fam = placaSt.fuente === 'display' ? 'Marcellus, Georgia, serif' : "'Cormorant Garamond', Georgia, serif";
  const tinta = f.tinta;
  const nombreSize = placaSt.nombre.length > 26 ? 30 : 36;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vista previa de la placa conmemorativa">
    <defs>
      <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${f.fondo}"/><stop offset=".55" stop-color="${f.fondo}"/><stop offset="1" stop-color="${f.fondo}" stop-opacity=".82"/>
      </linearGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer><feComposite operator="over" in2="SourceGraphic"/></filter>
    </defs>
    <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="14" fill="url(#pg)" stroke="${tinta}" stroke-opacity=".35" stroke-width="2" filter="url(#grain)"/>
    <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="8" fill="none" stroke="${tinta}" stroke-opacity=".5" stroke-width="1.4"/>
    ${placaOrnamentoSVG(placaSt.ornamento, W / 2, 82, tinta)}
    <text x="${W / 2}" y="${placaSt.ornamento === 'ninguno' ? 120 : 158}" text-anchor="middle" font-family="${fam}" font-size="${nombreSize}" fill="${tinta}" letter-spacing="1.5">${placaSt.nombre}</text>
    <text x="${W / 2}" y="${placaSt.ornamento === 'ninguno' ? 158 : 196}" text-anchor="middle" font-family="${fam}" font-size="19" fill="${tinta}" letter-spacing="4">${placaSt.f1} — ${placaSt.f2}</text>
    <line x1="${W / 2 - 60}" y1="${placaSt.ornamento === 'ninguno' ? 180 : 218}" x2="${W / 2 + 60}" y2="${placaSt.ornamento === 'ninguno' ? 180 : 218}" stroke="${tinta}" stroke-opacity=".5"/>
    <text x="${W / 2}" y="${placaSt.ornamento === 'ninguno' ? 216 : 254}" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-style="italic" font-size="20" fill="${tinta}">"${placaSt.texto}"</text>
    ${placaSt.qr ? `<g transform="translate(${W - 92}, ${H - 92}) scale(.52)"><rect x="-6" y="-6" width="121" height="121" fill="#fffdf7" rx="6"/>${qrInner(placaSt.memId || placaSt.nombre)}</g>
    <text x="${W - 64}" y="${H - 26}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="${tinta}" opacity=".8">MEMORIAL</text>` : ''}
    <text x="32" y="${H - 26}" font-family="Inter, sans-serif" font-size="10" fill="${tinta}" opacity=".65">NAJ PIXAM · ${f.medidas}</text>
  </svg>`;
}
function qrInner(seed) {
  const rnd = mulberry32(String(seed).split('').reduce((a, c) => a + c.charCodeAt(0) * 7, 0));
  const N = 21, S = 5.2;
  let cells = '';
  const finder = (x, y) => `<rect x="${x * S}" y="${y * S}" width="${7 * S}" height="${7 * S}" fill="#2b241a"/><rect x="${(x + 1) * S}" y="${(y + 1) * S}" width="${5 * S}" height="${5 * S}" fill="#fff"/><rect x="${(x + 2) * S}" y="${(y + 2) * S}" width="${3 * S}" height="${3 * S}" fill="#2b241a"/>`;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const enFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    if (!enFinder && rnd() > .52) cells += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="#2b241a"/>`;
  }
  return cells + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7);
}

function bindPlaca() {
  const upd = () => {
    const v = id => { const n = document.getElementById(id); return n ? n.value : null; };
    placaSt.formato = v('pl-formato') || placaSt.formato;
    if (document.getElementById('pl-nombre') && !document.getElementById('pl-nombre').disabled) placaSt.nombre = v('pl-nombre') || placaSt.nombre;
    placaSt.f1 = v('pl-f1') || placaSt.f1;
    placaSt.f2 = v('pl-f2') || placaSt.f2;
    placaSt.texto = v('pl-texto') || '';
    placaSt.ornamento = v('pl-orn') || placaSt.ornamento;
    placaSt.fuente = v('pl-fuente') || placaSt.fuente;
    const q = document.getElementById('pl-qr'); if (q) placaSt.qr = q.checked;
    document.getElementById('placa-svg').innerHTML = placaSVG();
    const f = PLACA_FORMATOS[placaSt.formato];
    document.getElementById('placa-spec').textContent = `${f.nombre} · ${f.medidas} · ${f.desc}`;
  };
  ['pl-formato', 'pl-nombre', 'pl-f1', 'pl-f2', 'pl-texto', 'pl-orn', 'pl-fuente', 'pl-qr'].forEach(id => {
    const n = document.getElementById(id);
    if (n) { n.oninput = upd; n.onchange = upd; }
  });
  const selMem = document.getElementById('pl-mem');
  if (selMem) selMem.onchange = () => {
    const m = memorialById(selMem.value);
    if (m) {
      placaSt.memId = m.id; placaSt.nombre = m.nombre;
      placaSt.f1 = m.nac ? new Date(m.nac).getFullYear() : placaSt.f1;
      placaSt.f2 = new Date(m.def).getFullYear();
      placaSt.texto = m.epitafio;
      location.hash = '#/placa?mem=' + m.id;
    }
  };
}

function generarPlaca() {
  const f = PLACA_FORMATOS[placaSt.formato];
  const folio = 'PL-' + (1200 + DB.placas.length);
  const spec = {
    folio, formato: placaSt.formato, memorial: placaSt.memId,
    nombre: placaSt.nombre, fechas: `${placaSt.f1} — ${placaSt.f2}`, texto: placaSt.texto,
    ornamento: placaSt.ornamento, fuente: placaSt.fuente, qr: placaSt.qr,
    precio: f.precio, fecha: new Date().toISOString(), estado: 'en fábrica',
  };
  DB.placas.push(spec);
  saveDB();
  descargarArchivo(`Especificacion_placa_${folio}.txt`,
`NAJ PIXAM — ESPECIFICACIÓN PARA FÁBRICA DE NICHOS Y TUMBAS
===========================================================
Folio:      ${folio}
Formato:    ${f.nombre} (${f.medidas})
Dedicada a: ${spec.nombre}
Fechas:     ${spec.fechas}
Texto:      "${spec.texto}"
Ornamento:  ${PLACA_ORNAMENTOS[spec.ornamento]}
Tipografía: ${spec.fuente === 'display' ? 'Lapidaria (Marcellus)' : 'Clásica (Cormorant)'}
QR:         ${spec.qr ? 'Sí — enlaza al memorial ' + (spec.memorial || '(por vincular)') : 'No'}
Precio:     ${MXN(f.precio)}
===========================================================
Conforme al reglamento del panteón: placa, florero y cruz
permitidos según medidas del formato.`);
  toast(`Especificación ${folio} enviada a la fábrica ✦`);
}

/* ============================================================
   VISTA: Florería (M9)
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
    <div class="tool" style="display:inline-flex;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:30px;gap:10px;align-items:center;box-shadow:var(--shadow)">
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
            <h3 style="font-size:17px">${p.nombre}</h3>
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
   VISTA: Mi cuenta (M5 + M3 + M4 + M8)
   ============================================================ */
let cuentaTab = 'espacios';

function viewCuenta() {
  if (!DB.user || DB.user.rol === 'admin') {
    return `<section class="section"><div class="container" style="max-width:560px">
      <div class="panel" style="text-align:center">
        <h2>Mi cuenta</h2>
        <p class="sub">Inicia sesión como titular o funeraria aliada para ver tus espacios, contratos, plan de pagos y familiares invitados.</p>
        <button class="btn btn-primary" onclick="modalLogin('#/cuenta')">Iniciar sesión</button>
      </div></div></section>${footerHTML()}`;
  }
  setTimeout(() => bindTabs('cuenta'), 0);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">${DB.user.rol === 'funeraria' ? 'Portal de aliados · funeraria' : 'Portal del titular'}</div>
    <h1>Hola, ${DB.user.nombre.split(' ')[0]}</h1>
    <p>${DB.user.rol === 'funeraria' ? `Compra a nombre de tus clientes con ${cfg('descFuneraria')}% de descuento de aliado.` : 'Administra tus espacios, contratos, plan de pagos, placas y los accesos de tu familia.'}</p>
  </div></div>
  <div class="container dash-layout">
    <nav class="dash-nav" id="tabs-cuenta">
      <button data-tab="espacios" class="${cuentaTab === 'espacios' ? 'active' : ''}">🌿 Mis espacios y pagos</button>
      <button data-tab="contratos" class="${cuentaTab === 'contratos' ? 'active' : ''}">📜 Contratos</button>
      <button data-tab="pagos" class="${cuentaTab === 'pagos' ? 'active' : ''}">💳 Recibos</button>
      <button data-tab="placas" class="${cuentaTab === 'placas' ? 'active' : ''}">✦ Mis placas</button>
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
        <p class="sub">Explora el mapa y adquiere una tumba o un nicho 100% en línea, de contado o financiado sin intereses.</p>
        <a class="btn btn-gold" href="#/mapa">Explorar el mapa</a></div>`;
    }
    return DB.compras.map(c => {
      const e = espacioById(c.espacioId); const sec = seccionById(e.seccion);
      const vencida = new Date(c.mantenimiento.proximaRenovacion) < new Date();
      const fin = c.pago.tipo === 'financiado' ? c.pago : null;
      const prog = fin ? Math.round((fin.pagadas / fin.plazo) * 100) : 100;
      return `<div class="card mis-espacios" style="margin-bottom:18px"><div class="esp">
        <img src="${sec.img}" alt="${sec.nombre}">
        <div>
          <h3>${LINEAS[e.linea].icon} ${TIPOS[e.tipo].nombre} ${e.id} · ${sec.nombre}</h3>
          <div class="meta">Fila ${e.fila}, Posición ${e.col} · Folio ${c.folio} · ${c.modalidad === 'necesidad' ? 'A necesidad' : 'Preventa'}${c.clienteFinal ? ' · Cliente: ' + c.clienteFinal : ''}</div>
          <div style="margin-top:8px">
            ${c.difunto ? `<span class="badge gold">🕊️ ${c.difunto.nombre}</span>` : '<span class="badge blue">Preventa / provisión</span>'}
            <span class="tag ${vencida ? 'vencido' : 'alcorriente'}" style="margin-left:6px">Mantenimiento ${vencida ? 'vencido' : 'al corriente'}</span>
            ${c.liquidado ? '<span class="tag liquidado" style="margin-left:6px">Liquidado · título disponible</span>' : ''}
          </div>
          ${fin ? `
          <div style="margin-top:10px;max-width:420px">
            <div class="meta">Plan de pagos: ${fin.pagadas} de ${fin.plazo} mensualidades de ${MXN(fin.mensualidad)} (sin intereses) · ${prog}%</div>
            <div class="progressbar"><i style="width:${prog}%"></i></div>
          </div>` : ''}
          <div class="meta" style="margin-top:6px">Renovación de mantenimiento: ${fmtFecha(c.mantenimiento.proximaRenovacion)} · ${MXN(mantDe(e))}/año</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <a class="btn btn-outline btn-sm" href="#/mapa?sel=${e.id}">Ver en mapa</a>
          ${c.memorialId ? `<a class="btn btn-primary btn-sm" href="#/memorial/${c.memorialId}">Memorial</a>
          <a class="btn btn-ghost btn-sm" href="#/placa?mem=${c.memorialId}">Diseñar placa ✦</a>` : ''}
          ${fin && !c.liquidado ? `<button class="btn btn-gold btn-sm" onclick="pagarMensualidad('${c.folio}')">Pagar mensualidad</button>` : ''}
          ${c.liquidado ? `<button class="btn btn-gold btn-sm" onclick="descargarTitulo('${c.folio}')">Título de derechos</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="renovarMantenimiento('${c.folio}')">Renovar mantenimiento</button>
        </div>
      </div></div>`;
    }).join('');
  }
  if (cuentaTab === 'contratos') {
    if (!DB.compras.length) return `<div class="panel"><p>No hay contratos aún. Los contratos de adhesión firmados aparecen aquí con su PDF resguardado.</p></div>`;
    return `<div class="table-wrap"><table class="data">
      <tr><th>Folio</th><th>Espacio</th><th>Firmado</th><th>Estado</th><th></th></tr>
      ${DB.compras.map(c => `<tr>
        <td><span class="folio">${c.contrato.folio}</span></td>
        <td>${c.espacioId}</td>
        <td>${new Date(c.contrato.fecha).toLocaleString('es-MX')}</td>
        <td><span class="tag vigente">vigente</span>${c.liquidado ? ' <span class="tag liquidado">liquidado</span>' : ''}</td>
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
  if (cuentaTab === 'placas') {
    return `<div class="panel">
      <h2 style="font-size:22px">Mis placas conmemorativas</h2>
      <p class="sub">Especificaciones enviadas a la fábrica de nichos y tumbas del panteón.</p>
      ${DB.placas.length ? `<div class="table-wrap"><table class="data">
        <tr><th>Folio</th><th>Formato</th><th>Dedicada a</th><th>Precio</th><th>Estado</th></tr>
        ${DB.placas.map(p => `<tr>
          <td><span class="folio">${p.folio}</span></td><td>${PLACA_FORMATOS[p.formato].nombre}</td>
          <td>${p.nombre}<br><span style="font-size:11.5px;color:var(--ink-3)">${p.fechas} · "${p.texto}"</span></td>
          <td>${MXN(p.precio)}</td><td><span class="tag apartado">${p.estado}</span></td>
        </tr>`).join('')}
      </table></div>` : '<p style="color:var(--ink-3);font-size:14px">Aún no has diseñado placas.</p>'}
      <a class="btn btn-primary" style="margin-top:16px" href="#/placa">Diseñar una placa ✦</a>
    </div>`;
  }
  if (cuentaTab === 'familia') {
    const c0 = DB.compras[0];
    return `<div class="panel">
      <h2 style="font-size:22px">Designaciones y familiares invitados</h2>
      <p class="sub">El titular sustituto y los beneficiarios provienen del contrato. Los familiares invitados solo pueden ver el memorial y enviar o donar flores; puedes revocar su acceso en cualquier momento.</p>
      ${c0 ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        ${c0.sustituto && c0.sustituto.nombre ? `<span class="badge blue">Titular sustituto: ${c0.sustituto.nombre} (${c0.sustituto.par || 's/p'})</span>` : '<span class="badge gold">Sin titular sustituto designado</span>'}
        ${[c0.ben1, c0.ben2].filter(b => b && b.nombre).map((b, i) => `<span class="badge green">Beneficiario ${i + 1}: ${b.nombre}</span>`).join('') || '<span class="badge gold">Sin beneficiarios designados</span>'}
      </div>` : ''}
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

function pagarMensualidad(folio) {
  const c = DB.compras.find(x => x.folio === folio);
  if (!c || c.pago.tipo !== 'financiado' || c.liquidado) return;
  c.pago.pagadas++;
  c.pagos.push({ concepto: `Mensualidad ${c.pago.pagadas}/${c.pago.plazo} · ${c.espacioId}`, monto: c.pago.mensualidad, fecha: new Date().toISOString(), metodo: 'Suscripción Stripe' });
  if (c.pago.pagadas >= c.pago.plazo) {
    c.liquidado = true;
    toast('¡Plan liquidado! Tu título de derechos ya está disponible 🎉');
  } else {
    toast(`Mensualidad ${c.pago.pagadas}/${c.pago.plazo} pagada ✓`);
  }
  saveDB();
  document.getElementById('tab-body').innerHTML = cuentaTabHTML();
}

function renovarMantenimiento(folio) {
  const c = DB.compras.find(x => x.folio === folio);
  if (!c) return;
  const e = espacioById(c.espacioId);
  const prox = new Date(c.mantenimiento.proximaRenovacion);
  prox.setFullYear(prox.getFullYear() + 1);
  c.mantenimiento.proximaRenovacion = prox.toISOString();
  c.mantenimiento.estado = 'al corriente';
  c.pagos.push({ concepto: `Mantenimiento anual ${c.espacioId} — renovación`, monto: mantDe(e), fecha: new Date().toISOString(), metodo: 'Suscripción Stripe' });
  saveDB();
  document.getElementById('tab-body').innerHTML = cuentaTabHTML();
  toast('Mantenimiento renovado un año más ✓');
}

function descargarRecibo(i) {
  const pagos = DB.compras.flatMap(c => c.pagos.map(p => ({ ...p, folio: c.folio })));
  const p = pagos[i];
  if (!p) return;
  descargarArchivo(`Recibo_${p.folio}_${i + 1}.txt`,
`NAJ PIXAM · CASA DEL ALMA — RECIBO DE PAGO
-------------------------------------------
Fecha:    ${new Date(p.fecha).toLocaleString('es-MX')}
Concepto: ${p.concepto}
Método:   ${p.metodo}
Monto:    ${MXN(p.monto)}
Folio de compra: ${p.folio}
-------------------------------------------
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
   VISTA: Administración (M10)
   ============================================================ */
let adminTab = 'dashboard';
const invFiltro = { seccion: '', estado: '' };

function viewAdmin() {
  if (!DB.user || DB.user.rol !== 'admin') {
    return `<section class="section"><div class="container" style="max-width:560px">
      <div class="panel" style="text-align:center">
        <h2>Panel administrativo</h2>
        <p class="sub">Acceso exclusivo del personal del panteón: inventario, precios, financiamiento, contratos, cobranza, aliados y reportes.</p>
        <button class="btn btn-primary" onclick="login('admin','Administración NAJ PIXAM','admin@najpixam.mx')">Entrar como administrador (demo)</button>
      </div></div></section>${footerHTML()}`;
  }
  setTimeout(() => bindTabs('admin'), 0);
  return `
  <div class="page-head"><div class="container">
    <div class="eyebrow">Panel administrativo · M10</div>
    <h1>Operación del panteón</h1>
    <p>Inventario sobre plano, configuración de precios y financiamiento, contratos, cobranza, aliados, fábrica y reportes.</p>
  </div></div>
  <div class="container dash-layout">
    <nav class="dash-nav" id="tabs-admin">
      <button data-tab="dashboard" class="${adminTab === 'dashboard' ? 'active' : ''}">📊 Dashboard</button>
      <button data-tab="inventario" class="${adminTab === 'inventario' ? 'active' : ''}">🗺️ Inventario</button>
      <button data-tab="config" class="${adminTab === 'config' ? 'active' : ''}">⚙️ Precios y financiamiento</button>
      <button data-tab="contratos" class="${adminTab === 'contratos' ? 'active' : ''}">📜 Contratos</button>
      <button data-tab="cobranza" class="${adminTab === 'cobranza' ? 'active' : ''}">💰 Cobranza</button>
      <button data-tab="aliados" class="${adminTab === 'aliados' ? 'active' : ''}">🤝 Funerarias y gobierno</button>
      <button data-tab="tienda" class="${adminTab === 'tienda' ? 'active' : ''}">🌹 Florería y fábrica</button>
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
  if (adminTab === 'config') return adminConfigHTML();
  if (adminTab === 'contratos') return adminContratosHTML();
  if (adminTab === 'cobranza') return adminCobranzaHTML();
  if (adminTab === 'aliados') return adminAliadosHTML();
  if (adminTab === 'tienda') return adminTiendaHTML();
  if (adminTab === 'reportes') return adminReportesHTML();
  return '';
}

function adminDashboardHTML() {
  const c = conteoEstados();
  const total = ESPACIOS.length;
  const ocupPct = Math.round(((c.ocupado + c.vendido) / total) * 100);
  const ventas12 = VENTAS_MES.reduce((a, v) => a + v.monto, 0) + DB.compras.reduce((a, x) => a + (x.desglose ? x.desglose.financiable : 0), 0);
  const vencidos = COBRANZA_SEED.filter(x => x.estado === 'vencido').length;
  const mantAnual = ESPACIOS.reduce((a, e) => a + (['ocupado', 'vendido'].includes(estadoDe(e)) ? mantDe(e) : 0), 0);
  const finActivos = DB.compras.filter(x => x.pago.tipo === 'financiado' && !x.liquidado).length;
  return `
  <div class="kpis">
    <div class="kpi"><div class="v">${ocupPct}%</div><div class="l">Ocupación total (${c.ocupado + c.vendido} de ${total} espacios)</div><span class="delta up">▲ 2.1 pts vs. trimestre anterior</span></div>
    <div class="kpi"><div class="v">${c.disponible}</div><div class="l">Espacios disponibles para venta</div></div>
    <div class="kpi"><div class="v">${MXN(ventas12).replace(' MXN', '')}</div><div class="l">Ventas últimos 12 meses (MXN)</div><span class="delta up">▲ 12% anual</span></div>
    <div class="kpi"><div class="v">${vencidos + finActivos}</div><div class="l">${vencidos} mantenimientos vencidos · ${finActivos} financiamientos activos</div><span class="delta down">Cobranza en seguimiento</span></div>
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
  </div>
  <div class="chart-card">
    <h3>Ventas por línea y segmento (12 meses)</h3>
    <div class="sub">Conforme al modelo de negocio: público, funerarias aliadas y gobierno</div>
    <div class="table-wrap" style="border:none"><table class="data">
      <tr><th>Línea</th><th>Público general</th><th>Funerarias</th><th>Gobierno</th><th>Total</th></tr>
      ${VENTAS_SEGMENTO.map(v => `<tr><td><b>${v.linea}</b></td><td>${MXN(v.publico)}</td><td>${MXN(v.funerarias)}</td><td>${MXN(v.gobierno)}</td><td><b>${MXN(v.publico + v.funerarias + v.gobierno)}</b></td></tr>`).join('')}
    </table></div>
  </div>`;
}

function chartVentasHTML() {
  const W = 720, H = 260, padL = 56, padB = 34, padT = 16;
  const max = 800000;
  const bw = (W - padL - 10) / VENTAS_MES.length;
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  const grid = [0, 200000, 400000, 600000, 800000].map(v =>
    `<line x1="${padL}" y1="${y(v)}" x2="${W - 6}" y2="${y(v)}" stroke="#efe8d4" stroke-width="1"/>
     <text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10.5" fill="#94886f">${v / 1000}k</text>`).join('');
  const maxIdx = VENTAS_MES.reduce((mi, v, i, a) => v.monto > a[mi].monto ? i : mi, 0);
  const bars = VENTAS_MES.map((v, i) => {
    const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
    const yy = y(v.monto);
    return `<path d="M${x} ${yy + 4} q0-4 4-4 h${w - 8} q4 0 4 4 V${H - padB} H${x} Z" fill="#52683f"
        class="bar-mes" data-tip="${v.mes}: ${MXN(v.monto)}"/>
      ${i === maxIdx ? `<text x="${x + w / 2}" y="${yy - 7}" text-anchor="middle" font-size="11" font-weight="600" fill="#5f5544">${MXN(v.monto).replace(' MXN', '')}</text>` : ''}
      <text x="${x + w / 2}" y="${H - padB + 16}" text-anchor="middle" font-size="10" fill="#94886f">${v.mes.split(' ')[0]}</text>`;
  }).join('');
  return `<div class="chart-card">
    <h3>Ventas de espacios por mes</h3>
    <div class="sub">Precio del espacio (tumbas y nichos), septiembre 2025 – agosto 2026 · pasa el cursor para ver el detalle</div>
    <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:560px" role="img" aria-label="Gráfica de barras de ventas mensuales">
      ${grid}${bars}
      <line x1="${padL}" y1="${H - padB}" x2="${W - 6}" y2="${H - padB}" stroke="#ddd2b2" stroke-width="1"/>
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
    <text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="30" fill="#3f5233" font-family="Marcellus, Georgia">${total}</text>
    <text x="${CX}" y="${CY + 18}" text-anchor="middle" font-size="11" fill="#94886f">espacios</text>
  </svg>`;
}

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
    <tr><th>Espacio</th><th>Línea</th><th>Atributo</th><th>Precio (editable)</th><th>Estado</th><th>Difunto</th></tr>
    ${filas.map(e => {
      const est = estadoDe(e); const mem = memorialDeEspacio(e.id); const sec = seccionById(e.seccion);
      return `<tr>
        <td><b>${e.id}</b> · F${e.fila}</td>
        <td>${LINEAS[e.linea].nombre}</td>
        <td>${sec.atributo}</td>
        <td><input type="number" value="${precioDe(e)}" data-precio="${e.id}" style="width:110px;border:1px solid var(--line);border-radius:8px;padding:6px 8px"></td>
        <td><select data-estado="${e.id}" style="border:1px solid var(--line);border-radius:8px;padding:6px 8px">
          ${Object.entries(ST_LABEL).map(([k, l]) => `<option value="${k}" ${est === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></td>
        <td>${mem ? mem.nombre : '<span style="color:var(--ink-3)">—</span>'}</td>
      </tr>`;
    }).join('')}
  </table></div>`;
}

function adminConfigHTML() {
  const campos = [
    ['excavacion', 'Excavación (tumba) MXN'], ['mantTumba', 'Mantenimiento anual tumba MXN'], ['mantNicho', 'Mantenimiento anual nicho MXN'],
    ['ivaPct', 'IVA %'], ['derechosMunicipales', 'Derechos municipales MXN'], ['registroCivil', 'Registro Civil MXN'],
    ['maniobras', 'Maniobras de inhumación MXN'], ['aperturaCierreNicho', 'Apertura/cierre de nicho MXN'],
    ['engancheMin', 'Enganche mínimo %'], ['descFuneraria', 'Descuento funerarias %'], ['vigenciaAnios', 'Vigencia (años)'],
  ];
  return `<div class="panel">
    <h2 style="font-size:22px">Parámetros de precio y financiamiento</h2>
    <p class="sub">Todos los conceptos del modelo de negocio son configurables (requerimiento §3). Los cambios aplican de inmediato en fichas, wizard y contratos.</p>
    <div class="config-grid">
      ${campos.map(([k, l]) => `<div class="field"><label>${l}</label>
        <input type="number" data-cfg="${k}" value="${cfg(k)}" style="font-variant-numeric:tabular-nums"></div>`).join('')}
    </div>
    <p style="font-size:12.5px;color:var(--ink-3);margin-top:16px">Plazos de financiamiento vigentes: ${cfg('plazos').join(' / ')} mensualidades, sin intereses (el contrato registra precio fijo).</p>
  </div>`;
}

function adminContratosHTML() {
  const propios = DB.compras.map(c => ({ folio: c.contrato.folio, titular: c.titular.nombre, espacio: c.espacioId, fecha: c.contrato.fecha.slice(0, 10), estado: 'vigente', compra: c.folio, liq: c.liquidado }));
  const todos = CONTRATOS_SEED.concat(propios);
  return `<div class="table-wrap"><table class="data">
    <tr><th>Folio</th><th>Titular</th><th>Espacio</th><th>Fecha de firma</th><th>Estado</th><th></th></tr>
    ${todos.map(c => `<tr>
      <td><span class="folio">${c.folio}</span></td><td>${c.titular}</td><td>${c.espacio}</td>
      <td>${fmtFecha(c.fecha)}</td><td><span class="tag ${c.estado}">${c.estado}</span>${c.liq ? ' <span class="tag liquidado">liquidado</span>' : ''}</td>
      <td>${c.compra ? `<button class="btn btn-outline btn-sm" onclick="verContrato('${c.compra}')">Ver PDF</button>` : '<span style="font-size:12px;color:var(--ink-3)">Archivo digitalizado</span>'}</td>
    </tr>`).join('')}
  </table></div>`;
}

function adminCobranzaHTML() {
  const propias = DB.compras.map(c => {
    const e = espacioById(c.espacioId);
    return { titular: c.titular.nombre, espacio: c.espacioId, vence: c.mantenimiento.proximaRenovacion.slice(0, 10), monto: mantDe(e), estado: new Date(c.mantenimiento.proximaRenovacion) < new Date() ? 'vencido' : 'al corriente', email: c.titular.email };
  });
  const todas = COBRANZA_SEED.concat(propias);
  const vencidas = todas.filter(x => x.estado === 'vencido');
  const fin = DB.compras.filter(c => c.pago.tipo === 'financiado' && !c.liquidado);
  return `
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="v">${todas.length}</div><div class="l">Suscripciones de mantenimiento activas</div></div>
    <div class="kpi"><div class="v">${vencidas.length}</div><div class="l">Cuentas vencidas</div></div>
    <div class="kpi"><div class="v">${fin.length}</div><div class="l">Planes de financiamiento en curso</div></div>
  </div>
  ${fin.length ? `<div class="chart-card"><h3>Financiamientos en curso</h3>
  <div class="table-wrap" style="border:none"><table class="data">
    <tr><th>Titular</th><th>Espacio</th><th>Plan</th><th>Avance</th></tr>
    ${fin.map(c => `<tr><td>${c.titular.nombre}</td><td>${c.espacioId}</td>
      <td>${c.pago.plazo} × ${MXN(c.pago.mensualidad)} · enganche ${c.pago.engPct}%</td>
      <td>${c.pago.pagadas}/${c.pago.plazo} pagadas</td></tr>`).join('')}
  </table></div></div>` : ''}
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

function adminAliadosHTML() {
  return `
  <div class="chart-card"><h3>Funerarias aliadas</h3>
  <div class="sub">Acceso especial con ${cfg('descFuneraria')}% de descuento; compran a nombre de su cliente final (nicho tras cremación o tumba con cuerpo presente).</div>
  <div class="table-wrap" style="border:none"><table class="data">
    <tr><th>Funeraria</th><th>Contacto</th><th>Compras acumuladas</th><th>Descuento</th><th></th></tr>
    ${FUNERARIAS_SEED.map(f => `<tr><td><b>${f.nombre}</b></td><td>${f.contacto}</td><td>${f.compras}</td>
      <td><span class="badge gold">−${f.desc}%</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="toast('Demo: estado de cuenta enviado a ${f.contacto}')">Estado de cuenta</button></td></tr>`).join('')}
  </table></div></div>
  <div class="panel">
    <h3 style="font-size:19px;color:var(--jungle);margin-bottom:8px">Esquema de gobierno</h3>
    <p style="font-size:14px;color:var(--ink-2)">Los convenios institucionales operan como esquema separado con condiciones y precios propios (requerimiento §3). Se gestionan directamente con la administración y se reflejan en los reportes por segmento.</p>
    <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="toast('Demo: solicitud de convenio registrada')">Registrar convenio</button>
  </div>`;
}

function adminTiendaHTML() {
  const pedidos = PEDIDOS_SEED.concat(DB.pedidos);
  return `
  <div class="chart-card"><h3>Catálogo de la florería</h3><div class="sub">${PRODUCTOS.length} productos activos</div>
  <div class="table-wrap" style="border:none"><table class="data">
    <tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Inventario</th></tr>
    ${PRODUCTOS.map(p => `<tr>
      <td><img src="${p.img}" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:cover"></td>
      <td><b>${p.nombre}</b></td><td>${p.cat}</td><td>${MXN(p.precio)}</td>
      <td><span class="badge green">En stock</span></td>
    </tr>`).join('')}
  </table></div></div>
  <div class="chart-card"><h3>Pedidos de flores</h3><div class="sub">Entregas en los espacios con notificación a la familia</div>
  <div class="table-wrap" style="border:none"><table class="data">
    <tr><th>Folio</th><th>Producto</th><th>Dedicado a</th><th>De parte de</th><th>Fecha</th><th>Estado</th></tr>
    ${pedidos.map(p => { const prod = productoById(p.producto); const m = memorialById(p.destino); return `<tr>
      <td><span class="folio">${p.folio}</span></td><td>${prod.nombre}</td><td>${m ? m.nombre : p.destino}</td>
      <td>${p.de}</td><td>${fmtFecha(p.fecha)}</td>
      <td><span class="tag ${p.estado === 'entregado' ? 'alcorriente' : 'apartado'}">${p.estado}</span></td>
    </tr>`; }).join('')}
  </table></div></div>
  <div class="chart-card"><h3>Fábrica de placas (M8)</h3><div class="sub">Especificaciones recibidas desde el diseñador de placa</div>
  ${DB.placas.length ? `<div class="table-wrap" style="border:none"><table class="data">
    <tr><th>Folio</th><th>Formato</th><th>Dedicada a</th><th>Texto</th><th>Precio</th><th>Estado</th></tr>
    ${DB.placas.map(p => `<tr><td><span class="folio">${p.folio}</span></td><td>${PLACA_FORMATOS[p.formato].nombre}</td>
      <td>${p.nombre} (${p.fechas})</td><td>"${p.texto}"</td><td>${MXN(p.precio)}</td>
      <td><span class="tag apartado">${p.estado}</span></td></tr>`).join('')}
  </table></div>` : '<p style="font-size:13.5px;color:var(--ink-3)">Sin especificaciones pendientes. Las placas diseñadas por los titulares aparecen aquí.</p>'}
  </div>`;
}

function adminReportesHTML() {
  return `<div class="panel">
    <h2 style="font-size:22px">Exportar reportes</h2>
    <p class="sub">Ocupación, ventas por línea y segmento, ingresos por mantenimiento y financiamiento (requerimiento M10).</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="exportCSV('inventario')">⬇ Inventario de espacios</button>
      <button class="btn btn-primary" onclick="exportCSV('cobranza')">⬇ Cobranza de mantenimiento</button>
      <button class="btn btn-primary" onclick="exportCSV('ventas')">⬇ Ventas por mes</button>
      <button class="btn btn-primary" onclick="exportCSV('segmentos')">⬇ Ventas por línea y segmento</button>
    </div>
  </div>`;
}

function exportCSV(cual) {
  let csv = '';
  if (cual === 'inventario') {
    csv = 'espacio,seccion,linea,tipo,atributo,fila,posicion,estado,precio_mxn,difunto\n' + ESPACIOS.map(e => {
      const m = memorialDeEspacio(e.id); const s = seccionById(e.seccion);
      return [e.id, e.seccion, e.linea, e.tipo, `"${s.atributo}"`, e.fila, e.col, estadoDe(e), precioDe(e), m ? `"${m.nombre}"` : ''].join(',');
    }).join('\n');
  }
  if (cual === 'cobranza') {
    csv = 'titular,espacio,vence,cuota_mxn,estatus\n' + COBRANZA_SEED.map(x => [`"${x.titular}"`, x.espacio, x.vence, x.monto, x.estado].join(',')).join('\n');
  }
  if (cual === 'ventas') {
    csv = 'mes,ventas_mxn\n' + VENTAS_MES.map(v => [v.mes, v.monto].join(',')).join('\n');
  }
  if (cual === 'segmentos') {
    csv = 'linea,publico_mxn,funerarias_mxn,gobierno_mxn\n' + VENTAS_SEGMENTO.map(v => [v.linea, v.publico, v.funerarias, v.gobierno].join(',')).join('\n');
  }
  descargarArchivo(`reporte_${cual}_najpixam.csv`, csv, 'text/csv;charset=utf-8');
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
  document.querySelectorAll('[data-cfg]').forEach(inp => inp.onchange = () => {
    DB.config[inp.dataset.cfg] = +inp.value;
    saveDB();
    toast(`Parámetro actualizado: ${inp.dataset.cfg} = ${inp.value}`);
  });
  const s = document.getElementById('inv-sec'), e2 = document.getElementById('inv-est');
  if (s) s.onchange = () => { invFiltro.seccion = s.value; document.getElementById('tab-body').innerHTML = adminTabHTML(); bindAdminBody(); };
  if (e2) e2.onchange = () => { invFiltro.estado = e2.value; document.getElementById('tab-body').innerHTML = adminTabHTML(); bindAdminBody(); };
}

/* tooltip flotante de gráficas */
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
  [/^#\/placa/, p => viewPlaca(p)],
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
