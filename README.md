# Daily Executive Summary — Slack + Circleback + Gmail

Genera y envía un resumen ejecutivo diario a las **6pm hora CDMX** vía Slack DM.

## Qué incluye

| Fuente | Contenido |
|--------|-----------|
| **Slack** | Mensajes importantes del día en todos los canales |
| **Circleback** | Llamadas del día: participantes, temas, acuerdos, próximos pasos |
| **Gmail** | Correos de gente de DaCodes y clientes (ignora ventas/secuencias outbound) |

## Setup

### 1. Secrets en GitHub Actions

Ve a **Settings → Secrets and variables → Actions** y agrega:

| Secret | Descripción |
|--------|-------------|
| `SLACK_BOT_TOKEN` | Token del bot de Slack (`xoxb-...`) |
| `SLACK_USER_ID` | Tu user ID de Slack (ej. `U02G57N1UDP`) |
| `CIRCLEBACK_TOKEN` | API token de Circleback |
| `ANTHROPIC_API_KEY` | Llave de Anthropic |
| `GMAIL_CLIENT_ID` | Client ID de OAuth2 de Google |
| `GMAIL_CLIENT_SECRET` | Client Secret de OAuth2 de Google |
| `GMAIL_REFRESH_TOKEN` | Refresh token de Gmail |

### 2. Gmail OAuth2 (primera vez)

```bash
pip install google-auth-oauthlib
python setup_gmail_auth.py  # genera el refresh token
```

### 3. Slack — permisos del bot

El bot necesita estos OAuth scopes:
- `search:read`
- `chat:write`
- `im:write`

### 4. Ejecución manual

```bash
cp .env.example .env  # llena con tus credenciales
source .env
python daily_summary.py
```

O desde GitHub: **Actions → Daily Executive Summary → Run workflow**

## Horario

El cron corre a `0 0 * * *` UTC = **6pm hora Ciudad de México (CST, UTC-6)**.
