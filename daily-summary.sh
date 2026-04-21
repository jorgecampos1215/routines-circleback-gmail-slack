#!/bin/bash
# Daily Executive Summary - runs at 6pm CST (Merida, UTC-6) = midnight UTC
# Sends a summary of Slack, Circleback, and Gmail activity to Slack DM

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_CONFIG="$SCRIPT_DIR/.mcp-config.json"
LOG_FILE="/var/log/daily-summary.log"
CLAUDE_BIN="/opt/node22/bin/claude"

# Date in CST (Merida, UTC-6) - at midnight UTC it's still "today" in CST
TODAY=$(TZ=America/Merida date '+%Y-%m-%d')
YESTERDAY=$(TZ=America/Merida date -d 'yesterday' '+%Y-%m-%d')
GMAIL_DATE=$(TZ=America/Merida date '+%Y/%m/%d')
GMAIL_YESTERDAY=$(TZ=America/Merida date -d 'yesterday' '+%Y/%m/%d')

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting daily summary for $TODAY" >> "$LOG_FILE"

PROMPT="Genera un resumen ejecutivo diario para hoy $TODAY con la siguiente información:

1. **Slack**: Busca conversaciones del día con slack_search_public_and_private usando query 'after:$YESTERDAY'. Resume los temas más importantes. Si no hay nada de hoy, indica que no hubo actividad registrada.

2. **Circleback**: Busca llamadas del día con SearchMeetings (startDate=$YESTERDAY, endDate=$TODAY, pageIndex=0). Para cada llamada incluye: participantes, temas clave, acuerdos y próximos pasos. Si no hay llamadas del día busca las más recientes de los últimos 2 días.

3. **Gmail**: Busca correos con search_threads usando query 'after:$GMAIL_YESTERDAY'. Incluye solo correos que involucren gente de dacodes (dominio dacodes.com o dacodes.ai) y clientes reales con quienes interactuamos. Excluye correos de secuencias outbound de ventas ('Talent That Delivers', follow-ups genéricos) y newsletters/notificaciones automáticas.

Formato del resumen: usa encabezados claros (**negrita**), bullet points y sé conciso.

Cuando tengas el resumen completo, envíalo por Slack DM al usuario U02G57N1UDP usando slack_send_message. El mensaje debe iniciar con:
📋 *RESUMEN EJECUTIVO DIARIO — $TODAY*"

cd "$SCRIPT_DIR"
"$CLAUDE_BIN" \
  --print \
  --dangerously-skip-permissions \
  --mcp-config "$MCP_CONFIG" \
  "$PROMPT" \
  >> "$LOG_FILE" 2>&1

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Daily summary completed" >> "$LOG_FILE"
