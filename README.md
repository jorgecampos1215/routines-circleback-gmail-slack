# Resumen Ejecutivo Diario — DaCodes

Genera y envía automáticamente un resumen ejecutivo diario a las **6pm hora México** vía Slack DM.

Incluye:
- 💬 **Slack** — conversaciones clave del día
- 📞 **Circleback** — llamadas: participantes, acuerdos y próximos pasos
- 📧 **Gmail** — correos relevantes de dacodes y clientes (sin ventas ni secuencias)

---

## Setup (una sola vez)

### 1. Slack App

1. Ve a [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. En **OAuth & Permissions**, agrega estos Bot Token Scopes:
   - `channels:history`, `groups:history`, `im:history`, `mpim:history`
   - `channels:read`, `groups:read`, `im:read`, `mpim:read`
   - `chat:write`, `users:read`
3. Instala la app en tu workspace → copia el **Bot User OAuth Token** (`xoxb-...`)
4. Tu **User ID** ya está configurado como `U02G57N1UDP`

### 2. Circleback API Key

1. Ve a [app.circleback.ai](https://app.circleback.ai) → **Settings → API**
2. Genera o copia tu API key

### 3. Gmail OAuth2

```bash
# Instala dependencias localmente
pip install google-auth-oauthlib google-api-python-client

# Descarga client_secret.json desde Google Cloud Console
# (Proyecto → APIs & Services → Credentials → OAuth 2.0 Client → Desktop app)

# Ejecuta el setup (abre navegador para autorizar)
python setup_gmail_credentials.py
```

El script imprime el JSON de credenciales. Cópialo para el siguiente paso.

### 4. GitHub Secrets

En tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor |
|--------|-------|
| `ANTHROPIC_API_KEY` | Tu API key de Anthropic |
| `SLACK_BOT_TOKEN` | `xoxb-...` |
| `SLACK_USER_ID` | `U02G57N1UDP` |
| `CIRCLEBACK_API_KEY` | Tu API key de Circleback |
| `GMAIL_CREDENTIALS` | JSON generado por `setup_gmail_credentials.py` |

### 5. Verificar

Ve a **Actions → 📊 Daily Executive Summary → Run workflow** para probar manualmente.

---

## Horario

El resumen se envía automáticamente a las **6pm CDT (abril–octubre)**.

En invierno (CST, noviembre–marzo), cambia el cron en `.github/workflows/daily_summary.yml`:
```yaml
- cron: '0 0 * * *'   # 6pm CST = 00:00 UTC
```

---

## Ejecución local

```bash
pip install -r requirements.txt
cp .env.example .env  # llena los valores
export $(cat .env | xargs)
python daily_summary.py
```
