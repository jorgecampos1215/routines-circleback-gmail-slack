/* ============================================================
   Datos y estado — NAJ PIXAM · Casa del Alma (demo funcional)
   Kanasín, Yucatán · Renders reales del proyecto arquitectónico
   (Ricardo Yslas Gámez Arquitectos) servidos como assets locales.
   ============================================================ */

const IMG = {
  acceso:          'assets/img/acceso.jpg',
  porticoAcceso:   'assets/img/portico-acceso.jpg',
  camposanto:      'assets/img/camposanto-velaria.jpg',
  capillaInterior: 'assets/img/capilla-interior.jpg',
  flamboyan:       'assets/img/flamboyan.jpg',
  andadores:       'assets/img/andadores.jpg',
  capilla:         'assets/img/capilla.jpg',
  nichosTechados:  'assets/img/nichos-techados.jpg',
  velatorios:      'assets/img/velatorios.jpg',
  portico:         'assets/img/portico.jpg',
  nichosJardin:    'assets/img/nichos-jardin.jpg',
  criptasAereo:    'assets/img/criptas-aereo.jpg',
  explanada:       'assets/img/explanada.jpg',
  criptasCalles:   'assets/img/criptas-calles.jpg',
  nichosFam:       'assets/img/nichos-familiares.jpg',
  conjunto:        'assets/img/conjunto-aereo.jpg',
  aereo:           'assets/img/aereo-franja.jpg',
  masterplan:      'assets/img/masterplan.jpg',
};

/* flores frescas (fotos propias del cliente, assets locales) */
const IMGF = {
  rosasBlancas: 'assets/img/flores/rosas-blancas.jpg',
  floresMix:    'assets/img/flores/corona-funebre.jpg',
  floresRosa:   'assets/img/flores/arreglo-primaveral.jpg',
  floresCampo:  'assets/img/flores/tapete-floral.jpg',
};

/* ---------- utilidades ---------- */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MXN = n => '$' + Math.round(n).toLocaleString('es-MX') + ' MXN';
const fmtFecha = d => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

/* ---------- líneas de servicio ---------- */
const LINEAS = {
  tumba: { nombre: 'Tumba', desc: 'Inhumación de cuerpo. El precio depende de la ubicación (sección); la excavación se cobra aparte.', icon: '⚱️' },
  nicho: { nombre: 'Nicho', desc: 'Para restos cremados (cenizas). El precio depende de si el nicho es techado o no techado.', icon: '🕊️' },
};

const TIPOS = {
  lote:   { nombre: 'Lote de campo santo', linea: 'tumba' },
  cripta: { nombre: 'Cripta',              linea: 'tumba' },
  gaveta: { nombre: 'Gaveta',              linea: 'tumba' },
  nicho:  { nombre: 'Nicho',               linea: 'nicho' },
};

/* ---------- configuración operable desde el panel (M10) ---------- */
const CONFIG_BASE = {
  excavacion: 8500,            // tumba, concepto aparte
  mantTumba: 3200,             // cuota anual
  mantNicho: 1800,
  ivaPct: 16,                  // extras normativos por cuenta del consumidor
  derechosMunicipales: 1250,   // Reglamento de Panteones de Kanasín
  registroCivil: 420,
  maniobras: 2800,             // inhumación (a necesidad)
  aperturaCierreNicho: 950,    // por resguardo/retiro de urna
  engancheMin: 30,             // % mínimo de pago inicial en financiamiento
  plazos: [6, 12, 18, 24],     // mensualidades sin intereses (precio fijo, cláusula tercera)
  descFuneraria: 12,           // % descuento aliado
  vigenciaAnios: 30,           // temporalidad del derecho de uso
};

