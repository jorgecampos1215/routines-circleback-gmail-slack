#!/usr/bin/env bash
# Instala el cron job para enviar el resumen diario a las 6pm (lunes-viernes).
# Uso: bash install_cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$(which python3)"
VENV="$SCRIPT_DIR/.venv/bin/python"

# Usa venv si existe
[[ -f "$VENV" ]] && PYTHON="$VENV"

LOG="$SCRIPT_DIR/logs/daily_summary.log"
CRON_LINE="TZ=America/Mexico_City"$'\n'"0 18 * * 1-5 $PYTHON $SCRIPT_DIR/daily_summary.py >> $LOG 2>&1"

# Agrega solo si no existe ya
if crontab -l 2>/dev/null | grep -qF "daily_summary.py"; then
  echo "El cron job ya está instalado."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "Cron job instalado:"
  echo "  Lunes-Viernes 6:00 PM (America/Mexico_City)"
  echo "  Log: $LOG"
fi

echo ""
echo "Para verificar: crontab -l"
echo "Para desinstalar: crontab -e  (borra la línea de daily_summary.py)"
