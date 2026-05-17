# DaCodes — Daily Executive Summary Bot

Genera y envía automáticamente un resumen ejecutivo diario a las **6:00 PM CST** vía Slack, consolidando información de Gmail, Slack y Circleback, resumida con Claude (Anthropic).

## Qué incluye el resumen

| Fuente | Contenido |
|--------|-----------|
| **Slack** | Conversaciones clave del día agrupadas por tema |
| **Circleback** | Llamadas del día: participantes, acuerdos, próximos pasos |
| **Gmail** | Correos de gente de DaCodes y clientes (ignora newsletters y ventas) |

## Setup — GitHub Secrets requeridos

Ve a **Settings → Secrets and variables → Actions** en este repo y agrega:

| Secret | Descripción |
|--------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic (claude.ai/settings) |
| `SLACK_BOT_TOKEN` | Bot token de Slack (`xoxb-...`) |
| `SLACK_TARGET_USER_ID` | Tu user ID de Slack (ej. `U02G57N1UDP`) |
| `GOOGLE_TOKEN_JSON` | JSON completo del token OAuth de Google (ver abajo) |
| `CIRCLEBACK_API_KEY` | API key de Circleback (opcional) |

### Cómo obtener `GOOGLE_TOKEN_JSON`

1. Crea credenciales OAuth 2.0 en [Google Cloud Console](https://console.cloud.google.com/) con el scope `gmail.readonly`
2. Descarga el `credentials.json`
3. Ejecuta localmente:
   ```bash
   pip install google-auth-oauthlib
   python -c "
   from google_auth_oauthlib.flow import InstalledAppFlow
   flow = InstalledAppFlow.from_client_secrets_file('credentials.json', ['https://www.googleapis.com/auth/gmail.readonly'])
   creds = flow.run_local_server(port=0)
   print(creds.to_json())
   "
   ```
4. Copia el JSON completo que imprime y pégalo como valor del secret `GOOGLE_TOKEN_JSON`

### Cómo obtener el Slack Bot Token

1. Ve a [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. Add OAuth scopes: `channels:history`, `groups:history`, `im:history`, `mpim:history`, `channels:read`, `groups:read`, `chat:write`
3. Install to workspace → copia el **Bot User OAuth Token** (`xoxb-...`)
4. Agrega el bot a los canales relevantes con `/invite @nombre-del-bot`

## Ejecución manual

Para ejecutar ahora mismo sin esperar las 6 PM:
- Ve a **Actions → Daily Executive Summary → Run workflow**

## Estructura del proyecto

```
├── daily_summary.py         # Script principal
├── requirements.txt         # Dependencias Python
├── .github/
│   └── workflows/
│       └── daily_summary.yml   # GitHub Action (cron 6PM CST)
└── README.md
```
