#!/bin/bash
# Resumen Ejecutivo Diario DaCodes
# Ejecutar diariamente a las 6pm CST (00:00 UTC)
# Cron: 0 0 * * * /home/user/routines-circleback-gmail-slack/run_daily_summary.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/daily_summary_prompt.md"
LOG_FILE="$SCRIPT_DIR/logs/daily_summary_$(date +%Y-%m-%d).log"

mkdir -p "$SCRIPT_DIR/logs"

echo "[$(date)] Iniciando resumen ejecutivo diario..." | tee -a "$LOG_FILE"

# Ejecutar Claude con el prompt del resumen diario
# --print: modo no interactivo, imprime resultado y termina
# --allowedTools: solo las herramientas necesarias
claude \
  --print \
  --allowedTools "mcp__Slack__slack_search_public_and_private,mcp__Slack__slack_send_message,mcp__Circleback__SearchMeetings,mcp__Circleback__ReadMeetings,mcp__Gmail__search_threads" \
  "$(cat "$PROMPT_FILE")" \
  2>&1 | tee -a "$LOG_FILE"

echo "[$(date)] Resumen completado." | tee -a "$LOG_FILE"
