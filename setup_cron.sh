#!/bin/bash
# Setup del cron job para el resumen diario
# Ejecuta run_daily_summary.sh cada día a las 6pm CST (00:00 UTC)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_JOB="0 0 * * * $SCRIPT_DIR/run_daily_summary.sh"

echo "Configurando cron job para resumen diario a las 6pm CST..."

# Agregar el cron si no existe ya
(crontab -l 2>/dev/null | grep -v "run_daily_summary.sh"; echo "$CRON_JOB") | crontab -

echo "✅ Cron configurado:"
crontab -l | grep "run_daily_summary"
echo ""
echo "Horario: todos los días a las 6:00pm CST (00:00 UTC)"
echo "Logs: $SCRIPT_DIR/logs/"