/* ---------- secciones del plano (M1) ---------- */
const SECCIONES = [
  { id: 'A', nombre: 'Campo Santo · Sección Capilla', tipo: 'lote',   atributo: 'Sección Capilla', base: 95000,  x: 60,  y: 122, cols: 12, rows: 5, cw: 34, ch: 36, ocup: .40, apart: .05, img: IMG.camposanto },
  { id: 'B', nombre: 'Campo Santo · Sección Jardín',  tipo: 'lote',   atributo: 'Sección Jardín',  base: 72000,  x: 60,  y: 388, cols: 12, rows: 5, cw: 34, ch: 36, ocup: .55, apart: .05, img: IMG.explanada },
  { id: 'C', nombre: 'Criptas · Paseo Central',       tipo: 'cripta', atributo: 'Paseo Central',   base: 148000, x: 60,  y: 656, cols: 10, rows: 4, cw: 41, ch: 42, ocup: .34, apart: .06, img: IMG.criptasCalles },
  { id: 'D', nombre: 'Criptas · Andador Norte',       tipo: 'cripta', atributo: 'Andador Norte',   base: 132000, x: 620, y: 668, cols: 9,  rows: 4, cw: 35, ch: 36, ocup: .46, apart: .04, img: IMG.criptasAereo },
  { id: 'E', nombre: 'Nichos Techados · Muro de la Capilla', tipo: 'nicho', atributo: 'Techado',   base: 38000,  x: 620, y: 122, cols: 16, rows: 5, cw: 18, ch: 20, ocup: .52, apart: .05, img: IMG.nichosTechados },
  { id: 'F', nombre: 'Nichos Jardín · No techados',   tipo: 'nicho',  atributo: 'No techado',      base: 26000,  x: 968, y: 122, cols: 12, rows: 5, cw: 18, ch: 20, ocup: .58, apart: .04, img: IMG.nichosJardin },
  { id: 'G', nombre: 'Nichos Familiares',             tipo: 'nicho',  atributo: 'Familiar techado', base: 64000, x: 1000, y: 668, cols: 8, rows: 4, cw: 27, ch: 29, ocup: .38, apart: .05, img: IMG.nichosFam },
];

/* ---------- generación determinista de espacios ---------- */
const ESPACIOS = [];
(function generarEspacios() {
  SECCIONES.forEach((sec, si) => {
    const rnd = mulberry32(2200 + si * 131);
    for (let r = 0; r < sec.rows; r++) {
      for (let c = 0; c < sec.cols; c++) {
        const i = r * sec.cols + c;
        const roll = rnd();
        let estado = 'disponible';
        if (roll < sec.ocup) estado = 'ocupado';
        else if (roll < sec.ocup + sec.apart) estado = 'apartado';
        const precio = Math.round((sec.base * (0.94 + rnd() * 0.12)) / 500) * 500;
        ESPACIOS.push({
          id: `${sec.id}-${String(i + 1).padStart(2, '0')}`,
          seccion: sec.id, tipo: sec.tipo, linea: TIPOS[sec.tipo].linea,
          fila: r + 1, col: c + 1, estado, precio,
          x: sec.x + c * (sec.cw + 4), y: sec.y + r * (sec.ch + 4), w: sec.cw, h: sec.ch,
        });
      }
    }
  });
})();

const espacioById = id => ESPACIOS.find(e => e.id === id);
const seccionById = id => SECCIONES.find(s => s.id === id);

