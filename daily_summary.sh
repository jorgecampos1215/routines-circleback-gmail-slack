#!/usr/bin/env bash
# Genera y envía el resumen ejecutivo diario a las 6pm vía Slack DM.
# Uso: ./daily_summary.sh
# Cron (6pm CST = 23:00 UTC): 0 23 * * * /home/user/routines-circleback-gmail-slack/daily_summary.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/daily_summary.log"
mkdir -p "$SCRIPT_DIR/logs"

PROMPT='Genera un resumen diario ejecutivo con la siguiente información:

1. **Slack**: Resume las conversaciones más importantes del día.

2. **Circleback**: Resume las llamadas del día.
   Incluye: participantes, temas clave, acuerdos y próximos pasos.

3. **Gmail**: Revisa correos del dia, mandame resumen de correos de todo lo que involucre gente de dacodes y clientes con los que interactuamos. Ignora gente que nos manda correos para vender o correos que mandamos en secuencias.

Formato: usa encabezados claros, bullet points y sé conciso.

Cuando tengas el resumen listo, envíalo como mensaje de Slack DM al usuario U02G57N1UDP (Jorge Campos). No lo programes — envíalo de inmediato con slack_send_message.'

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Iniciando generación de resumen diario..." | tee -a "$LOG_FILE"

claude --print "$PROMPT" 2>&1 | tee -a "$LOG_FILE"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Resumen enviado." | tee -a "$LOG_FILE"
