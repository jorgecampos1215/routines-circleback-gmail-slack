# Prompt: Resumen Ejecutivo Diario DaCodes

Genera un resumen diario ejecutivo con la siguiente información:

## 1. SLACK
Busca y resume las conversaciones más importantes del día en todos los canales (públicos, privados, DMs).
- Prioriza decisiones, acuerdos, riesgos de cuentas o clientes, y action items
- Agrupa por tema
- Ignora mensajes de bots y notificaciones automáticas

## 2. CIRCLEBACK
Resume las llamadas/reuniones del día.
Para cada reunión incluye:
- Nombre de la reunión
- Participantes (internos y externos)
- Temas clave discutidos
- Acuerdos tomados
- Próximos pasos con fechas si las hay

## 3. GMAIL
Revisa correos del día. Incluye SOLO correos que involucren:
- Gente de DaCodes (dominios: @dacodes.com, @dacodes.ai)
- Clientes activos o prospectos con los que DaCodes interactúa

IGNORA:
- Correos de venta/prospección donde DaCodes es el que vende (secuencias outbound)
- Newsletters, notificaciones automáticas, foros
- Correos de servicios (Vistage, newsletters, etc.)

## FORMATO DE SALIDA
Usa el siguiente formato para el mensaje de Slack:

```
📊 *RESUMEN EJECUTIVO DIARIO — [DÍA] [FECHA]*

---

💬 *SLACK — Conversaciones clave del día*
[bullet points con temas, decisiones, riesgos y action items]

---

🎙️ *CIRCLEBACK — Reuniones del día*
[para cada reunión: nombre en negrita, participantes, temas, acuerdos, próximos pasos]

---

📧 *GMAIL — Correos relevantes del día*
⚡ ACCIÓN REQUERIDA: [correos que requieren respuesta/firma/decisión]
📋 En seguimiento activo: [hilos de clientes/internos activos]

_Generado automáticamente por Claude · DaCodes Daily Brief_
```

## INSTRUCCIÓN FINAL
Una vez compilado el resumen, **envíalo como DM a U02G57N1UDP en Slack**.
NO programes el mensaje — envíalo directamente con slack_send_message.
