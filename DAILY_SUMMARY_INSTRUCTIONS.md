# Instrucciones: Resumen Ejecutivo Diario

Genera y envía un resumen ejecutivo diario a Jorge Campos (Slack user ID: U02G57N1UDP) como DM.

## Pasos a seguir:

### 1. SLACK — Conversaciones Importantes
- Busca mensajes de hoy en todos los canales y DMs usando `slack_search_public_and_private` con `during:today` o la fecha del día actual
- Extrae las conversaciones más relevantes (ignora mensajes triviales o de bots)
- Enfócate en: decisiones tomadas, temas de negocio, contrataciones, clientes, deals

### 2. CIRCLEBACK — Llamadas del Día
- Si Circleback está autenticado, usa las herramientas de Circleback para obtener las reuniones de hoy
- Si no, busca en Gmail correos de `notifications@circleback.ai` con fecha de hoy usando `search_threads` con query: `from:notifications@circleback.ai newer_than:1d`
- Para cada reunión encontrada, usa `get_thread` para leer el contenido completo
- Extrae: participantes, temas clave, acuerdos, próximos pasos y action items

### 3. GMAIL — Correos Relevantes
- Busca con `search_threads` usando: `newer_than:1d -category:promotions -from:noreply`
- **INCLUIR:** correos donde participen personas de @dacodes.com y clientes activos
- **EXCLUIR:** newsletters, secuencias de ventas automatizadas (busca patrones como "Última vez que te escribo", "Hola [nombre], Quería compartirte"), notificaciones de apps (BambooHR, Workable, HubSpot automáticos), redes sociales

### 4. Formato del Mensaje Slack

Usa exactamente este formato en Markdown de Slack:

```
📋 *Resumen Ejecutivo Diario — [Día] [Fecha]*

---

💬 *SLACK — Conversaciones Importantes*
[bullet points con lo más relevante]

---

📞 *CIRCLEBACK — Reuniones del Día*
[Para cada reunión:]
*[Nombre de la reunión]*
_Participantes: [lista]_
• [tema 1]
• [acuerdos/decisiones]
• [próximos pasos]

---

📧 *GMAIL — Correos Relevantes (DaCodes y Clientes)*
[bullet points agrupados por tema]

---
_Generado automáticamente por Claude Code | DaCodes_
```

### 5. Enviar el mensaje
- Usa `slack_send_message` con `channel_id: "U02G57N1UDP"` (DM a Jorge Campos)
- NO uses `slack_send_message_draft` — envía directamente

## Notas importantes:
- Fecha actual: usa la fecha de hoy del sistema
- Si no hay actividad en alguna sección, indica "Sin actividad relevante hoy"
- Sé conciso pero completo — el objetivo es que Jorge tenga visibilidad total del día en 2 minutos
