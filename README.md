# Resumen Ejecutivo Diario — DaCodes

Automatización que genera y envía un resumen ejecutivo diario por Slack a las **6pm CST** con información de:
- **Slack** — conversaciones importantes del día
- **Circleback** — llamadas grabadas (participantes, temas, acuerdos, próximos pasos)
- **Gmail** — correos relevantes de DaCodes y clientes (sin outbound en secuencias)

## Cómo funciona

`scripts/daily_summary.py` usa el SDK de Anthropic con `mcp_servers` para conectar
Claude directamente a Slack, Circleback y Gmail. Claude recopila la información,
genera el resumen en formato ejecutivo y lo envía a tu DM de Slack.

El workflow `.github/workflows/daily-summary.yml` ejecuta esto automáticamente cada día
a las 00:00 UTC (= 18:00 CST).

## Setup en GitHub Actions

### 1. Agrega los siguientes secrets en tu repositorio
`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Cómo obtenerlo |
|--------|---------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SLACK_MCP_TOKEN` | [api.slack.com/apps](https://api.slack.com/apps) → tu app → OAuth & Permissions → User OAuth Token (`xoxp-...`) |
| `CIRCLEBACK_API_KEY` | app.circleback.ai → Settings → API |
| `GMAIL_OAUTH_TOKEN` | Ver sección de Gmail abajo |
| `SLACK_USER_ID` | Tu User ID de Slack (ej. `U02G57N1UDP`) |

### 2. Scopes de Slack requeridos
En tu Slack App, agrega estos **User Token Scopes**:
```
channels:history, channels:read, groups:history, groups:read,
im:history, im:read, im:write, mpim:history, mpim:read,
search:read, chat:write, users:read
```

### 3. Gmail OAuth Token

Opción A — Token temporal (para pruebas):
```bash
# Instala google-auth-oauthlib
pip install google-auth-oauthlib

# Sigue el flujo OAuth con tu cuenta de Google y copia el access_token
```

Opción B — Usar refresh token para renovación automática (recomendado para producción):
Crea un script que renueve el token y almacena el refresh token como secret.

## Ejecución manual

```bash
cp .env.example .env
# Edita .env con tus credenciales

pip install -r requirements.txt
source .env  # o usa dotenv
python scripts/daily_summary.py
```

## Estructura

```
.
├── .github/workflows/daily-summary.yml   # Cron: 00:00 UTC = 18:00 CST
├── scripts/daily_summary.py              # Script principal
├── requirements.txt
├── .env.example                           # Template de credenciales
└── README.md
```
