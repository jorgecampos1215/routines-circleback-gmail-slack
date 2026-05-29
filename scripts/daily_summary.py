#!/usr/bin/env python3
"""
Daily executive summary: Slack + Circleback + Gmail → Slack DM at 6pm CST.

Required env vars:
  ANTHROPIC_API_KEY   - Anthropic API key
  SLACK_MCP_TOKEN     - Slack OAuth token (xoxp-... or xoxb-...)
  CIRCLEBACK_API_KEY  - Circleback API key
  GMAIL_OAUTH_TOKEN   - Gmail OAuth access token
  SLACK_USER_ID       - Slack user ID to DM (default: U02G57N1UDP)
"""

import os
import sys
import json
from datetime import datetime
import pytz
import anthropic


SLACK_USER_ID = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 8096
CST = pytz.timezone("America/Mexico_City")


def today_cst() -> str:
    return datetime.now(CST).strftime("%Y-%m-%d")


def build_prompt(date: str) -> str:
    return f"""Hoy es {date}. Genera el Resumen Ejecutivo Diario de DaCodes para jorge.campos@dacodes.com.

Sigue estos pasos **en orden** usando las herramientas disponibles:

## PASO 1 — Slack
Busca mensajes de hoy usando `slack_search_public_and_private` con query `on:{date}` y también lee los \
canales más activos. Resume las conversaciones importantes.

## PASO 2 — Circleback
Usa `SearchMeetings` con startDate="{date}" endDate="{date}". \
Si no hay resultados, busca también con startDate="{date}" sin endDate. \
Para cada reunión incluye: participantes, temas clave, acuerdos y próximos pasos.

## PASO 3 — Gmail
Busca con `search_threads` usando query: \
`newer_than:1d (dacodes OR iscam OR cliente) -from:noreply@* -from:no-reply@* -category:promotions` \
Incluye solo correos que involucren gente de DaCodes y clientes reales. \
Ignora correos de ventas outbound en secuencias (subject que contenga "AI-driven" o \
"Tu equipo ideal en software").

## PASO 4 — Enviar resumen
Usa `slack_send_message` con channel_id="{SLACK_USER_ID}" y el siguiente formato:

```
📊 *Resumen Ejecutivo Diario — [fecha larga]*

---

## 💬 Slack
[bullet points con conversaciones importantes, o "Sin actividad nueva hoy"]

---

## 📞 Circleback — Llamadas del Día
[Para cada llamada:]
*[Nombre de la reunión]*
- **Participantes:** [lista]
- [bullet points: temas clave, acuerdos]
- ➡️ **Próximos pasos:** [acciones concretas]

[Si no hubo llamadas: "Sin llamadas grabadas hoy"]

---

## 📧 Gmail — Correos Relevantes
[Agrupados por categoría: Inbound, Confirmaciones, Seguimiento]

---
_Resumen generado automáticamente · DaCodes · {date}_
```

Sé conciso. Usa bullet points. No incluyas contenido irrelevante."""


def build_mcp_servers() -> list[dict]:
    servers = []

    slack_token = os.environ.get("SLACK_MCP_TOKEN")
    if slack_token:
        servers.append({
            "type": "url",
            "url": "https://mcp.slack.com/mcp",
            "name": "Slack",
            "authorization_token": slack_token,
        })

    circleback_token = os.environ.get("CIRCLEBACK_API_KEY")
    if circleback_token:
        servers.append({
            "type": "url",
            "url": "https://app.circleback.ai/api/mcp",
            "name": "Circleback",
            "authorization_token": circleback_token,
        })

    gmail_token = os.environ.get("GMAIL_OAUTH_TOKEN")
    if gmail_token:
        servers.append({
            "type": "url",
            "url": "https://gmailmcp.googleapis.com/mcp/v1",
            "name": "Gmail",
            "authorization_token": gmail_token,
        })

    return servers


def run():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY is required", file=sys.stderr)
        sys.exit(1)

    mcp_servers = build_mcp_servers()
    if not mcp_servers:
        print("ERROR: No MCP server credentials found. Set at least SLACK_MCP_TOKEN.", file=sys.stderr)
        sys.exit(1)

    date = today_cst()
    print(f"[daily-summary] Generating summary for {date}...")

    client = anthropic.Anthropic(api_key=api_key)

    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        mcp_servers=mcp_servers,
        messages=[{"role": "user", "content": build_prompt(date)}],
        betas=["mcp-client-2025-04-04"],
    )

    # Extract text from response
    for block in response.content:
        if hasattr(block, "text"):
            print(f"[daily-summary] Done.\n{block.text[:200]}...")
            break

    print(f"[daily-summary] Stop reason: {response.stop_reason}")


if __name__ == "__main__":
    run()
