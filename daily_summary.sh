#!/bin/bash
# Genera y envía el resumen ejecutivo diario a las 6pm via Slack
# Cron: 0 18 * * * /home/user/routines-circleback-gmail-slack/daily_summary.sh

cd /home/user/routines-circleback-gmail-slack

TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

PROMPT="Genera un resumen ejecutivo diario para hoy $TODAY con la siguiente información y mándalo a mi Slack (usuario U02G57N1UDP) en dos mensajes separados para no exceder el límite de caracteres:

1. SLACK: Busca mensajes del día de hoy ($TODAY) y ayer ($YESTERDAY). Resume las conversaciones más importantes: temas tratados, decisiones, pendientes. Ignora mensajes triviales de una sola palabra.

2. CIRCLEBACK: Busca reuniones del día de hoy ($TODAY). Para cada reunión incluye: nombre, participantes, temas clave, acuerdos y próximos pasos. Si no hay reuniones de hoy, usa las de $YESTERDAY.

3. GMAIL: Busca correos del día de hoy ($TODAY). Resume SOLO los correos que involucren: (a) personas con dominio @dacodes.com o @dacodes.ai, o (b) clientes activos con los que DaCodes interactúa. IGNORA completamente: correos de secuencias outbound enviados desde jorge.campos@dacodes.ai a prospectos fríos, correos de vendedores externos que intentan vender algo a DaCodes, newsletters y notificaciones automáticas.

Formato del mensaje Slack:
- Usa *negrita* para encabezados de sección
- Bullet points con guión (-)
- Emojis de sección: SLACK, CIRCLEBACK, GMAIL, PROXIMOS PASOS
- Sé conciso pero completo
- Al final siempre incluye sección PROXIMOS PASOS con los items críticos de los próximos 2 días

Envía el resumen en dos mensajes al usuario U02G57N1UDP en Slack."

claude --dangerously-skip-permissions -p "$PROMPT"
