#!/bin/bash
# Daily executive summary — runs at 23:00 UTC (6pm Mexico CDT / 5pm CST)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$REPO_DIR/logs/daily_summary_$(date +%Y%m%d).log"

mkdir -p "$REPO_DIR/logs"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting daily summary..." | tee -a "$LOG_FILE"

PROMPT='Genera un resumen diario ejecutivo con la siguiente información y mándamelo por Slack a mi (U02G57N1UDP):

1. **Slack**: Busca con slack_search_public_and_private (after:fecha de ayer) y resume las conversaciones más importantes del día. Si no hay actividad, indícalo.

2. **Circleback**: Busca con SearchMeetings (startDate y endDate = hoy) y resume las llamadas del día. Incluye: participantes, temas clave, acuerdos y próximos pasos. Si no hay llamadas, indícalo.

3. **Gmail**: Busca con search_threads (newer_than:1d) y revisa correos del día. Resume SOLO correos que involucren gente de dacodes (dominios dacodes.com / dacodes.ai) o clientes con los que trabajamos directamente (contratos, proyectos, facturas, acuerdos). IGNORA: correos de ventas de terceros hacia nosotros, y correos que nosotros mandamos en secuencias de prospección (destinatarios que no son clientes activos ni equipo dacodes).

Formato del mensaje Slack: encabezados en negrita, bullet points, conciso. Incluye emoji de sección. Al final incluye: _Generado automáticamente · DaCodes Daily Bot_'

/opt/node22/bin/claude \
  --print \
  --dangerously-skip-permissions \
  "$PROMPT" >> "$LOG_FILE" 2>&1

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Daily summary completed." | tee -a "$LOG_FILE"

# Keep only last 30 days of logs
find "$REPO_DIR/logs" -name "daily_summary_*.log" -mtime +30 -delete 2>/dev/null || true
