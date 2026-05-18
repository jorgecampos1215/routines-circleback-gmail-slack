# Daily Executive Summary — DaCodes

Envía un resumen ejecutivo diario a las **6:00 PM CST** (medianoche UTC) vía Slack DM.
Consolida: Slack · Circleback · Gmail.

## Setup de GitHub Secrets

Ve a `Settings → Secrets and variables → Actions` y agrega:

| Secret | Descripción |
|---|---|
| `SLACK_BOT_TOKEN` | Token de tu Slack App (`xoxb-...`). Scopes: `search:read`, `chat:write`, `im:write` |
| `SLACK_DM_CHANNEL_ID` | ID del canal DM donde recibir el resumen (ej. `D02FSJQ1R7U`) |
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `CIRCLEBACK_API_KEY` | API key de Circleback |
| `GMAIL_CLIENT_ID` | Client ID de tu Google OAuth App |
| `GMAIL_CLIENT_SECRET` | Client Secret de Google OAuth |
| `GMAIL_REFRESH_TOKEN` | Refresh token con scope `gmail.readonly` |

## Obtener el Gmail Refresh Token

1. Crea un proyecto en Google Cloud Console y activa la Gmail API
2. Crea credenciales OAuth 2.0 (tipo Desktop App)
3. Sigue el flujo de autorización y guarda el `refresh_token` del JSON resultante

## Ejecución manual

GitHub Actions UI → **Run workflow** en `Daily Executive Summary`.

## Estructura

```
daily_summary.py               # Script principal
requirements.txt               # Dependencias Python
.github/workflows/
  daily-summary.yml            # GitHub Action (cron 00:00 UTC = 18:00 CST)
```