/* ---------- memoriales (M7) ---------- */
const MEMORIALES_SEED = [
  {
    id: 'mem-01', titularEmail: 'mf.alvarez@example.com', nombre: 'Don Rodrigo Álvarez Peón', nac: '1938-03-11', def: '2021-11-02',
    foto: null, cover: IMG.camposanto, publico: true, espacio: 'A-03',
    epitafio: 'Sembró ceibas sabiendo que no descansaría bajo su sombra.',
    mensajes: [
      { autor: 'Familia Álvarez Rivas', fecha: '2026-08-02', texto: 'Abuelo, tus historias siguen contándose en cada sobremesa. Te recordamos con inmenso cariño.' },
      { autor: 'Ing. Manuel Cetina', fecha: '2026-07-14', texto: 'Fue un honor trabajar a su lado durante 30 años. Un caballero de otra época.' },
    ],
    flores: [ { producto: 'p1', de: 'María Álvarez', fecha: '2026-08-10' }, { producto: 'p5', de: 'Familia Cetina', fecha: '2026-07-30' } ],
  },
  {
    id: 'mem-02', titularEmail: 'c.rivas@example.com', nombre: 'Sra. Guadalupe Rivas de Álvarez', nac: '1942-12-08', def: '2023-05-19',
    foto: null, cover: IMG.flamboyan, publico: true, espacio: 'A-04',
    epitafio: 'Su cocina olía a hogar; su abrazo, a domingo por la tarde.',
    mensajes: [ { autor: 'Sus nietos', fecha: '2026-05-19', texto: 'Tres años sin ti, abuela Lupita. Hoy hicimos tu receta de cochinita y brindamos en tu honor.' } ],
    flores: [ { producto: 'p3', de: 'Carmen Rivas', fecha: '2026-08-01' } ],
  },
  {
    id: 'mem-03', titularEmail: 'r.may@example.com', nombre: 'Prof. Ernesto Canul May', nac: '1951-06-27', def: '2024-02-14',
    foto: null, cover: IMG.andadores, publico: true, espacio: 'B-07',
    epitafio: 'Enseñó a leer a tres generaciones de un mismo pueblo.',
    mensajes: [
      { autor: 'Generación 1989 — Esc. Benito Juárez', fecha: '2026-06-30', texto: 'Maestro: todo lo que somos empezó en su salón. Gracias por siempre.' },
      { autor: 'Rosario May', fecha: '2026-04-12', texto: 'Hermano querido, tu luz sigue encendida.' },
    ],
    flores: [ { producto: 'p2', de: 'Exalumnos Benito Juárez', fecha: '2026-06-30' } ],
  },
  {
    id: 'mem-04', titularEmail: 'l.solis@example.com', nombre: 'Sra. Beatriz Solís Manzanero', nac: '1946-09-03', def: '2022-08-27',
    foto: null, cover: IMG.nichosJardin, publico: true, espacio: 'F-15',
    epitafio: 'Bordaba pájaros porque decía que así aprendían a volar.',
    mensajes: [ { autor: 'Talleres de bordado Xocén', fecha: '2026-08-27', texto: 'Cada puntada nuestra lleva su nombre.' } ],
    flores: [ { producto: 'p7', de: 'Lucía Solís', fecha: '2026-08-15' } ],
  },
  {
    id: 'mem-05', titularEmail: 'a.escalante@example.com', nombre: 'Dr. Fernando Escalante Bolio', nac: '1935-01-22', def: '2019-10-05',
    foto: null, cover: IMG.capillaInterior, publico: true, espacio: 'C-05',
    epitafio: 'Curó cuerpos; acompañó almas.',
    mensajes: [ { autor: 'Colegio Médico de Yucatán', fecha: '2026-10-05', texto: 'En memoria de un médico que nunca negó una consulta.' } ],
    flores: [],
  },
  {
    id: 'mem-06', titularEmail: 'j.pech@example.com', nombre: 'Srita. Amelia Pech Cauich', nac: '1958-04-15', def: '2025-12-24',
    foto: null, cover: IMG.capilla, publico: true, espacio: 'E-12',
    epitafio: 'Se fue en Nochebuena, como quien no quiere perderse la fiesta del cielo.',
    mensajes: [ { autor: 'Coro de la Parroquia', fecha: '2026-01-06', texto: 'Tu voz de soprano ya canta en otro coro. Te extrañamos, Meli.' } ],
    flores: [ { producto: 'p1', de: 'Coro de la Parroquia', fecha: '2026-07-24' }, { producto: 'p4', de: 'Jorge Pech', fecha: '2026-06-24' } ],
  },
];
MEMORIALES_SEED.forEach(m => { const e = espacioById(m.espacio); if (e) e.estado = 'ocupado'; });

