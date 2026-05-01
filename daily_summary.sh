#!/bin/bash
# Resumen ejecutivo diario — corre a las 6pm via cron
# Cron: 0 18 * * * /home/user/routines-circleback-gmail-slack/daily_summary.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/daily_summary.log"

echo "[$(date)] Iniciando resumen diario..." >> "$LOG_FILE"

cd "$SCRIPT_DIR"

claude --print --no-update-check -p '
Genera un resumen diario ejecutivo con la siguiente información y mándalo vía Slack (DM a U02G57N1UDP):

1. **Slack**: Resume las conversaciones más importantes del día de hoy. Busca mensajes con after: del día de hoy.

2. **Circleback**: Resume las llamadas del día (usa SearchMeetings con startDate y endDate = hoy).
   Incluye: participantes, temas clave, acuerdos y próximos pasos. Si no hay grabaciones aún, lista los eventos del calendario del día con SearchCalendarEvents.

3. **Gmail**: Revisa correos del día (newer_than:1d). Resume SOLO correos que involucren gente de dacodes y clientes activos. Ignora correos de ventas salientes o secuencias automatizadas (subject contiene "Talent That Delivers", "Tu equipo ideal", y similares).

Formato del mensaje Slack: usa encabezados con *, bullet points con •, y sé conciso.
Envía el mensaje directamente a U02G57N1UDP usando slack_send_message (no schedules).
Al final del mensaje incluye la línea: _Resumen generado automáticamente por Claude Code | Rutina diaria 6pm_
' >> "$LOG_FILE" 2>&1

echo "[$(date)] Resumen enviado." >> "$LOG_FILE"
