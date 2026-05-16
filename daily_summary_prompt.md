Genera un resumen ejecutivo diario con la siguiente información. Hoy es {TODAY}.

## 1. SLACK
Busca conversaciones importantes del día usando `slack_search_public_and_private` con `on:{TODAY}`.
Si no hay actividad hoy, indícalo brevemente.

## 2. CIRCLEBACK
Busca llamadas del día con `SearchMeetings` filtrando `startDate={TODAY}` y `endDate={TODAY}`.
Si no hay llamadas hoy, busca también en `SearchCalendarEvents` para ese día.
Para cada llamada incluye: participantes, temas clave, acuerdos y próximos pasos.

## 3. GMAIL
Busca correos del día con `search_threads` usando: `after:{TODAY_SLASH} before:{TOMORROW_SLASH}`.
Incluye SOLO correos que involucren gente de dacodes y clientes reales con los que interactuamos.
IGNORA: correos de ventas/secuencias outbound (subject "Talent That Delivers", "Tu equipo ideal", "AI-driven software development"), newsletters, notificaciones automáticas, noreply.
Para cada correo relevante: remitente, destinatario, asunto y resumen del contenido.

## FORMATO DE SALIDA
Usa este formato exacto en el mensaje de Slack:

```
## Resumen Ejecutivo Diario — {DATE_FORMATTED}

---

### 💬 Slack
[resumen o "Sin actividad registrada hoy"]

---

### 📞 Circleback — Llamadas del día
[por cada llamada: nombre, participantes, bullets de temas/acuerdos/próximos pasos]
[si no hay: "Sin llamadas capturadas hoy"]

---

### 📧 Gmail — Correos relevantes (DaCodes + Clientes)
[por cada correo: título en negrita, remitente→destinatario, resumen en bullets]
[iconos de alerta según urgencia: ⚠️ para facturas/pagos, 🚨 para riesgos de colaboradores, ✅ para confirmaciones]

---

_Generado automáticamente a las 6pm | DaCodes Executive Daily Brief_
```

Cuando tengas el resumen completo, envíalo como DM en Slack al usuario con ID `U02G57N1UDP` usando `slack_send_message`.
