#!/bin/bash
# Ejecuta el resumen ejecutivo diario usando Claude Code + MCP tools
# Cron sugerido: 0 18 * * 1-5  (6pm de lunes a viernes, hora México CDT)
# Para agregar al cron: crontab -e
# TZ=America/Mexico_City 0 18 * * 1-5 /ruta/a/routines-circleback-gmail-slack/run_daily_summary.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/summary_$(date +%Y%m%d).log"

mkdir -p "$SCRIPT_DIR/logs"

echo "[$(date)] Iniciando resumen ejecutivo diario..." | tee -a "$LOG_FILE"

claude \
  --print \
  --dangerously-skip-permissions \
  "$(cat "$SCRIPT_DIR/daily_summary.md")" \
  >> "$LOG_FILE" 2>&1

echo "[$(date)] Resumen ejecutivo completado." | tee -a "$LOG_FILE"
