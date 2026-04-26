#!/usr/bin/env bash
# Instala el timer systemd para el resumen diario a las 6pm CST (23:00 UTC).
# Uso: sudo bash setup_cron.sh
#
# Alternativa con cron (si crontab está disponible):
#   crontab -e
#   0 23 * * * /home/user/routines-circleback-gmail-slack/daily_summary.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="/etc/systemd/system"

chmod +x "$SCRIPT_DIR/daily_summary.sh"
mkdir -p "$SCRIPT_DIR/logs"

if command -v systemctl &>/dev/null; then
    echo "Instalando timer systemd..."
    cp "$SCRIPT_DIR/dacodes-daily-summary.service" "$SYSTEMD_DIR/"
    cp "$SCRIPT_DIR/dacodes-daily-summary.timer" "$SYSTEMD_DIR/"
    systemctl daemon-reload
    systemctl enable --now dacodes-daily-summary.timer
    echo "Timer instalado y activo. Próxima ejecución:"
    systemctl list-timers dacodes-daily-summary.timer --no-pager
elif command -v crontab &>/dev/null; then
    echo "Instalando cron job..."
    CRON_JOB="0 23 * * * $SCRIPT_DIR/daily_summary.sh >> $SCRIPT_DIR/logs/cron.log 2>&1"
    if crontab -l 2>/dev/null | grep -qF "$SCRIPT_DIR/daily_summary.sh"; then
        echo "El cron job ya existe. Sin cambios."
    else
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "Cron job instalado: $CRON_JOB"
    fi
else
    echo "ERROR: No se encontró systemctl ni crontab."
    echo "Agrega manualmente a tu scheduler:"
    echo "  0 23 * * * $SCRIPT_DIR/daily_summary.sh"
    exit 1
fi