/* ---------- florería y productos (M9) ---------- */
const PRODUCTOS = [
  { id: 'p1', nombre: 'Ramo de rosas blancas', precio: 650,  img: IMGF.rosasBlancas, desc: '24 rosas blancas de invernadero yucateco, listón de seda y tarjeta manuscrita.', cat: 'Flores' },
  { id: 'p2', nombre: 'Corona fúnebre clásica', precio: 1850, img: IMGF.floresMix,   desc: 'Corona de flores mixtas de temporada montada en caballete, con cinta personalizada.', cat: 'Flores' },
  { id: 'p3', nombre: 'Arreglo primaveral', precio: 780,  img: IMGF.floresRosa,      desc: 'Arreglo fresco en tonos rosa y blanco, colocado directamente en el espacio.', cat: 'Flores' },
  { id: 'p4', nombre: 'Tapete floral de temporada', precio: 1200, img: IMGF.floresCampo, desc: 'Cobertura floral instalada por el equipo de jardinería del panteón.', cat: 'Flores' },
  { id: 'p5', nombre: 'Veladora perpetua (30 días)', precio: 320, img: IMG.capillaInterior, desc: 'Veladora en la capilla con reposición garantizada durante 30 días.', cat: 'Recordatorios' },
  { id: 'p6', nombre: 'Flamboyán conmemorativo', precio: 2400, img: IMG.flamboyan,   desc: 'Plantación de un flamboyán nativo en los jardines con placa grabada.', cat: 'Recordatorios' },
  { id: 'p7', nombre: 'Ofrenda del andador', precio: 540,  img: IMG.andadores,       desc: 'Flores de temporada colocadas cada semana durante un mes en el andador del espacio.', cat: 'Recordatorios' },
  { id: 'p8', nombre: 'Luz del atardecer · donativo', precio: 250, img: IMG.nichosJardin, desc: 'Donativo para el mantenimiento de los jardines, dedicado a la memoria del difunto.', cat: 'Donativos' },
];
const productoById = id => PRODUCTOS.find(p => p.id === id);
const prodImg = p => (DB.productoImgs && DB.productoImgs[p.id]) || p.img;

/* ---------- diseñador de placa (M8): formatos del reglamento ---------- */
const PLACA_FORMATOS = {
  'lapida-caliza': { nombre: 'Lápida de piedra caliza', linea: 'tumba', medidas: '60 × 40 cm', precio: 4800,
    desc: 'Tallada en caliza local. Incluye florero y cruz permitidos por el reglamento.', fondo: '#d8cdb4', tinta: '#5a4f3c' },
  'placa-bronce':  { nombre: 'Placa de bronce', linea: 'nicho', medidas: '30 × 20 cm', precio: 3200,
    desc: 'Fundida en bronce con acabado envejecido, para nichos individuales.', fondo: '#8a6a3a', tinta: '#f3e8c8' },
  'placa-familiar': { nombre: 'Placa familiar de caliza', linea: 'nicho', medidas: '45 × 30 cm', precio: 5400,
    desc: 'Para nichos familiares; admite hasta cuatro nombres.', fondo: '#cfc3a6', tinta: '#4c4232' },
};
const PLACA_ORNAMENTOS = { ninguno: 'Sin ornamento', cruz: 'Cruz', flor: 'Flor de mayo', paloma: 'Paloma' };

/* ---------- datos operativos del panel (semilla) ---------- */
const VENTAS_MES = [
  { mes: 'Sep 25', monto: 412000 }, { mes: 'Oct 25', monto: 486000 }, { mes: 'Nov 25', monto: 705000 },
  { mes: 'Dic 25', monto: 638000 }, { mes: 'Ene 26', monto: 391000 }, { mes: 'Feb 26', monto: 452000 },
  { mes: 'Mar 26', monto: 528000 }, { mes: 'Abr 26', monto: 497000 }, { mes: 'May 26', monto: 561000 },
  { mes: 'Jun 26', monto: 604000 }, { mes: 'Jul 26', monto: 673000 }, { mes: 'Ago 26', monto: 719000 },
];
const VENTAS_SEGMENTO = [
  { linea: 'Tumba', publico: 3120000, funerarias: 940000, gobierno: 410000 },
  { linea: 'Nicho', publico: 1480000, funerarias: 620000, gobierno: 96000 },
];

const COBRANZA_SEED = [
  { titular: 'María Fernanda Álvarez Rivas', espacio: 'A-03', vence: '2026-11-02', monto: 3200, estado: 'al corriente', email: 'mf.alvarez@example.com' },
  { titular: 'Carmen Rivas Domínguez',       espacio: 'A-04', vence: '2026-05-19', monto: 3200, estado: 'vencido',      email: 'c.rivas@example.com' },
  { titular: 'Rosario May Canul',            espacio: 'B-07', vence: '2027-02-14', monto: 3200, estado: 'al corriente', email: 'r.may@example.com' },
  { titular: 'Lucía Solís Manzanero',        espacio: 'F-15', vence: '2026-08-27', monto: 1800, estado: 'vencido',      email: 'l.solis@example.com' },
  { titular: 'Alberto Escalante Ruz',        espacio: 'C-05', vence: '2026-10-05', monto: 3200, estado: 'al corriente', email: 'a.escalante@example.com' },
  { titular: 'Jorge Pech Cauich',            espacio: 'E-12', vence: '2026-12-24', monto: 1800, estado: 'al corriente', email: 'j.pech@example.com' },
];

