# Resumen Ejecutivo Diario — DaCodes

Envía automáticamente un resumen ejecutivo a las **6 PM hora de México** vía Slack DM,
con actividad del día de Slack, Circleback y Gmail.

## Cómo funciona

`daily_summary.py` recopila datos de las tres fuentes, usa Claude para formatear
el resumen y lo envía como DM de Slack al usuario configurado.

El workflow de GitHub Actions (`daily_executive_summary.yml`) lo ejecuta
automáticamente cada día a las 23:00 UTC (6 PM CDT).

## Configuración en GitHub Actions

Ve a **Settings → Secrets and variables → Actions** en este repositorio
y agrega los siguientes secrets:

| Secret | Descripción |
|--------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `SLACK_BOT_TOKEN` | Bot OAuth token de Slack (`xoxb-...`) |
| `SLACK_USER_ID` | Tu user ID de Slack (default: `U02G57N1UDP`) |
| `CIRCLEBACK_API_KEY` | API key de Circleback |
| `GMAIL_CREDENTIALS_JSON` | Credenciales OAuth de Gmail en JSON (ver abajo) |

### Permisos del bot de Slack

El bot necesita estos OAuth scopes:
- `channels:history`, `channels:read`
- `groups:history`, `groups:read`
- `im:history`, `mpim:history`
- `chat:write`, `users:read`

### Generar credenciales de Gmail

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto y habilita la **Gmail API**
3. Crea credenciales OAuth 2.0 (tipo "Desktop app")
4. Descarga el JSON de credenciales
5. Ejecuta localmente para generar el refresh token:

```bash
pip install google-auth-oauthlib
python -c "
from google_auth_oauthlib.flow import InstalledAppFlow
flow = InstalledAppFlow.from_client_secrets_file(
    'client_secret.json',
    ['https://www.googleapis.com/auth/gmail.readonly']
)
creds = flow.run_local_server(port=0)
import json
print(json.dumps({
    'token': creds.token,
    'refresh_token': creds.refresh_token,
    'client_id': creds.client_id,
    'client_secret': creds.client_secret,
}))
"
```

6. Copia el JSON resultante como el valor del secret `GMAIL_CREDENTIALS_JSON`

## Ejecución manual

```bash
cp .env.example .env   # Llena tus valores
pip install -r requirements.txt
source .env && python daily_summary.py
```

## Horario

- **CDT (verano, abril–octubre):** `0 23 * * *` → 6 PM CDT
- **CST (invierno, nov–marzo):** Cambia el cron a `0 0 * * *` → 6 PM CST

Para ajustar el horario, edita `.github/workflows/daily_executive_summary.yml`.
