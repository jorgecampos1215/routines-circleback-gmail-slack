# Desplegar AI27 con Supabase + Vercel

La plataforma ya está en GitHub (`jorgecampos1215/routines-circleback-gmail-slack`, carpeta `ai27-plataforma/`, en `main` y en la rama de trabajo `claude/ai27-plataforma`). Lo que falta es una base de datos en Supabase y el hosting en Vercel. Las dos tienen plan gratuito y entras a ambas con tu cuenta de GitHub.

**Estado actual:** Vercel ya está conectado al repo (equipo `da-codes1`, proyecto `routines-circleback-gmail-slack`) y publica https://routines-circleback-gmail-slack.vercel.app en cada push a `main`. Falta crear las tablas y cargar la seed en Supabase, y poner las dos variables `VITE_SUPABASE_*` en Vercel.

Hay tres formas de hacer lo que falta. Todas terminan igual: el link de Vercel conectado a tu base.

| Forma | Qué haces tú | Quién corre el deploy |
|---|---|---|
| **A. Claude lo hace** | Creas las cuentas, generas 2 tokens y los guardas en el entorno de Claude Code (no en el chat) | Claude, desde una sesión nueva |
| **B. GitHub Actions** | Creas las cuentas, generas 2 tokens y los guardas como secretos del repo | GitHub, con un clic en *Run workflow* |
| **C. A mano** | Todo desde los dashboards de Supabase y Vercel, ~15 minutos | Vercel, al importar el repo |

Las llaves y tokens **nunca se pegan en el chat ni en el código**: van a los secretos de GitHub, a los *Network secrets* del entorno de Claude Code o a las variables de Vercel.

---

## Paso 0 (común): crear las cuentas y el proyecto de Supabase

