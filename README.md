# routines-circleback-gmail-slack

Resumen ejecutivo diario automático: recopila actividad de **Slack**, **Circleback** y **Gmail**, genera un resumen con Claude y lo envía por Slack DM a las 6pm CST.

## Archivos

| Archivo | Descripción |
|---|---|
| `daily_summary.py` | Script principal — fetch, generación con Claude y envío |
| `requirements.txt` | Dependencias Python |
| `.github/workflows/daily_summary.yml` | GitHub Action (cron diario a las 6pm CST) |

## Setup

### 1. Secrets en GitHub

Ve a **Settings → Secrets and variables → Actions** y agrega:

| Secret | Descripción |
|---|---|
| `SLACK_BOT_TOKEN` | Token del bot de Slack (`xoxb-...`) |
| `SLACK_USER_ID` | Tu User ID de Slack (ej. `U02G57N1UDP`) |
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `CIRCLEBACK_API_KEY` | API key de Circleback |
| `GMAIL_TOKEN_JSON` | Credenciales OAuth de Gmail como JSON (ver abajo) |

### 2. Gmail credentials

Genera el token OAuth de Gmail y almacénalo como JSON con este formato:

```json
{
  "token": "ya29.xxx",
  "refresh_token": "1//xxx",
  "token_uri": "https://oauth2.googleapis.com/token",
  "client_id": "xxx.apps.googleusercontent.com",
  "client_secret": "xxx",
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
}
```

### 3. Slack Bot permissions

El bot necesita los siguientes OAuth scopes:
- `channels:history`, `groups:history`, `im:history`, `mpim:history`
- `channels:read`, `groups:read`
- `users:read`
- `chat:write`
- `im:write`

### 4. Canales monitoreados

Por defecto se monitorean: `general`, `talentaugmentation`, `proyectos-internos`, `leads`, `ventas`, `clientes`, `directivos`.

Modifica `CHANNELS_TO_MONITOR` en `daily_summary.py` para ajustar.

## Ejecución manual

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_USER_ID=U02G57N1UDP
export ANTHROPIC_API_KEY=sk-ant-...
export CIRCLEBACK_API_KEY=...
export GMAIL_TOKEN_JSON='{"token":...}'

pip install -r requirements.txt
python daily_summary.py
```
