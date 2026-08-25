# NAJ PIXAM · Casa del Alma — Plataforma de Panteón y Memorial Digital

Demo funcional de la plataforma para el panteón **NAJ PIXAM — Casa del Alma** (Kanasín, Yucatán),
según el documento *Requerimientos_Panteon_NAJPIXAM_DaCodes* v0.3 (módulos M1–M10 y componentes
C1–C3), el master plan de **Ricardo Yslas Gámez Arquitectos** y el modelo de contrato de adhesión
registrado ante Profeco (NOM-036-SCFI-2016) usado como referencia.

Aplicación web estática (HTML + CSS + JavaScript, sin build ni dependencias) que **corre 100% en
local**: los renders reales del proyecto arquitectónico están en `assets/img/` (extraídos del PDF
del proyecto). Solo las fotos de flores frescas se enlazan a CDN, con respaldo local elegante.

## Cómo ejecutarla en tu máquina (localhost)

```bash
git clone -b claude/platform-real-images-pjfk89 https://github.com/jorgecampos1215/routines-circleback-gmail-slack.git najpixam
cd najpixam
python3 -m http.server 8080     # o: npx serve .
```

Abrir **http://localhost:8080**.

## Módulos implementados

| Módulo | Dónde verlo |
| --- | --- |
| **M1 · Mapa interactivo 2D** | `#/mapa` — plano con capilla, espejo de agua, velatorios y crematorio; 7 secciones (campo santo, criptas y nichos), estados por espacio, filtros por línea/sección/atributo/precio y búsqueda de difuntos |
| **M2 · Catálogo y venta** | Dos líneas de servicio: **tumba** (precio por ubicación, excavación aparte) y **nicho** (techado / no techado); modalidades **a necesidad** y **preventa** (propia o de beneficiario); apartado temporal de 15 min |
| **M3 · Contratos y firma digital** | Contrato de adhesión en temporalidad (modelo Profeco/NOM-036): glosario, vigencia, titular sustituto, hasta 2 beneficiarios, no-traspaso salvo familiar, pena convencional 20%, cancelación 5 días, plano de localización y firma clickwrap con sello de tiempo |
| **M4 · Pagos y financiamiento** | Contado o **financiado sin intereses** (enganche + mensualidades configurables); extras normativos (IVA, derechos municipales, Registro Civil, maniobras); mantenimiento recurrente; **título de derechos al liquidar**; plan de pagos con avance en Mi cuenta |
| **M5 · Cuentas y acceso familiar** | Portal del titular: espacios, plan de pagos, designaciones e invitación/revocación de familiares |
| **M6 · Funerarias y gobierno** | Rol funeraria con descuento de aliado y compra a nombre del cliente final; segmentación en landing; panel de aliados en administración |
| **M7 · Memorial del difunto** | Página conmemorativa con muro de recuerdos, flores recibidas, QR y ubicación en el mapa |
| **M8 · Diseñador de placa** | `#/placa` — formatos del reglamento (lápida de caliza, placa de bronce, placa familiar), vista previa en vivo en SVG, ornamentos, QR y especificación para la fábrica del panteón |
| **M9 · Florería** | Catálogo con carrito, envío/donación dedicada a un difunto y notificación a la familia |
| **M10 · Panel administrativo** | Dashboard con KPIs y gráficas accesibles, inventario editable reflejado en el mapa, **configuración de precios y financiamiento**, contratos, cobranza (mantenimiento + financiamientos), funerarias/gobierno, fábrica de placas y reportes CSV por línea y segmento |

## Cuentas demo

- **Titular:** *Iniciar sesión → Titular* (cualquier nombre/correo).
- **Funeraria aliada:** *Iniciar sesión → Funeraria* (aplica el descuento de aliado en la compra).
- **Administrador:** *Iniciar sesión → Administrador* o directamente en `#/admin`.
- Los datos generados (compras, contratos, placas, mensajes, pedidos, configuración) se guardan
  en `localStorage`; para reiniciar la demo, borra el almacenamiento del sitio.

## Estructura

```
index.html      — shell de la SPA
css/styles.css  — sistema de diseño NAJ PIXAM (caliza/selva/atardecer; estados validados CVD)
js/data.js      — líneas, secciones, espacios, configuración, memoriales, productos y estado
js/map.js       — plano SVG (pan/zoom), filtros y plano de localización para el contrato
js/app.js       — router y vistas de todos los módulos
assets/img/     — renders reales del proyecto (Ricardo Yslas Gámez Arquitectos)
```

> Demo de alcance comercial: Stripe (contado, mensualidades y recurrente), correos transaccionales,
> firma con validez legal y el registro Profeco propio de NAJ PIXAM se integran en la fase de
> desarrollo.

— DaCodes