1. **Supabase** → [supabase.com](https://supabase.com) → *Start your project* → entra con GitHub → **New project**.
   - Nombre: `ai27-demo`. Región: la más cercana (p. ej. *East US*). **Guarda la contraseña de la base**: la vas a necesitar.
   - Cuando termine, en **Project Settings → General** copia el **Reference ID** (exactamente 20 letras minúsculas, algo como `abcdefghijklmnopqrst`; no es el nombre del proyecto).
   - En **Project Settings → API** verás la **Project URL**, la llave **anon public** y la **service_role** (secreta).
2. **Vercel** → [vercel.com](https://vercel.com) → *Sign up* con GitHub. No hace falta crear nada más: el deploy crea el proyecto.

---

## A. Que Claude lo haga por ti

El entorno de Claude Code en la nube solo tiene salida de red a GitHub, así que hoy no puede hablar con Vercel ni con Supabase. Para que pueda, cambia tres cosas en la configuración de tu entorno (menú del entorno en la barra de título → **Edit**):

1. **Network access → Allowed domains**: agrega `api.vercel.com`, `vercel.com`, `api.supabase.com`, `supabase.com`, `*.supabase.co`, `*.pooler.supabase.com` (deja marcados los gestores de paquetes).
2. **Network secrets** (variables de entorno): crea
   - `VERCEL_TOKEN` = token de vercel.com → *Account Settings → Tokens → Create* (scope: tu cuenta, expiración la que quieras).
   - `SUPABASE_ACCESS_TOKEN` = token de supabase.com → *Account → Access Tokens → Generate new token*.
   - `SUPABASE_PROJECT_ID` = el Reference ID del proyecto.
   - `SUPABASE_DB_PASSWORD` = la contraseña de la base (la usa `supabase db push`).
   - `SUPABASE_SERVICE_ROLE_KEY` = la llave service_role (solo para cargar la seed data).
3. Guarda y **abre una sesión nueva** de Claude Code (los cambios del entorno no llegan a la sesión abierta). Pídele: *"despliega ai27-plataforma en Supabase y Vercel"*. Con eso Claude corre la migración, carga los 400 custodios / 600 unidades / 300 servicios, crea el proyecto en Vercel con las variables correctas y te pasa el link.

Documentación: [Network access](https://code.claude.com/docs/en/cloud-environments#network-access) y [variables de entorno](https://code.claude.com/docs/en/cloud-environments#environment-variables).

---

## B. Desde GitHub Actions (sin que nadie instale nada)

El repo ya trae dos workflows en `.github/workflows/`:

| Workflow | Qué hace |
|---|---|
| **AI27 · Migrar y cargar Supabase** | `supabase link` + `supabase db push` (crea las tablas) y, si lo pides, `npm run seed:supabase` (carga la seed data). |
| **AI27 · Desplegar en Vercel** | `npm run build` como verificación, crea o vincula el proyecto `ai27-plataforma` en tu cuenta de Vercel (sin conectar el repo entero a Vercel), guarda las variables `VITE_SUPABASE_*` y despliega a producción. El link y los dominios quedan en el resumen del job. |

1. En GitHub: repo → **Settings → Secrets and variables → Actions → New repository secret**. Crea:

   | Secreto | De dónde sale |
   |---|---|
   | `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
   | `SUPABASE_PROJECT_ID` | Project Settings → General → Reference ID (20 letras minúsculas) |
   | `SUPABASE_DB_PASSWORD` | la contraseña que pusiste al crear el proyecto |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (opcional, solo para la seed) |
   | `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
   | `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon public |

2. Pestaña **Actions** → *AI27 · Migrar y cargar Supabase* → **Run workflow** (rama `main`, *seed* marcado). Tarda ~2 minutos. Si creas la variable `AI27_SUPABASE_AUTO` = `true`, además corre solo en cada push que toque `supabase/`.
3. **Actions** → *AI27 · Desplegar en Vercel* → **Run workflow**. En el resumen del job aparece el link.
4. Si tu cuenta de Vercel pertenece a **más de un equipo**, en **Settings → Secrets and variables → Actions → Variables** crea `VERCEL_SCOPE` con el slug del equipo (el que aparece en la URL `vercel.com/<slug>`). Una cuenta nueva con un solo equipo no lo necesita.
5. Opcional: en la misma pestaña **Variables** crea `AI27_AUTODEPLOY` = `true` para que cada push a la rama vuelva a desplegar solo. El workflow *AI27 · Verificar build* corre siempre y no necesita secretos.

---

## C. A mano desde los dashboards

### Supabase
1. **SQL Editor → New query**, pega el contenido completo de `supabase/migrations/20261010120000_esquema.sql` y **Run**. Crea las tablas (custodios, unidades, servicios, incidentes, colaboradores, clientes, taller, combustible, telemetría) y `demo_estado`, donde la plataforma guarda lo que el usuario crea.
2. Para cargar la seed data, en tu computadora dentro de `ai27-plataforma/`:
   ```bash
   cp .env.example .env.local      # llena los 4 valores (URL, anon, service_role)
   npm install
   npm run seed:supabase           # sube los 400 custodios, 600 unidades, 300 servicios, etc.
   npm run dev                     # http://localhost:5173 → en el menú verás "Base de datos · Supabase"
   ```

### Vercel (conectado a GitHub)
1. **Add New… → Project → Import** el repo `jorgecampos1215/routines-circleback-gmail-slack`.
2. **Root Directory:** puedes dejarlo vacío (el `vercel.json` de la raíz del repo construye `ai27-plataforma/`) o poner `ai27-plataforma`; las dos opciones funcionan. **Production Branch:** `main` (ya contiene la plataforma; `claude/ai27-plataforma` también sirve).
3. **Deploy**. En ~1 minuto tienes el link `https://<proyecto>.vercel.app`. Cada push a `main` vuelve a desplegar; cada pull request genera un preview.
4. Para conectar la base: **Project → Settings → Environment Variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Production y Preview) y luego **Deployments → ⋯ → Redeploy**. **No** pongas la service_role en Vercel. Alternativa: guarda `VERCEL_TOKEN`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como secretos del repo y la variable `VERCEL_PROJECT` con el nombre que Vercel le puso al proyecto; el workflow *AI27 · Desplegar en Vercel* las escribe por ti.
5. Opcional: **Settings → Domains** para `demo.ai27.com` u otro dominio tuyo.

---

## Repo propio en GitHub (opcional)

Hoy la plataforma vive en una carpeta del repo `routines-circleback-gmail-slack`. Si prefieres un repo dedicado (`jorgecampos1215/ai27-plataforma`), créalo vacío en GitHub (**New repository**, sin README) y dile a Claude; él mueve el código ahí con todo el historial, los workflows y el `gh-pages` del demo. La app de GitHub de Claude no tiene permiso para crear repos, por eso ese clic es tuyo.

---

## Qué queda conectado

| Parte | Dónde vive | Notas |
|---|---|---|
| Catálogos (custodios, unidades, servicios, incidentes, colaboradores, clientes, taller, combustible) | Tablas de Supabase, cargadas por la seed | La app todavía los lee de `src/data/seed.ts` (mismos datos). Siguiente paso: leerlos con `supabase.from('custodios').select()` en `src/data/*.ts`. |
| Lo que crea el usuario (clientes nuevos, oportunidades, servicios, asignaciones, taller, combustible, vacaciones, trámites, decisiones de la IA) | Tabla `demo_estado` | Se guarda al instante y se sincroniza en tiempo real entre navegadores (`src/lib/store.ts`). Sin Supabase, cae a localStorage. |
| Telemetría | Tabla `eventos_telemetria` (vacía) | `src/lib/telemetria.ts` ya normaliza Samsara y Ruptela; cuando AI27 dé acceso a sus APIs, un cron o edge function inserta aquí los eventos. |
| Seguridad | RLS en modo demo | La llave anónima lee todo y escribe solo en `demo_estado`. Antes de producción: Supabase Auth y políticas por rol (los 9 roles de la pantalla Usuarios). |

## Siguientes pasos sugeridos

1. **Leer catálogos desde Supabase** en lugar de la seed (una tabla a la vez; empezar por `clientes` y `servicios`).
2. **Supabase Auth** con correo corporativo y la matriz de permisos de la pantalla Usuarios como políticas RLS.
3. **Edge Functions**: `asistente` (recibe la pregunta y el rol, consulta la base, responde con texto/gráfica/tabla) y `telemetria` (webhook de Samsara → `eventos_telemetria` → alertas).
4. **Storage** para evidencias de incidentes y documentos de custodios.
