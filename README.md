# DaCodes Daily Executive Summary

Genera y envía automáticamente un resumen ejecutivo diario a las **6pm CST** por Slack, con datos de:
- **Slack** — conversaciones importantes del día
- **Circleback** — llamadas, participantes, acuerdos y próximos pasos
- **Gmail** — correos relevantes con equipo DaCodes y clientes (sin secuencias de ventas ni promos)

## Setup

### 1. GitHub Secrets

En **Settings → Secrets → Actions** del repo, agrega:

| Secret | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | API key de Anthropic (claude.ai/settings) |
| `SLACK_BOT_TOKEN` | Bot token de Slack (`xoxb-...`) — necesita scopes: `chat:write`, `channels:history`, `groups:history`, `im:write` |
| `SLACK_USER_ID` | Tu Slack user ID (por defecto `U02G57N1UDP`) |
| `GMAIL_CLIENT_ID` | OAuth Client ID de Google Cloud Console |
| `GMAIL_CLIENT_SECRET` | OAuth Client Secret de Google Cloud Console |
| `GMAIL_REFRESH_TOKEN` | Refresh token de Gmail (ver instrucciones abajo) |
| `CIRCLEBACK_API_KEY` | API key de Circleback (opcional — si no se configura, omite la sección) |

### 2. Obtener Gmail Refresh Token

```bash
# Instala la librería
pip install google-auth-oauthlib

# Ejecuta el helper (necesitas un proyecto en Google Cloud Console con Gmail API habilitado)
python -c "
from google_auth_oauthlib.flow import InstalledAppFlow
flow = InstalledAppFlow.from_client_secrets_file('credentials.json', 
    scopes=['https://www.googleapis.com/auth/gmail.readonly'])
creds = flow.run_local_server()
print('REFRESH TOKEN:', creds.refresh_token)
"
```

### 3. Crear Slack App

1. Ve a [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. OAuth Scopes (Bot Token): `chat:write`, `channels:history`, `groups:history`, `im:write`, `im:history`
3. Instala la app en tu workspace
4. Copia el **Bot User OAuth Token** (`xoxb-...`)

## Ejecución manual

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...
export SLACK_BOT_TOKEN=...
export GMAIL_CLIENT_ID=...
export GMAIL_CLIENT_SECRET=...
export GMAIL_REFRESH_TOKEN=...
python generate_summary.py
```

## Horario

El workflow corre automáticamente a las **00:00 UTC = 6:00pm CST** cada día.
México City opera permanentemente en CST (UTC-6) desde 2023.
