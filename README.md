# Jardines del Recuerdo — Plataforma de Panteón y Memorial Digital

Demo funcional de la **Plataforma de Gestión de Panteón y Memorial Digital** descrita en el
documento *Requerimientos_Panteon_DaCodes* (módulos M1–M8 y componentes transversales C1–C3).

Aplicación web estática (HTML + CSS + JavaScript, sin build ni dependencias) con **imágenes
reales** servidas desde el CDN de Unsplash y respaldo elegante si alguna no carga.

## Cómo ejecutarla

```bash
# opción 1: cualquier servidor estático
python3 -m http.server 8080
# opción 2
npx serve .
```

Abrir `http://localhost:8080`. También funciona abriendo `index.html` directamente
(el enrutado usa hash `#/`).

## Módulos implementados

| Módulo | Dónde verlo |
| --- | --- |
| **M1 · Mapa interactivo 2D** | `#/mapa` — plano navegable (zoom, arrastre), 6 secciones, estados por espacio (disponible/apartado/ocupado/vendido), filtros por tipo/sección/precio, búsqueda de difuntos con localización en el plano |
| **M2 · Catálogo y venta** | Ficha por espacio con desglose (espacio + derechos + mantenimiento), flujo de compra con apartado temporal de 15 min, alta del difunto o compra en previsión |
| **M3 · Contratos y firma digital** | Contrato generado con los datos de la compra, firma clickwrap con sello de tiempo, resguardo y descarga desde Mi cuenta y el panel admin |
| **M4 · Pagos y suscripción** | Pago único simulado tipo Stripe + mantenimiento anual como suscripción, historial de pagos, recibos descargables, renovación |
| **M5 · Cuentas y acceso familiar** | `#/cuenta` — mis espacios, invitación y revocación de familiares con permisos limitados |
| **M6 · Memorial del difunto** | `#/memoriales` y `#/memorial/:id` — página conmemorativa, muro de recuerdos, registro de flores, QR para lápida, ubicación en el mapa |
| **M7 · Tienda de flores** | `#/tienda` — catálogo con carrito, envío/donación dedicada a un difunto, notificación a la familia |
| **M8 · Panel administrativo** | `#/admin` — dashboard con KPIs y gráficas accesibles, inventario editable (estado y precio se reflejan en el mapa público), contratos, cobranza con recordatorios, pedidos de tienda y reportes CSV |

## Cuentas demo

- **Titular:** botón *Iniciar sesión → Titular* (cualquier nombre/correo).
- **Administrador:** botón *Iniciar sesión → Administrador* o directamente en `#/admin`.
- Los datos generados en la demo (compras, contratos, mensajes, pedidos, cambios de inventario)
  se guardan en `localStorage`. Para reiniciar la demo: borrar el almacenamiento del sitio.

## Estructura

```
index.html      — shell de la SPA
css/styles.css  — sistema de diseño (paleta validada para daltonismo en estados y gráficas)
js/data.js      — catálogos, secciones, espacios, memoriales, productos y estado persistente
js/map.js       — generación del plano SVG, pan/zoom y filtros
js/app.js       — router y vistas de todos los módulos
```

> Demo de alcance comercial: pagos, correos y firma con validez legal se integran en la fase
> de desarrollo (Stripe, notificaciones transaccionales y resguardo de PDF sellado).

— DaCodes
