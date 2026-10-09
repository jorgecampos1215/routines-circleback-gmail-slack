# Desplegar AI27 con Supabase + Vercel

Tiempo estimado: 20 minutos. Necesitas una cuenta en [supabase.com](https://supabase.com) y otra en [vercel.com](https://vercel.com) (las dos tienen plan gratuito), y acceso al repo `jorgecampos1215/routines-circleback-gmail-slack`.

## 1. Supabase (base de datos)

1. Entra a Supabase → **New project**. Nombre: `ai27-demo`. Región: la más cercana (p. ej. `East US`). Guarda la contraseña de la base.
2. Cuando termine de crearse, ve a **SQL Editor → New query**, pega el contenido completo de `supabase/migrations/0001_esquema.sql` y presiona **Run**. Crea las tablas (custodios, unidades, servicios, incidentes, colaboradores, clientes, taller, combustible, telemetría) y la tabla `demo_estado` donde la plataforma guarda lo que el usuario crea.
3. Ve a **Project Settings → API** y copia tres valores:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (secreta; solo para cargar datos desde tu máquina)
4. En tu computadora, dentro de `ai27-plataforma/`:
   ```bash
   cp .env.example .env.local      # y llena los 4 valores con lo que copiaste
   npm install
   npm run seed:supabase           # sube los 400 custodios, 600 unidades, 300 servicios, etc.
   npm run dev                     # abre http://localhost:5173 → en el menú verás "Base de datos · Supabase"
   ```
   Prueba: da de alta un cliente en Clientes, abre la plataforma en otro navegador y verás el cliente ahí también (sincronización en tiempo real).

## 2. Vercel (hosting)

1. Entra a Vercel → **Add New… → Project** → **Import** el repo `jorgecampos1215/routines-circleback-gmail-slack`.
2. En la configuración del proyecto:
   - **Root Directory:** `ai27-plataforma` (haz clic en *Edit* y elígela).
   - **Framework Preset:** Vite (lo detecta solo; `vercel.json` ya trae build y rewrites).
   - **Production Branch:** `claude/ai27-plataforma` (o `main` si haces merge de la rama).
3. En **Environment Variables** agrega (para Production y Preview):
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
   
   No agregues la service_role key en Vercel.
4. **Deploy**. En ~1 minuto tendrás un link tipo `https://ai27-demo.vercel.app`. Cada push a la rama vuelve a desplegar solo; cada pull request genera un link de preview.
5. Opcional: **Settings → Domains** para usar `demo.ai27.com` u otro dominio tuyo.

## Qué queda conectado

| Parte | Dónde vive | Notas |
|---|---|---|
| Catálogos (custodios, unidades, servicios, incidentes, colaboradores, clientes, taller, combustible) | Tablas de Supabase, cargadas por `npm run seed:supabase` | La app todavía los lee de `src/data/seed.ts` (mismos datos). El siguiente paso es leerlos de Supabase con `supabase.from('custodios').select()` en `src/data/*.ts`. |
| Lo que crea el usuario (clientes nuevos, leads, servicios, vacaciones, trámites, decisiones de la IA) | Tabla `demo_estado` | Se guarda al instante y se sincroniza en tiempo real entre navegadores (`src/lib/store.ts`). Sin Supabase, cae a localStorage. |
| Telemetría | Tabla `eventos_telemetria` (vacía) | `src/lib/telemetria.ts` ya normaliza Samsara y Ruptela; cuando AI27 dé acceso a sus APIs, un cron o edge function inserta aquí los eventos. |
| Seguridad | RLS en modo demo | La llave anónima lee todo y escribe solo en `demo_estado`. Antes de producción: Supabase Auth y políticas por rol (los 9 roles de la pantalla Usuarios). |

## Siguientes pasos sugeridos

1. **Leer catálogos desde Supabase** en lugar de la seed (una tabla a la vez; empezar por `clientes` y `servicios`).
2. **Supabase Auth** con correo corporativo y la matriz de permisos de la pantalla Usuarios como políticas RLS.
3. **Edge Functions**: `asistente` (recibe la pregunta y el rol, consulta la base, responde con texto/gráfica/tabla) y `telemetria` (webhook de Samsara → `eventos_telemetria` → alertas).
4. **Storage** para evidencias de incidentes y documentos de custodios.
