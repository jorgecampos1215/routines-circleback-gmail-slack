# routines-circleback-gmail-slack

Automatización que genera y envía un **resumen ejecutivo diario** vía Slack DM a las 6pm (CST/CDT), recopilando información de:

- **Slack** — conversaciones importantes del día
- **Circleback** — llamadas con participantes, acuerdos y próximos pasos
- **Gmail** — correos relevantes de DaCodes y clientes (filtra newsletters y ventas)

## Cómo funciona

Un GitHub Actions workflow corre de lunes a viernes a las 6pm hora México. Ejecuta `daily_summary.py`, que:

1. Llama a Claude (claude-opus-4-7) con herramientas que acceden a Slack, Circleback y Gmail.
2. Claude recopila los datos y genera el resumen en formato Slack markdown.
3. El resumen se envía como DM al usuario configurado en `SLACK_USER_ID`.

## Setup

### 1. Secrets en GitHub Actions

Ve a `Settings → Secrets and variables → Actions` y añade:

| Secret | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | API key de Anthropic (console.anthropic.com) |
| `SLACK_BOT_TOKEN` | Bot token de Slack (`xoxb-...`). Scopes necesarios: `chat:write`, `search:read` |
| `SLACK_USER_ID` | Tu Slack user ID (ej: `U02G57N1UDP`) |
| `CIRCLEBACK_API_KEY` | API key de Circleback (app.circleback.ai/settings/api) |
| `GMAIL_TOKEN_JSON` | Token OAuth2 de Gmail en base64 (ver instrucciones abajo) |

### 2. Generar token de Gmail

```bash
pip install google-auth-oauthlib
python scripts/generate_gmail_token.py --credentials path/to/credentials.json
```

El script abre el browser para autenticar y luego imprime el valor base64 para usar como `GMAIL_TOKEN_JSON`.

Las credenciales OAuth2 se obtienen en [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Desktop App). Habilita la **Gmail API** en el proyecto.

### 3. Configurar Slack App

1. Crea una app en [api.slack.com/apps](https://api.slack.com/apps)
2. Añade los scopes: `chat:write`, `search:read`, `im:write`
3. Instala la app en tu workspace y copia el **Bot User OAuth Token**

## Ejecución manual

```bash
pip install -r requirements.txt
cp .env.example .env  # completa los valores
export $(cat .env | xargs)
python daily_summary.py
```

## Horario

El workflow corre de **lunes a viernes a las 6pm hora México**:
- CDT (UTC-5): `0 23 * * 1-5`
- CST (UTC-6): `0 0 * * 2-6`

También puedes lanzarlo manualmente desde GitHub → Actions → Daily Executive Summary → Run workflow.
