/* ============================================================
   Datos y estado — Jardines del Recuerdo (demo)
   Imágenes reales servidas desde el CDN de Unsplash.
   ============================================================ */

const U = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w || 900}&q=80`;

const IMG = {
  hero:        U('photo-1470071459604-3b5ec3a7fe05', 1900),
  capilla:     U('photo-1473177104440-ffee2f376098', 1400),
  iglesia:     U('photo-1438032005730-c779502df39b', 1200),
  bosque:      U('photo-1441974231531-c6227db76b6e', 1200),
  montanas:    U('photo-1469474968028-56623f02e42e', 1200),
  lago:        U('photo-1501785888041-af3ef285b470', 1200),
  valle:       U('photo-1506744038136-46273834b3fb', 1200),
  pinos:       U('photo-1447752875215-b2761acb3c5d', 1200),
  amanecer:    U('photo-1472214103451-9374bd1c798e', 1200),
  atardecer:   U('photo-1470252649378-9c29740c9fa8', 1200),
  noche:       U('photo-1519681393784-d120267933ba', 1200),
  hojas:       U('photo-1518495973542-4542c06a5843', 1200),
  arbol:       U('photo-1502082553048-f009c37129b9', 1200),
  cascada:     U('photo-1433086966358-54859d0ed716', 1200),
  edificio:    U('photo-1487958449943-2429e8be8625', 1200),
  floresRosa:  U('photo-1490750967868-88aa4486c946', 900),
  floresMix:   U('photo-1416879595882-3373a0480b5b', 900),
  floresCampo: U('photo-1465146344425-f00d5f5c8f07', 900),
  rosasBlancas:U('photo-1455659817273-f96807779a8a', 900),
  rosas:       U('photo-1526047932273-341f2a7631f9', 900),
  p_hombre1:   U('photo-1507003211169-0a1dd7228f2d', 500),
  p_mujer1:    U('photo-1494790108377-be9c29b29330', 500),
  p_mujer2:    U('photo-1438761681033-6461ffad8d80', 500),
  p_hombre2:   U('photo-1500648767791-00dcc994a43e', 500),
  p_mujer3:    U('photo-1544005313-94ddf0286df2', 500),
  p_hombre3:   U('photo-1552058544-f2b08422138a', 500),
};

/* ---------- utilidades deterministas ---------- */
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

/* ---------- catálogo de tipos ---------- */
const TIPOS = {
  terreno: { nombre: 'Terreno', desc: 'Espacio a nivel de jardín para inhumación tradicional.', derechos: 14500, mant: 2900, icon: '🌿' },
  gaveta:  { nombre: 'Gaveta',  desc: 'Nicho en muro para inhumación o restos cremados.',        derechos: 8500,  mant: 1600, icon: '🕊️' },
  cripta:  { nombre: 'Cripta mural', desc: 'Cripta familiar en los muros de la capilla.',        derechos: 12000, mant: 2200, icon: '⛪' },
};

/* ---------- secciones y trazado del plano ---------- */
const SECCIONES = [
  { id: 'A', nombre: 'Jardín de los Olivos',   tipo: 'terreno', base: 68000, x: 60,  y: 120, cols: 12, rows: 5, cw: 34, ch: 36, ocup: .62, apart: .05, img: IMG.bosque },
  { id: 'B', nombre: 'Paseo de los Ángeles',   tipo: 'terreno', base: 96000, x: 60,  y: 360, cols: 10, rows: 4, cw: 40, ch: 42, ocup: .30, apart: .06, img: IMG.montanas },
  { id: 'C', nombre: 'Jardín del Lago',        tipo: 'terreno', base: 74000, x: 60,  y: 580, cols: 11, rows: 5, cw: 34, ch: 36, ocup: .45, apart: .05, img: IMG.lago },
  { id: 'F', nombre: 'Gavetas Norte',          tipo: 'gaveta',  base: 26500, x: 640, y: 120, cols: 14, rows: 5, cw: 19, ch: 21, ocup: .52, apart: .04, img: IMG.edificio },
  { id: 'E', nombre: 'Criptas de la Capilla',  tipo: 'cripta',  base: 56000, x: 960, y: 120, cols: 10, rows: 4, cw: 26, ch: 28, ocup: .40, apart: .05, img: IMG.capilla },
  { id: 'D', nombre: 'Muro de Gavetas San Miguel', tipo: 'gaveta', base: 29000, x: 640, y: 620, cols: 18, rows: 6, cw: 19, ch: 21, ocup: .55, apart: .04, img: IMG.iglesia },
];

/* ---------- generación determinista de espacios ---------- */
const ESPACIOS = [];
(function generarEspacios() {
  SECCIONES.forEach((sec, si) => {
    const rnd = mulberry32(1000 + si * 97);
    for (let r = 0; r < sec.rows; r++) {
      for (let c = 0; c < sec.cols; c++) {
        const i = r * sec.cols + c;
        const roll = rnd();
        let estado = 'disponible';
        if (roll < sec.ocup) estado = 'ocupado';
        else if (roll < sec.ocup + sec.apart) estado = 'apartado';
        const precio = Math.round((sec.base * (0.92 + rnd() * 0.16)) / 500) * 500;
        ESPACIOS.push({
          id: `${sec.id}-${String(i + 1).padStart(2, '0')}`,
          seccion: sec.id, tipo: sec.tipo, fila: r + 1, col: c + 1,
          estado, precio,
          x: sec.x + c * (sec.cw + 4), y: sec.y + r * (sec.ch + 4), w: sec.cw, h: sec.ch,
        });
      }
    }
  });
})();

const espacioById = id => ESPACIOS.find(e => e.id === id);
const seccionById = id => SECCIONES.find(s => s.id === id);

/* ---------- difuntos y memoriales (semilla) ---------- */
const MEMORIALES_SEED = [
  {
    id: 'mem-01', nombre: 'Don Rodrigo Álvarez Peón', nac: '1938-03-11', def: '2021-11-02',
    foto: IMG.p_hombre3, cover: IMG.amanecer, publico: true, espacio: 'A-03',
    epitafio: 'Sembró olivos sabiendo que no comería de sus frutos.',
    mensajes: [
      { autor: 'Familia Álvarez Rivas', fecha: '2026-08-02', texto: 'Abuelo, tus historias siguen contándose en cada sobremesa. Te recordamos con inmenso cariño.' },
      { autor: 'Ing. Manuel Cetina', fecha: '2026-07-14', texto: 'Fue un honor trabajar a su lado durante 30 años. Un caballero de otra época.' },
    ],
    flores: [ { producto: 'p1', de: 'María Álvarez', fecha: '2026-08-10' }, { producto: 'p5', de: 'Familia Cetina', fecha: '2026-07-30' } ],
  },
  {
    id: 'mem-02', nombre: 'Sra. Guadalupe Rivas de Álvarez', nac: '1942-12-08', def: '2023-05-19',
    foto: IMG.p_mujer3, cover: IMG.floresCampo, publico: true, espacio: 'A-04',
    epitafio: 'Su cocina olía a hogar; su abrazo, a domingo por la tarde.',
    mensajes: [
      { autor: 'Sus nietos', fecha: '2026-05-19', texto: 'Tres años sin ti, abuela Lupita. Hoy hicimos tu receta de cochinita y brindamos en tu honor.' },
    ],
    flores: [ { producto: 'p3', de: 'Carmen Rivas', fecha: '2026-08-01' } ],
  },
  {
    id: 'mem-03', nombre: 'Prof. Ernesto Canul May', nac: '1951-06-27', def: '2024-02-14',
    foto: IMG.p_hombre1, cover: IMG.hojas, publico: true, espacio: 'C-07',
    epitafio: 'Enseñó a leer a tres generaciones de un mismo pueblo.',
    mensajes: [
      { autor: 'Generación 1989 — Esc. Benito Juárez', fecha: '2026-06-30', texto: 'Maestro: todo lo que somos empezó en su salón. Gracias por siempre.' },
      { autor: 'Rosario May', fecha: '2026-04-12', texto: 'Hermano querido, tu luz sigue encendida.' },
    ],
    flores: [ { producto: 'p2', de: 'Exalumnos Benito Juárez', fecha: '2026-06-30' } ],
  },
  {
    id: 'mem-04', nombre: 'Sra. Beatriz Solís Manzanero', nac: '1946-09-03', def: '2022-08-27',
    foto: IMG.p_mujer1, cover: IMG.atardecer, publico: true, espacio: 'D-15',
    epitafio: 'Bordaba pájaros porque decía que así aprendían a volar.',
    mensajes: [ { autor: 'Talleres de bordado Xocén', fecha: '2026-08-27', texto: 'Cada puntada nuestra lleva su nombre.' } ],
    flores: [ { producto: 'p7', de: 'Lucía Solís', fecha: '2026-08-15' } ],
  },
  {
    id: 'mem-05', nombre: 'Dr. Fernando Escalante Bolio', nac: '1935-01-22', def: '2019-10-05',
    foto: IMG.p_hombre2, cover: IMG.valle, publico: true, espacio: 'E-05',
    epitafio: 'Curó cuerpos; acompañó almas.',
    mensajes: [ { autor: 'Colegio Médico de Yucatán', fecha: '2026-10-05', texto: 'En memoria de un médico que nunca negó una consulta.' } ],
    flores: [],
  },
  {
    id: 'mem-06', nombre: 'Srita. Amelia Pech Cauich', nac: '1958-04-15', def: '2025-12-24',
    foto: IMG.p_mujer2, cover: IMG.noche, publico: true, espacio: 'C-12',
    epitafio: 'Se fue en Nochebuena, como quien no quiere perderse la fiesta del cielo.',
    mensajes: [ { autor: 'Coro de la Parroquia', fecha: '2026-01-06', texto: 'Tu voz de soprano ya canta en otro coro. Te extrañamos, Meli.' } ],
    flores: [ { producto: 'p1', de: 'Coro de la Parroquia', fecha: '2026-07-24' }, { producto: 'p4', de: 'Jorge Pech', fecha: '2026-06-24' } ],
  },
];

/* asegurar que los espacios con difunto figuren como ocupados */
MEMORIALES_SEED.forEach(m => { const e = espacioById(m.espacio); if (e) e.estado = 'ocupado'; });

/* ---------- tienda de flores y productos ---------- */
const PRODUCTOS = [
  { id: 'p1', nombre: 'Ramo de rosas blancas', precio: 650,  img: IMG.rosasBlancas, desc: '24 rosas blancas de invernadero local, listón de seda y tarjeta manuscrita.', cat: 'Flores' },
  { id: 'p2', nombre: 'Corona fúnebre clásica', precio: 1850, img: IMG.floresMix,   desc: 'Corona de flores mixtas de temporada montada en caballete, con cinta personalizada.', cat: 'Flores' },
  { id: 'p3', nombre: 'Arreglo primaveral', precio: 780,  img: IMG.floresRosa,      desc: 'Arreglo fresco en tonos rosa y blanco, colocado directamente sobre la lápida.', cat: 'Flores' },
  { id: 'p4', nombre: 'Tapete floral de temporada', precio: 1200, img: IMG.floresCampo, desc: 'Cobertura floral de temporada para el espacio completo, instalada por nuestro equipo.', cat: 'Flores' },
  { id: 'p5', nombre: 'Veladora perpetua (30 días)', precio: 320, img: IMG.amanecer, desc: 'Veladora protegida con reposición garantizada durante 30 días.', cat: 'Recordatorios' },
  { id: 'p6', nombre: 'Árbol conmemorativo', precio: 2400, img: IMG.arbol,           desc: 'Plantación de un árbol nativo en el Bosque del Recuerdo con placa grabada.', cat: 'Recordatorios' },
  { id: 'p7', nombre: 'Rosas del jardín', precio: 540,  img: IMG.rosas,              desc: 'Docena de rosas cultivadas en los jardines del panteón.', cat: 'Flores' },
  { id: 'p8', nombre: 'Luz del atardecer · donativo', precio: 250, img: IMG.atardecer, desc: 'Donativo para el mantenimiento de los jardines, dedicado a la memoria del difunto.', cat: 'Donativos' },
];
const productoById = id => PRODUCTOS.find(p => p.id === id);

/* ---------- datos operativos del panel (semilla) ---------- */
const VENTAS_MES = [
  { mes: 'Sep 25', monto: 412000 }, { mes: 'Oct 25', monto: 486000 }, { mes: 'Nov 25', monto: 705000 },
  { mes: 'Dic 25', monto: 638000 }, { mes: 'Ene 26', monto: 391000 }, { mes: 'Feb 26', monto: 452000 },
  { mes: 'Mar 26', monto: 528000 }, { mes: 'Abr 26', monto: 497000 }, { mes: 'May 26', monto: 561000 },
  { mes: 'Jun 26', monto: 604000 }, { mes: 'Jul 26', monto: 673000 }, { mes: 'Ago 26', monto: 719000 },
];

const COBRANZA_SEED = [
  { titular: 'María Fernanda Álvarez Rivas', espacio: 'A-03', vence: '2026-11-02', monto: 2900, estado: 'al corriente', email: 'mf.alvarez@example.com' },
  { titular: 'Carmen Rivas Domínguez',       espacio: 'A-04', vence: '2026-05-19', monto: 2900, estado: 'vencido',      email: 'c.rivas@example.com' },
  { titular: 'Rosario May Canul',            espacio: 'C-07', vence: '2027-02-14', monto: 2900, estado: 'al corriente', email: 'r.may@example.com' },
  { titular: 'Lucía Solís Manzanero',        espacio: 'D-15', vence: '2026-08-27', monto: 1600, estado: 'vencido',      email: 'l.solis@example.com' },
  { titular: 'Alberto Escalante Ruz',        espacio: 'E-05', vence: '2026-10-05', monto: 2200, estado: 'al corriente', email: 'a.escalante@example.com' },
  { titular: 'Jorge Pech Cauich',            espacio: 'C-12', vence: '2026-12-24', monto: 2900, estado: 'al corriente', email: 'j.pech@example.com' },
];

const CONTRATOS_SEED = [
  { folio: 'CT-2019-0142', titular: 'Alberto Escalante Ruz', espacio: 'E-05', fecha: '2019-10-08', estado: 'vigente' },
  { folio: 'CT-2021-0388', titular: 'María Fernanda Álvarez Rivas', espacio: 'A-03', fecha: '2021-11-04', estado: 'vigente' },
  { folio: 'CT-2022-0451', titular: 'Lucía Solís Manzanero', espacio: 'D-15', fecha: '2022-08-29', estado: 'vigente' },
  { folio: 'CT-2023-0517', titular: 'Carmen Rivas Domínguez', espacio: 'A-04', fecha: '2023-05-21', estado: 'vigente' },
  { folio: 'CT-2024-0609', titular: 'Rosario May Canul', espacio: 'C-07', fecha: '2024-02-16', estado: 'vigente' },
  { folio: 'CT-2025-0733', titular: 'Jorge Pech Cauich', espacio: 'C-12', fecha: '2025-12-27', estado: 'vigente' },
];

const PEDIDOS_SEED = [
  { folio: 'PD-1041', producto: 'p1', destino: 'mem-06', de: 'Coro de la Parroquia', fecha: '2026-07-24', estado: 'entregado' },
  { folio: 'PD-1057', producto: 'p3', destino: 'mem-02', de: 'Carmen Rivas', fecha: '2026-08-01', estado: 'entregado' },
  { folio: 'PD-1063', producto: 'p5', destino: 'mem-01', de: 'Familia Cetina', fecha: '2026-07-30', estado: 'entregado' },
  { folio: 'PD-1071', producto: 'p7', destino: 'mem-04', de: 'Lucía Solís', fecha: '2026-08-15', estado: 'en preparación' },
];

/* ============================================================
   Estado persistente (localStorage)
   ============================================================ */
const DB_KEY = 'panteon_demo_v1';
const DB = Object.assign({
  user: null,                 // { nombre, email, rol: 'titular' | 'admin' }
  compras: [],                // compras realizadas en la demo
  overrides: {},              // { espacioId: estado } cambios de inventario
  precioOverrides: {},        // { espacioId: precio }
  invitados: [],              // familiares invitados por el titular
  pedidos: [],                // pedidos de tienda hechos en la demo
  mensajesExtra: {},          // { memorialId: [mensajes] }
  floresExtra: {},            // { memorialId: [flores] }
  memorialesNuevos: [],       // memoriales creados al comprar con difunto
  carrito: [],                // { productoId, qty, destino }
  reserva: null,              // { espacioId, expira }
}, JSON.parse(localStorage.getItem(DB_KEY) || '{}'));

function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }

function estadoDe(esp) { return DB.overrides[esp.id] || esp.estado; }
function precioDe(esp) { return DB.precioOverrides[esp.id] || esp.precio; }

function todosMemoriales() { return MEMORIALES_SEED.concat(DB.memorialesNuevos); }
function memorialById(id) { return todosMemoriales().find(m => m.id === id); }
function memorialDeEspacio(espId) { return todosMemoriales().find(m => m.espacio === espId); }
function mensajesDe(m) { return (m.mensajes || []).concat(DB.mensajesExtra[m.id] || []); }
function floresDe(m) { return (m.flores || []).concat(DB.floresExtra[m.id] || []); }

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
