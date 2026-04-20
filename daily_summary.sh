#!/bin/bash
# Daily executive summary — runs at 6pm, sends to Slack

cd /home/user/routines-circleback-gmail-slack

PROMPT='Genera un resumen diario ejecutivo con la siguiente información:

1. **Slack**: Resume las conversaciones más importantes del día.

2. **Circleback**: Resume las llamadas del día.
   Incluye: participantes, temas clave, acuerdos y próximos pasos.

3. **Gmail**: Revisa correos del dia, mandame resumen de correos de todo lo que involucre gente de dacodes y clientes con los que interactuamos. Ignora gente que nos manda correos para vender o correos que mandamos en secuencias.

Formato: usa encabezados claros, bullet points y sé conciso.
Manda el resumen por Slack al DM de Jorge Campos (U02G57N1UDP).'

/opt/node22/bin/claude --print "$PROMPT"