const CONTRATOS_SEED = [
  { folio: 'NP-2025-0142', titular: 'Alberto Escalante Ruz', espacio: 'C-05', fecha: '2025-10-08', estado: 'vigente' },
  { folio: 'NP-2025-0388', titular: 'María Fernanda Álvarez Rivas', espacio: 'A-03', fecha: '2025-11-04', estado: 'vigente' },
  { folio: 'NP-2026-0451', titular: 'Lucía Solís Manzanero', espacio: 'F-15', fecha: '2026-01-29', estado: 'vigente' },
  { folio: 'NP-2026-0517', titular: 'Carmen Rivas Domínguez', espacio: 'A-04', fecha: '2026-02-21', estado: 'vigente' },
  { folio: 'NP-2026-0609', titular: 'Rosario May Canul', espacio: 'B-07', fecha: '2026-03-16', estado: 'vigente' },
  { folio: 'NP-2026-0733', titular: 'Jorge Pech Cauich', espacio: 'E-12', fecha: '2026-05-27', estado: 'vigente' },
];

const FUNERARIAS_SEED = [
  { nombre: 'Funeraria La Paz de Kanasín', contacto: 'ventas@lapazkanasin.mx', compras: 14, desc: 12 },
  { nombre: 'Grupo Funerario Montejo', contacto: 'alianzas@gfmontejo.mx', compras: 9, desc: 12 },
  { nombre: 'Servicios Funerarios del Mayab', contacto: 'direccion@sfmayab.mx', compras: 5, desc: 10 },
];

const CONVENIOS_SEED = [
  { dependencia: 'DIF Municipal de Kanasín', contacto: 'convenios@kanasin.gob.mx', desc: 20, condiciones: 'Espacios de campo santo sección Jardín; hasta 40 espacios anuales', desde: '2026-03-01', estado: 'activo' },
];

const PEDIDOS_SEED = [
  { folio: 'PD-1041', producto: 'p1', destino: 'mem-06', de: 'Coro de la Parroquia', fecha: '2026-07-24', estado: 'entregado' },
  { folio: 'PD-1057', producto: 'p3', destino: 'mem-02', de: 'Carmen Rivas', fecha: '2026-08-01', estado: 'entregado' },
  { folio: 'PD-1063', producto: 'p5', destino: 'mem-01', de: 'Familia Cetina', fecha: '2026-07-30', estado: 'entregado' },
  { folio: 'PD-1071', producto: 'p7', destino: 'mem-04', de: 'Lucía Solís', fecha: '2026-08-15', estado: 'en preparación' },
];

/* ============================================================
   Estado persistente
   ============================================================ */
const DB_KEY = 'najpixam_demo_v1';
const DB = Object.assign({
  user: null,                 // { nombre, email, rol: 'titular'|'admin'|'funeraria' }
  compras: [],
  overrides: {},              // { espacioId: estado }
  precioOverrides: {},        // { espacioId: precio }
  config: {},                 // overrides de CONFIG_BASE (M10)
  invitados: [],
  pedidos: [],
  placas: [],                 // especificaciones enviadas a fábrica (M8)
  productoImgs: {},           // fotos personalizadas del catálogo { productoId: dataURI }
  funerarias: [],             // funerarias aliadas dadas de alta desde el panel (M6)
  funerariaDesc: {},          // override de descuento por nombre de funeraria
  convenios: [],              // convenios de gobierno dados de alta (M6)
  mensajesExtra: {},
  floresExtra: {},
  memorialesNuevos: [],
  carrito: [],
  reserva: null,
}, JSON.parse(localStorage.getItem(DB_KEY) || '{}'));

function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }

const cfg = k => (DB.config[k] !== undefined ? DB.config[k] : CONFIG_BASE[k]);
function estadoDe(esp) { return DB.overrides[esp.id] || esp.estado; }
function precioDe(esp) { return DB.precioOverrides[esp.id] || esp.precio; }
function mantDe(esp) { return esp.linea === 'tumba' ? cfg('mantTumba') : cfg('mantNicho'); }

