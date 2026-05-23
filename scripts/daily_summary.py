"""
Daily Executive Summary — DaCodes
Fetches data from Slack, Circleback, and Gmail, then sends a Slack DM
to the configured user with the executive summary.

Required env vars:
  ANTHROPIC_API_KEY    — Anthropic Claude API key
  SLACK_BOT_TOKEN      — Slack bot OAuth token (xoxb-...)
  CIRCLEBACK_API_KEY   — Circleback API key
  GMAIL_CLIENT_ID      — Gmail OAuth client ID
  GMAIL_CLIENT_SECRET  — Gmail OAuth client secret
  GMAIL_REFRESH_TOKEN  — Gmail OAuth refresh token
  SLACK_TARGET_USER_ID — Slack user ID to DM (default: U02G57N1UDP)
"""

import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any

import anthropic
import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SLACK_TARGET_USER_ID = os.environ.get("SLACK_TARGET_USER_ID", "U02G57N1UDP")
SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CIRCLEBACK_API_KEY = os.environ["CIRCLEBACK_API_KEY"]

TODAY = date.today().isoformat()          # yyyy-mm-dd
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()

# Circleback base URL (verify with your account's API docs)
CIRCLEBACK_BASE = "https://api.circleback.ai/v1"

# ---------------------------------------------------------------------------
# Slack helpers
# ---------------------------------------------------------------------------

slack_client = WebClient(token=SLACK_BOT_TOKEN)


def get_slack_messages(oldest_hours: int = 24) -> list[dict]:
    """Return messages from public + private channels from the last N hours."""
    oldest_ts = str(time.time() - oldest_hours * 3600)
    results = []
    try:
        # Get list of channels the bot is in
        channels_resp = slack_client.conversations_list(
            types="public_channel,private_channel,im,mpim",
            limit=200,
        )
        channels = channels_resp.get("channels", [])
        for ch in channels:
            ch_id = ch["id"]
            try:
                history = slack_client.conversations_history(
                    channel=ch_id, oldest=oldest_ts, limit=100
                )
                msgs = history.get("messages", [])
                # skip bot messages and very short noise
                for m in msgs:
                    if m.get("subtype") or m.get("bot_id"):
                        continue
                    text = m.get("text", "").strip()
                    if len(text) < 10:
                        continue
                    results.append(
                        {
                            "channel": ch.get("name", ch_id),
                            "user": m.get("user", ""),
                            "text": text[:500],
                            "ts": m.get("ts"),
                        }
                    )
            except SlackApiError:
                pass
    except SlackApiError as e:
        print(f"[Slack] Error listing channels: {e}", file=sys.stderr)
    return results


# ---------------------------------------------------------------------------
# Circleback helpers
# ---------------------------------------------------------------------------

def circleback_headers() -> dict:
    return {
        "Authorization": f"Bearer {CIRCLEBACK_API_KEY}",
        "Content-Type": "application/json",
    }


