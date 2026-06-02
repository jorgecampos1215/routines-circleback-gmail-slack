# Resumen Ejecutivo Diario — DaCodes

Automatización que genera y envía un resumen ejecutivo diario a las **6pm CST** (lunes a viernes) via Slack DM, consolidando actividad de:

- **Slack** — conversaciones y DMs importantes del día
- **Circleback** — notas y acuerdos de reuniones
- **Gmail** — correos relevantes de DaCodes y clientes

## Cómo funciona

Un GitHub Action se ejecuta diariamente a las 6pm (medianoche UTC). Invoca Claude Code que:
1. Busca actividad del día en Slack, Circleback y Gmail
2. Genera un resumen estructurado
3. Lo envía como DM a Jorge Campos en Slack

## Setup inicial (una sola vez)

### Requisitos previos
- Cuenta en GitHub con acceso al repositorio
- `ANTHROPIC_API_KEY` con acceso a la API de Anthropic
- Tokens OAuth de los MCP servers (Slack, Gmail, Circleback)

### 1. Configurar GitHub Secrets

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Descripción |
|--------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `SLACK_MCP_URL` | URL del MCP server de Slack (ver abajo) |
| `SLACK_MCP_TOKEN` | Token OAuth del MCP server de Slack |
| `GMAIL_MCP_URL` | URL del MCP server de Gmail |
| `GMAIL_MCP_TOKEN` | Token OAuth del MCP server de Gmail |
| `CIRCLEBACK_MCP_TOKEN` | Token OAuth de Circleback API |

### 2. Obtener los tokens MCP

Los tokens OAuth se generan durante la autenticación en Claude Code on the Web.
Consulta la documentación en https://code.claude.com/docs para obtener las credenciales
persistentes de cada MCP server.

### 3. Activar el workflow

El workflow se activa automáticamente una vez configurados los secrets.
Para probar manualmente: **Actions → Resumen Ejecutivo Diario 6pm → Run workflow**

## Estructura del repositorio

```
├── .github/
│   └── workflows/
│       └── daily_summary.yml      # GitHub Action (cron 6pm CST)
├── DAILY_SUMMARY_INSTRUCTIONS.md  # Instrucciones para Claude
└── README.md
```

## Ejecución manual

Para generar el resumen ahora mismo, ejecuta el workflow manualmente desde la pestaña Actions en GitHub, o inicia una sesión de Claude Code on the Web y pide:

> "Sigue las instrucciones en DAILY_SUMMARY_INSTRUCTIONS.md y envía el resumen de hoy"