function todosMemoriales() { return MEMORIALES_SEED.concat(DB.memorialesNuevos); }

/* Privacidad (M9): las flores solo las compran familiares autorizados.
   Cada usuario ve únicamente los difuntos que le corresponden. */
function memorialesAutorizados() {
  if (!DB.user) return [];
  if (DB.user.rol === 'admin') return todosMemoriales();
  if (DB.user.rol === 'familiar') {
    return todosMemoriales().filter(m => (DB.user.memoriales || []).includes(m.id));
  }
  const email = (DB.user.email || '').toLowerCase();
  const propios = DB.compras.filter(c => c.memorialId).map(c => memorialById(c.memorialId)).filter(Boolean);
  const semilla = MEMORIALES_SEED.filter(m => m.titularEmail && m.titularEmail.toLowerCase() === email);
  return [...new Map(semilla.concat(propios).map(m => [m.id, m])).values()];
}
function puedeEnviarFlores(memId) { return memorialesAutorizados().some(m => m.id === memId); }
function memorialById(id) { return todosMemoriales().find(m => m.id === id); }
function memorialDeEspacio(espId) { return todosMemoriales().find(m => m.espacio === espId); }
function mensajesDe(m) { return (m.mensajes || []).concat(DB.mensajesExtra[m.id] || []); }
function floresDe(m) { return (m.flores || []).concat(DB.floresExtra[m.id] || []); }

/* aliados y convenios (M6) */
function funerariasTodas() {
  return FUNERARIAS_SEED.map(f => ({ ...f, desc: DB.funerariaDesc[f.nombre] !== undefined ? DB.funerariaDesc[f.nombre] : f.desc }))
    .concat(DB.funerarias);
}
function conveniosTodos() { return CONVENIOS_SEED.concat(DB.convenios); }

/* % de descuento del usuario en sesión según su segmento */
function pctDescuentoUsuario() {
  if (!DB.user) return 0;
  if (DB.user.rol === 'funeraria') {
    const f = funerariasTodas().find(x => x.nombre === DB.user.nombre);
    return f ? f.desc : cfg('descFuneraria');
  }
  if (DB.user.rol === 'gobierno') {
    const c = conveniosTodos().find(x => x.dependencia === DB.user.nombre && x.estado === 'activo');
    return c ? c.desc : 0;
  }
  return 0;
}

/* desglose de precio (M2/M4): modalidad 'necesidad' | 'prevision' */
function desglose(esp, modalidad, rol) {
  const precioEspacio = precioDe(esp);
  const pct = (rol === 'funeraria' || rol === 'gobierno') ? pctDescuentoUsuario() : 0;
  const descuento = Math.round(precioEspacio * pct / 100);
  const excavacion = (esp.linea === 'tumba' && modalidad === 'necesidad') ? cfg('excavacion') : 0;
  const maniobras = modalidad === 'necesidad' ? cfg('maniobras') : 0;
  const subtotal = precioEspacio - descuento + excavacion;
  const iva = Math.round(subtotal * cfg('ivaPct') / 100);
  const derechos = cfg('derechosMunicipales');
  const registro = modalidad === 'necesidad' ? cfg('registroCivil') : 0;
  const mant = mantDe(esp);
  return {
    precioEspacio, descuento, excavacion, maniobras, iva, derechos, registro, mant,
    extras: iva + derechos + registro + maniobras,
    financiable: subtotal,                                   // lo que admite enganche + mensualidades
    totalHoyContado: subtotal + iva + derechos + registro + maniobras + mant,
  };
}

/* reserva temporal (M2): expira a los 15 minutos */
function iniciarReserva(espId) {
  DB.reserva = { espacioId: espId, expira: Date.now() + 15 * 60 * 1000 };
  DB.overrides[espId] = 'apartado';
  saveDB();
}
function liberarReserva() {
  if (!DB.reserva) return;
  if (!DB.compras.some(c => c.espacioId === DB.reserva.espacioId)) {
    delete DB.overrides[DB.reserva.espacioId];
  }
  DB.reserva = null;
  saveDB();
}
function checarReservaExpirada() {
  if (DB.reserva && Date.now() > DB.reserva.expira) { liberarReserva(); return true; }
  return false;
}
