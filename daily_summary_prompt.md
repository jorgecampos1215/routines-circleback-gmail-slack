# Rutina: Resumen Ejecutivo Diario

**Frecuencia:** Lunes a viernes a las 6:00 PM CST  
**Destino:** Slack DM → U02G57N1UDP (Jorge Campos)

## Instrucciones para el agente

Genera un resumen diario ejecutivo con la siguiente información y envíalo por Slack DM al usuario `U02G57N1UDP`.

### 1. Slack

Busca las conversaciones más importantes del día:
- Usa `slack_search_public_and_private` con `query: "during:today"` y `sort: timestamp`
- Resume los temas clave, acuerdos y próximos pasos mencionados
- Prioriza: staffing, ventas, clientes, proyectos activos

### 2. Circleback

Resume las llamadas del día si el conector está autenticado.

- Incluye: participantes, temas clave, acuerdos y próximos pasos
- Si no está disponible: indicar que requiere autenticación OAuth en claude.ai → Connectors → Circleback

### 3. Gmail

Revisa correos relevantes del día con `search_threads`, query: `newer_than:1d`.

**Incluir:**
- Correos de personas con dominio `@dacodes.com`
- Correos de clientes activos (inter.mx, banorte, etc.)
- Leads inbound (HubSpot notifications)
- Workable / Deel / BambooHR con info de equipo o candidatos
- Invitaciones de calendario de personas internas

**Ignorar:**
- Correos de vendedores externos (cold outreach)
- Airbnb, personal, newsletters
- Correos en secuencias de ventas entrantes (unsubscribe, promotions)

---

## Formato del mensaje Slack

```
📋 *Resumen Ejecutivo Diario — [Día, fecha]*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 *SLACK — Conversaciones del día*
[bullets con temas, acuerdos, próximos pasos]

---

📞 *CIRCLEBACK — Llamadas del día*
[bullets por call: participantes, tema, acuerdos, next steps]

---

📧 *GMAIL — Correos relevantes DaCodes / Clientes*
[bullets agrupados por prioridad: Urgente 🔴 / Seguimiento 🟡 / Info 📂]

---
_Generado automáticamente · [fecha]_
```

- Usa emojis de sección y bullet points concisos
- Marca próximos pasos con ✅
- Agrupa correos por urgencia si hay muchos
