# routines-circleback-gmail-slack

Genera y envía automáticamente un **resumen ejecutivo diario** a Slack a las 6 pm CST, recopilando información de Circleback, Gmail y Slack.

## Qué hace

1. **Circleback** — Obtiene las reuniones del día (participantes, temas, acuerdos, próximos pasos).
2. **Gmail** — Filtra correos relevantes: gente de DaCodes y clientes. Ignora newsletters y correos de venta.
3. **Slack** — Resume las conversaciones más importantes del día en los canales accesibles.
4. Usa **Claude (claude-sonnet-4-6)** para generar el resumen ejecutivo.
5. Envía el resultado por DM a Slack al usuario configurado.

## Configuración (GitHub Secrets)

Ve a **Settings → Secrets and variables → Actions** en este repositorio y agrega:

| Secret | Descripción |
|--------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `SLACK_BOT_TOKEN` | Bot OAuth Token de Slack (`xoxb-...`) |
| `SLACK_TARGET_USER` | User ID de Slack destino (ej. `U02G57N1UDP`) |
| `CIRCLEBACK_API_KEY` | API key de Circleback |
| `GMAIL_CLIENT_ID` | Client ID de Google OAuth |
| `GMAIL_CLIENT_SECRET` | Client Secret de Google OAuth |
| `GMAIL_REFRESH_TOKEN` | Refresh Token de Google OAuth (con scope `gmail.readonly`) |

### Cómo obtener el Gmail Refresh Token

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Activa la **Gmail API**
3. Crea credenciales OAuth 2.0 (tipo "Desktop app")
4. Usa el [OAuth Playground](https://developers.google.com/oauthplayground/) con el scope `https://www.googleapis.com/auth/gmail.readonly`
5. Intercambia el authorization code por tokens y copia el `refresh_token`

### Cómo obtener el Slack Bot Token

1. Ve a [api.slack.com/apps](https://api.slack.com/apps) → crea una nueva app
2. En **OAuth & Permissions**, agrega los scopes:
   - `channels:history`, `channels:read`
   - `groups:history`, `groups:read`
   - `im:history`, `im:write`
   - `chat:write`
   - `users:read`
3. Instala la app en tu workspace y copia el **Bot User OAuth Token**
4. Invita el bot a los canales que debe monitorear: `/invite @tu-bot`

### Cómo obtener la Circleback API Key

1. Ve a [app.circleback.ai](https://app.circleback.ai) → Settings → API
2. Genera un API key y cópialo

## Ejecución manual

```bash
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-...
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_TARGET_USER=U02G57N1UDP
export CIRCLEBACK_API_KEY=...
export GMAIL_ACCESS_TOKEN=...   # token temporal obtenido via OAuth

python3 scripts/generate_summary.py
```

## Schedule

El workflow corre automáticamente todos los días a **medianoche UTC (6 pm CST)**.
También puedes ejecutarlo manualmente desde **Actions → Daily Executive Summary → Run workflow**.
