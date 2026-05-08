# Resumen Ejecutivo Diario — Prompt para Claude Code

Genera un resumen ejecutivo diario con la siguiente información y mándalo por DM a Slack al usuario U02G57N1UDP.

## Instrucciones

### 1. SLACK
Busca las conversaciones más importantes del día en todos los canales (públicos, privados, DMs).
- Usa `slack_search_public_and_private` con filtro `after:<fecha-hoy>`
- Agrupa por tema/proyecto
- Ignora mensajes de bots

### 2. CIRCLEBACK
Busca las llamadas del día.
- Usa `SearchMeetings` con `startDate` y `endDate` = hoy
- Si no hay resultados, menciona "Sin llamadas registradas hoy"
- Incluye: participantes, temas clave, acuerdos y próximos pasos

### 3. GMAIL
Revisa correos del día.
- Usa `search_threads` con `after:<fecha-hoy> in:inbox -in:draft`
- **Incluir**: correos que involucren gente de DaCodes y clientes activos con los que interactuamos
- **Ignorar**: correos de vendedores externos, newsletters, notificaciones automáticas, y correos de secuencias de outreach (asunto "DaCodes - Talent That Delivers" o similar)

### 4. FORMATO DEL MENSAJE SLACK
Usa el siguiente formato con markdown de Slack:

```
*📋 RESUMEN EJECUTIVO DIARIO — <fecha>*

*💬 SLACK — Conversaciones del día*
<bullets con lo más relevante>

*📞 CIRCLEBACK — Llamadas del día*
<por cada llamada: participantes, temas, acuerdos, próximos pasos>

*📧 GMAIL — Correos relevantes DaCodes / Clientes*
<bullets por cliente/tema>

---
_Generado automáticamente · DaCodes Executive Summary Bot_
```

### 5. ENVÍO
- Usa `slack_send_message` con `channel_id: U02G57N1UDP` (DM a Jorge Campos)
- NO uses `slack_schedule_message` — envía directamente
