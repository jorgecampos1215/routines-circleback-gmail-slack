#!/usr/bin/env bash
# Daily executive summary — runs at 23:00 UTC (6pm Mexico City CDT)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/daily_summary.log"
mkdir -p "$PROJECT_DIR/logs"

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — Starting daily summary" >> "$LOG_FILE"

TODAY=$(TZ="America/Mexico_City" date '+%Y-%m-%d')
DAY_NAME=$(TZ="America/Mexico_City" date '+%A %d de %B %Y')

PROMPT="Genera un resumen ejecutivo diario para hoy $DAY_NAME.

Recopila la información de estas tres fuentes para el día $TODAY:

1. **Slack**: Busca los mensajes y conversaciones más importantes del día usando mcp__Slack__slack_search_public_and_private con query 'on:$TODAY'. Si no hay nada del día, usa los mensajes más recientes disponibles.

2. **Circleback**: Busca las llamadas del día $TODAY usando mcp__Circleback__SearchMeetings con startDate y endDate = $TODAY. Incluye participantes, temas clave, acuerdos y próximos pasos.

3. **Gmail**: Busca correos con mcp__Gmail__search_threads usando query 'after:${TODAY//-/\/}'. Filtra solo lo relevante para gente de dacodes y clientes activos. Ignora newsletters, ventas, secuencias y correos sin relación.

Formato del resumen con emojis y secciones:
📋 RESUMEN EJECUTIVO DIARIO — [fecha]
---
🔵 SLACK
[contenido]
---
📞 CIRCLEBACK — Llamadas del día
[contenido]
---
📧 GMAIL — Correos relevantes
[contenido]
---
_Resumen generado automáticamente · DaCodes Daily Digest_

Después de generar el resumen, envíalo usando mcp__Slack__slack_send_message al canal/DM ID: U02G57N1UDP."

cd "$PROJECT_DIR"
/opt/node22/bin/claude \
  --print \
  --allowedTools "mcp__Slack__slack_search_public_and_private,mcp__Slack__slack_send_message,mcp__Circleback__SearchMeetings,mcp__Circleback__ReadMeetings,mcp__Gmail__search_threads" \
  "$PROMPT" >> "$LOG_FILE" 2>&1

echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') — Daily summary completed" >> "$LOG_FILE"