def get_circleback_meetings(start_date: str = YESTERDAY, end_date: str = TODAY) -> list[dict]:
    """Return meetings in the given date range from Circleback."""
    payload = {
        "startDate": start_date,
        "endDate": end_date,
        "pageIndex": 0,
    }
    meetings = []
    try:
        resp = requests.post(
            f"{CIRCLEBACK_BASE}/meetings/search",
            headers=circleback_headers(),
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        # data may be a list or {"meetings": [...]}
        items = data if isinstance(data, list) else data.get("meetings", data.get("results", []))
        meetings.extend(items)
    except Exception as e:
        print(f"[Circleback] Error fetching meetings: {e}", file=sys.stderr)
    return meetings


# ---------------------------------------------------------------------------
# Gmail helpers
# ---------------------------------------------------------------------------

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def get_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GMAIL_REFRESH_TOKEN"],
        client_id=os.environ["GMAIL_CLIENT_ID"],
        client_secret=os.environ["GMAIL_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=GMAIL_SCOPES,
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def get_gmail_threads(query: str, max_results: int = 30) -> list[dict]:
    """Return Gmail thread snippets matching the query."""
    try:
        service = get_gmail_service()
        resp = service.users().threads().list(
            userId="me", q=query, maxResults=max_results
        ).execute()
        threads = resp.get("threads", [])
        results = []
        for t in threads:
            detail = service.users().threads().get(
                userId="me", id=t["id"], format="metadata",
                metadataHeaders=["From", "To", "Cc", "Subject", "Date"],
            ).execute()
            msgs = detail.get("messages", [])
            if not msgs:
                continue
            last = msgs[-1]
            headers = {h["name"]: h["value"] for h in last.get("payload", {}).get("headers", [])}
            results.append(
                {
                    "subject": headers.get("Subject", ""),
                    "from": headers.get("From", ""),
                    "to": headers.get("To", ""),
                    "date": headers.get("Date", ""),
                    "snippet": last.get("snippet", "")[:300],
                }
            )
        return results
    except Exception as e:
        print(f"[Gmail] Error: {e}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# Claude orchestration — tool definitions
# ---------------------------------------------------------------------------

TOOLS: list[dict] = [
    {
        "name": "get_slack_messages",
        "description": (
            "Fetch messages from Slack channels from the last 24 hours. "
            "Returns a list of {channel, user, text, ts} objects."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "hours": {
                    "type": "integer",
                    "description": "How many hours back to fetch (default 24)",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_circleback_meetings",
        "description": (
            "Fetch meetings recorded in Circleback for the given date range. "
            "Returns a list of meeting objects with name, notes, attendees, action_items."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "ISO date (yyyy-mm-dd). Defaults to yesterday.",
                },
                "end_date": {
                    "type": "string",
                    "description": "ISO date (yyyy-mm-dd). Defaults to today.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_gmail_threads",
        "description": (
            "Fetch Gmail threads matching a Gmail search query. "
            "Returns thread metadata and snippets. "
            "Use Gmail query syntax: from:, to:, after:YYYY/MM/DD, -from:noreply, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Gmail search query string",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Max threads to return (default 30)",
                },
            },
            "required": ["query"],
        },
    },
]


def dispatch_tool(name: str, inp: dict) -> Any:
    if name == "get_slack_messages":
        return get_slack_messages(inp.get("hours", 24))
    if name == "get_circleback_meetings":
        return get_circleback_meetings(
            inp.get("start_date", YESTERDAY), inp.get("end_date", TODAY)
        )
    if name == "get_gmail_threads":
        return get_gmail_threads(inp.get("query", ""), inp.get("max_results", 30))
    raise ValueError(f"Unknown tool: {name}")


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = f"""Eres un asistente ejecutivo de DaCodes. Tu tarea es generar un
resumen ejecutivo diario conciso para Jorge Campos (jorge.campos@dacodes.com).

Fecha de hoy: {TODAY}

Sigue estas reglas:
1. Usa los tools disponibles para obtener la información de Slack, Circleback y Gmail.
2. Para Gmail, busca correos del día de hoy y ayer que involucren gente de @dacodes.com
   y clientes. Ignora correos de ventas externas, newsletters, notificaciones automáticas,
   y correos que DaCodes envía en secuencias de outbound.
3. El resumen debe estar en español, con encabezados claros, bullet points y ser conciso.
4. Estructura exacta del resumen:
   - 💬 SLACK — Conversaciones importantes del día
   - 📞 CIRCLEBACK — Llamadas del día (participantes, temas clave, acuerdos, próximos pasos)
   - 📧 GMAIL — Correos relevantes (clientes y equipo dacodes, sin spam/ventas)
5. Al final devuelve SOLO el texto del mensaje Slack formateado en markdown.
   No incluyas explicaciones adicionales, solo el mensaje listo para enviar.
6. Máximo 4,500 caracteres en el mensaje final."""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def generate_summary() -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    messages: list[dict] = [
        {
            "role": "user",
            "content": (
                f"Genera el resumen ejecutivo diario para hoy {TODAY}. "
                "Usa los tools para obtener los datos de Slack, Circleback y Gmail, "
                "luego redacta el resumen completo."
            ),
        }
    ]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        # Collect text blocks and tool calls
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b for b in response.content if b.type == "text"]

        # If no tool calls, we have the final answer
        if not tool_uses:
            return "\n".join(b.text for b in text_blocks).strip()

        # Add assistant turn
        messages.append({"role": "assistant", "content": response.content})

        # Execute all tool calls
        tool_results = []
        for tu in tool_uses:
            print(f"[Tool] Calling {tu.name}({tu.input})", file=sys.stderr)
            try:
                result = dispatch_tool(tu.name, tu.input)
                result_json = json.dumps(result, ensure_ascii=False, default=str)
            except Exception as e:
                result_json = json.dumps({"error": str(e)})
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": result_json,
                }
            )

        messages.append({"role": "user", "content": tool_results})


def send_slack_summary(summary: str) -> None:
    today_fmt = datetime.now(timezone.utc).strftime("%A %d de %B, %Y")
    header = f"📋 **Resumen Ejecutivo Diario — {today_fmt}**\n\n"
    full_message = header + summary
    # Truncate to Slack's 5000-char limit per text element
    full_message = full_message[:4990]
    slack_client.chat_postMessage(channel=SLACK_TARGET_USER_ID, text=full_message)
    print("[Slack] Summary sent successfully.", file=sys.stderr)


def main():
    print(f"[Main] Generating daily summary for {TODAY}...", file=sys.stderr)
    summary = generate_summary()
    send_slack_summary(summary)
    print("[Main] Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
