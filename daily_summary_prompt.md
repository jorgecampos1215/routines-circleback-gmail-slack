# Prompt: Resumen Ejecutivo Diario

Genera un resumen ejecutivo diario con la siguiente información. Usa la fecha de hoy para todas las búsquedas.

## Instrucciones por fuente

### 1. SLACK
- Busca mensajes del día de hoy en todos los canales (públicos, privados, DMs)
- Resume las conversaciones más importantes
- Si no hay actividad, indícalo

### 2. CIRCLEBACK
- Busca todas las reuniones del día de hoy
- Para cada reunión incluye: participantes, temas clave, acuerdos y próximos pasos
- Si no hay reuniones, busca en los últimos 2 días

### 3. GMAIL
- Busca correos del día de hoy
- Incluye SOLO correos que involucren:
  - Personas de DaCodes (@dacodes.com, @dacodes.ai)
  - Clientes activos con los que se interactúa (respuestas reales, propuestas, coordinación)
- IGNORA:
  - Correos de ventas outbound salientes enviados en secuencias automatizadas (asunto: "Tu equipo ideal", "DaCodes- Talent That Delivers", "AI-driven software development")
  - Notificaciones automáticas (BambooHR, Workable, Circleback notifications, calendarios)
  - Newsletters y correos de marketing recibidos

## Formato de salida

Usa este formato exacto para el mensaje de Slack:

```
📋 *RESUMEN EJECUTIVO DIARIO — [Día] [fecha] [año]*

---

*🔵 SLACK*
[resumen o "Sin actividad registrada hoy"]

---

*📞 CIRCLEBACK — Llamadas del día*

[Para cada reunión:]
*[N]. [Nombre de reunión]* _([fecha/hora])_
• *Participantes:* [lista]
• *Temas clave:* [puntos]
• *Acuerdos:* [puntos]
• *Próximos pasos:* [puntos]

---

*📧 GMAIL — Correos relevantes del día*

*[Tema/Cliente]*
• [bullet points con lo más importante]

---

_Resumen generado automáticamente · DaCodes Daily Digest_
```

## Acción final

Una vez compilado el resumen, envíalo como DM a Jorge Campos (Slack user ID: U02G57N1UDP) usando `slack_send_message`.
