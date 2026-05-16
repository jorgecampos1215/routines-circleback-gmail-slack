# routines-circleback-gmail-slack

Automatización del resumen ejecutivo diario de DaCodes enviado por Slack a las 6pm.

## Qué hace

Cada día hábil a las 6pm CDT, un GitHub Action corre un agente de Claude que:

1. **Slack** — Resume las conversaciones más importantes del día
2. **Circleback** — Resume llamadas del día: participantes, temas clave, acuerdos y próximos pasos
3. **Gmail** — Revisa correos de gente de DaCodes y clientes (ignora secuencias outbound y spam)

El resumen llega como DM en Slack.

## Configuración de Secrets en GitHub

Ve a **Settings → Secrets and variables → Actions** en este repo y agrega:

### `ANTHROPIC_API_KEY`
Tu API key de Anthropic. Obtén una en https://console.anthropic.com

### `MCP_CONFIG`
JSON con la configuración de los MCP servers. Formato:

```json
{
  "mcpServers": {
    "Slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-tu-token-aqui",
        "SLACK_TEAM_ID": "tu-team-id"
      }
    },
    "Gmail": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gmail"],
      "env": {
        "GMAIL_OAUTH_TOKEN": "ya29-tu-token-aqui"
      }
    },
    "Circleback": {
      "command": "npx",
      "args": ["-y", "@circleback/mcp-server"],
      "env": {
        "CIRCLEBACK_API_KEY": "tu-api-key-aqui"
      }
    }
  }
}
```

> Ajusta los comandos y variables según los MCP servers que uses en tu configuración local de Claude Code.
> Puedes revisar tu configuración en `~/.claude/settings.json` o en la configuración de la extensión.

## Ejecución manual

Desde GitHub → Actions → **Daily Executive Summary** → **Run workflow**.
Opcionalmente puedes pasar una fecha específica (YYYY-MM-DD) para generar el resumen de otro día.

## Horario

- Cron: `0 23 * * 1-5` (23:00 UTC = 6pm CDT, lunes a viernes)
- Para cambiar la hora, edita `.github/workflows/daily-executive-summary.yml`
