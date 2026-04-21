#!/bin/bash
# Daily Executive Summary - runs at 6pm CST (Merida, UTC-6) = midnight UTC
# Sends a summary of Slack, Circleback, and Gmail activity to Slack DM

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_CONFIG="$SCRIPT_DIR/.mcp-config.json"
LOG_FILE="/var/log/daily-summary.log"
CLAUDE_BIN="/opt/node22/bin/claude"

# Dates in CST (Merida, UTC-6).
# Cron fires at 00:00 UTC = 18:00 CST, so CST "today" is still the UTC "yesterday".
TODAY_CST=$(TZ=America/Merida date '+%Y-%m-%d')
YESTERDAY_CST=$(TZ=America/Merida date -d 'yesterday' '+%Y-%m-%d')
GMAIL_TODAY=$(TZ=America/Merida date '+%Y/%m/%d')
GMAIL_YESTERDAY=$(TZ=America/Merida date -d 'yesterday' '+%Y/%m/%d')

# Slack uses workspace timezone (CST) for date filters, so "on:TODAY_CST" returns today's messages.
SLACK_DATE_FILTER="on:$TODAY_CST"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting daily summary for $TODAY_CST (CST)" >> "$LOG_FILE"

PROMPT="Genera un resumen ejecutivo diario para hoy $TODAY_CST con la siguiente información:

1. **Slack**: Busca conversaciones del día con slack_search_public_and_private usando query '$SLACK_DATE_FILTER'. Excluye bots y el propio resumen diario automático. Resume solo conversaciones humanas relevantes: temas discutidos, decisiones, pendientes. Si no hay actividad real, indícalo.

2. **Circleback**: Busca llamadas del día con SearchMeetings (startDate=$YESTERDAY_CST, endDate=$TODAY_CST, pageIndex=0). Para cada llamada incluye: participantes, temas clave, acuerdos y próximos pasos. Si no hay llamadas del día busca las más recientes del día anterior.

3. **Gmail**: Busca correos con search_threads usando query 'after:$GMAIL_YESTERDAY'. Incluye solo correos que involucren gente de dacodes (dominio dacodes.com o dacodes.ai) y clientes reales. Excluye secuencias outbound ('Talent That Delivers', follow-ups genéricos sin respuesta) y newsletters/notificaciones automáticas.

Formato del resumen: usa encabezados claros (**negrita**), bullet points y sé conciso.

Cuando tengas el resumen completo, envíalo por Slack DM al usuario U02G57N1UDP usando slack_send_message. El mensaje debe iniciar con:
📋 *RESUMEN EJECUTIVO DIARIO — $TODAY_CST*"

cd "$SCRIPT_DIR"
"$CLAUDE_BIN" \
  --print \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  "$PROMPT" \
  >> "$LOG_FILE" 2>&1

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Daily summary completed" >> "$LOG_FILE"
