# DaCodes Daily Executive Summary Bot

Automatización para generar y enviar un resumen ejecutivo diario a las 6pm vía Slack,
consolidando información de Slack, Circleback y Gmail.

## ¿Qué hace?

Cada día a las 6pm CST/CDT, este bot:
1. **Slack** — Busca conversaciones importantes del día (decisiones, riesgos, action items)
2. **Circleback** — Resume reuniones del día (participantes, temas, acuerdos, próximos pasos)
3. **Gmail** — Filtra correos relevantes de DaCodes y clientes (ignora secuencias outbound y newsletters)
4. Envía el resumen como **DM a jorge.campos@dacodes.com** en Slack

## Ejecución

### Automática (GitHub Actions)
Se ejecuta diariamente a las **23:00 UTC (6pm CDT / 5pm CST)** via `.github/workflows/daily-summary.yml`

Para ejecutar manualmente desde GitHub: **Actions → Daily Executive Summary → Run workflow**

### Manual (Claude Code CLI)
```bash
claude -p "$(cat prompts/daily_summary.md)" --allowedTools "mcp__Slack__*,mcp__Circleback__*,mcp__Gmail__*"
```

## Configuración de Secrets (GitHub)

Ve a Settings → Secrets and variables → Actions y agrega:

| Secret | Descripción |
|--------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `SLACK_BOT_TOKEN` | Bot token de Slack (xoxb-...) |
| `SLACK_TEAM_ID` | ID del workspace de Slack |
| `GMAIL_OAUTH_CREDENTIALS` | Credenciales OAuth de Gmail (JSON) |
| `CIRCLEBACK_API_KEY` | API key de Circleback |

## Archivos clave

- `prompts/daily_summary.md` — Prompt que define qué resumir y cómo formatear
- `.github/workflows/daily-summary.yml` — Workflow de GitHub Actions
- `CLAUDE.md` — Este archivo de documentación

## Personalización

Para ajustar el resumen, edita `prompts/daily_summary.md`:
- Cambia la hora en el cron del workflow (`.github/workflows/daily-summary.yml`)
- Cambia el destinatario (`U02G57N1UDP` = jorge.campos@dacodes.com) en el prompt
