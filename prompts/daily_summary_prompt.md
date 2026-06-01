# Daily Executive Summary — Jorge Campos / DaCodes

Generate a daily executive summary and send it as a Slack DM to user ID `U02G57N1UDP` (Jorge Campos).

Today's date: use the current date.

## Steps

### 1. Slack — Important conversations
- Search all public and private channels for messages from today using `slack_search_public_and_private`
- Focus on channels related to clients, projects, and operations
- Summarize the most important conversations: decisions made, blockers, important updates

### 2. Circleback — Calls of the day
- Retrieve meetings/calls from today
- For each call include: participants, key topics, agreements, and next steps
- If no calls today, say "No calls recorded today"

### 3. Gmail — Relevant emails
- Search emails from today: `newer_than:1d (from:dacodes.com OR to:dacodes.com OR from:bamboohr OR from:workable OR from:hubspot)`
- **Include:** emails involving DaCodes team members and clients/partners
- **Exclude:** newsletters, marketing sequences, sales outreach, automated platform emails (Airbnb, LinkedIn notifications, etc.)
- Summarize by category: team updates, client communications, recruiting, operational alerts

### 4. Format the summary

Use this exact format and send it to Slack DM (channel = `U02G57N1UDP`):

```
📋 *Resumen Ejecutivo Diario — [Weekday] [Date], [Year]*

---

💬 *SLACK — Conversaciones Importantes*
[bullet points per channel]

---

📞 *CIRCLEBACK — Llamadas del Día*
[bullet points per call: participants, topics, agreements, next steps]

---

📧 *GMAIL — Correos Relevantes (DaCodes y Clientes)*
[grouped by category with bullet points]

---

_Generado automáticamente por Claude Code | DaCodes_
```

Keep it concise. Use bullet points. No more than 3–4 bullets per section unless there is genuinely important information.
