#!/usr/bin/env python3
"""
Daily Executive Summary Generator
Gathers data from Slack, Circleback, and Gmail, then sends a formatted
summary to Slack via DM at 6pm CST.
"""

import os
import sys
import json
import datetime
from typing import Optional
from zoneinfo import ZoneInfo

import anthropic
import requests
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


# ── Configuration ─────────────────────────────────────────────────────────────
TZ = ZoneInfo("America/Mexico_City")

ANTHROPIC_API_KEY  = os.environ["ANTHROPIC_API_KEY"]
SLACK_BOT_TOKEN    = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID      = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")
CIRCLEBACK_API_KEY = os.environ["CIRCLEBACK_API_KEY"]

GMAIL_CLIENT_ID      = os.environ["GMAIL_CLIENT_ID"]
GMAIL_CLIENT_SECRET  = os.environ["GMAIL_CLIENT_SECRET"]
GMAIL_REFRESH_TOKEN  = os.environ["GMAIL_REFRESH_TOKEN"]

CIRCLEBACK_BASE_URL = "https://api.circleback.ai/v1"
MODEL               = "claude-sonnet-4-6"


# ── Data fetchers ──────────────────────────────────────────────────────────────

def get_slack_messages(date: datetime.date) -> list[dict]:
    """Return human-authored messages from today across all accessible channels."""
    client = WebClient(token=SLACK_BOT_TOKEN)
    start_ts = str(datetime.datetime(date.year, date.month, date.day,
                                     tzinfo=TZ).timestamp())
    end_ts   = str(datetime.datetime(date.year, date.month, date.day,
                                     23, 59, 59, tzinfo=TZ).timestamp())
    messages = []
    try:
        result = client.search_messages(
            query=f"after:{date.strftime('%Y-%m-%d')} before:{(date + datetime.timedelta(days=1)).strftime('%Y-%m-%d')}",
            sort="timestamp",
            sort_dir="desc",
            count=50,
        )
        for match in result.get("messages", {}).get("matches", []):
            messages.append({
                "channel": match.get("channel", {}).get("name", ""),
                "user":    match.get("username", match.get("user", "")),
                "text":    match.get("text", ""),
                "ts":      match.get("ts", ""),
            })
    except SlackApiError as e:
        print(f"[WARN] Slack search error: {e.response['error']}", file=sys.stderr)
    return messages


def get_circleback_meetings(date: datetime.date) -> list[dict]:
    """Return Circleback meetings for the given date."""
    date_str = date.isoformat()
    headers  = {"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"}
    meetings = []
    try:
        resp = requests.get(
            f"{CIRCLEBACK_BASE_URL}/meetings",
            params={"start_date": date_str, "end_date": date_str, "page": 0, "per_page": 50},
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data if isinstance(data, list) else data.get("meetings", data.get("data", []))
        for item in items:
            meetings.append({
                "name":       item.get("name", ""),
                "date":       item.get("created_at", date_str),
                "attendees":  [a.get("email", a.get("name", "")) for a in item.get("attendees", [])],
                "notes":      item.get("notes", ""),
                "action_items": [a.get("text", str(a)) for a in item.get("action_items", [])],
            })
    except Exception as e:
        print(f"[WARN] Circleback error: {e}", file=sys.stderr)
    return meetings


def get_gmail_threads(date: datetime.date) -> list[dict]:
    """Return relevant Gmail threads from today (dacodes + clients, no spam/sequences)."""
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)

    date_str = date.strftime("%Y/%m/%d")
    next_str = (date + datetime.timedelta(days=1)).strftime("%Y/%m/%d")

    query = (
        f"after:{date_str} before:{next_str} "
        "-from:noreply -from:no-reply -from:automated -from:notifications@ "
        "-category:promotions -category:social "
        "(from:@dacodes.com OR to:@dacodes.com)"
    )

    threads_data = []
    try:
        result = service.users().threads().list(userId="me", q=query, maxResults=30).execute()
        for thread_meta in result.get("threads", []):
            thread = service.users().threads().get(
                userId="me", id=thread_meta["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date"],
            ).execute()
            messages = []
            for msg in thread.get("messages", []):
                headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                snippet = msg.get("snippet", "")
                messages.append({
                    "from":    headers.get("From", ""),
                    "to":      headers.get("To", ""),
                    "subject": headers.get("Subject", ""),
                    "date":    headers.get("Date", ""),
                    "snippet": snippet[:300],
                })
            if messages:
                threads_data.append({"thread_id": thread_meta["id"], "messages": messages})
    except Exception as e:
        print(f"[WARN] Gmail error: {e}", file=sys.stderr)
    return threads_data


# ── Summary generator ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres un asistente ejecutivo que genera resúmenes diarios concisos para el co-fundador de una empresa de software llamada DaCodes.
El resumen debe estar en español, usar bullet points y encabezados Markdown en negrita.
Sé conciso: máximo 3-4 bullets por sección. Filtra el ruido (newsletters, correos de venta, notificaciones automáticas).
Enfócate en lo que requiere atención o acción del día. Si no hay actividad en una sección, indícalo brevemente."""

def generate_summary(
    date: datetime.date,
    slack_messages: list[dict],
    meetings: list[dict],
    gmail_threads: list[dict],
) -> str:
    client   = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    day_name = date.strftime("%A %d de %B, %Y")

    user_content = f"""Genera el Resumen Ejecutivo Diario para el {day_name}.

## Datos de Slack ({len(slack_messages)} mensajes)
{json.dumps(slack_messages, ensure_ascii=False, indent=2) if slack_messages else "Sin mensajes."}

## Datos de Circleback ({len(meetings)} reuniones)
{json.dumps(meetings, ensure_ascii=False, indent=2) if meetings else "Sin reuniones registradas."}

## Datos de Gmail ({len(gmail_threads)} hilos relevantes)
{json.dumps(gmail_threads, ensure_ascii=False, indent=2) if gmail_threads else "Sin correos relevantes."}

Formato de salida esperado:
📋 *Resumen Ejecutivo Diario — {day_name}*

*💬 Slack*
- ...

*📞 Llamadas (Circleback)*
- ...

*📧 Gmail*
- ...

*⚠️ Pendientes / Próximos pasos*
- ...
"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return response.content[0].text


# ── Slack sender ───────────────────────────────────────────────────────────────

def send_to_slack(message: str, user_id: str) -> None:
    client = WebClient(token=SLACK_BOT_TOKEN)
    client.chat_postMessage(
        channel=user_id,
        text=message,
        mrkdwn=True,
    )
    print(f"[OK] Summary sent to {user_id}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    today = datetime.date.today()
    print(f"[INFO] Generating daily summary for {today}")

    slack_messages = get_slack_messages(today)
    print(f"[INFO] Slack: {len(slack_messages)} messages")

    meetings = get_circleback_meetings(today)
    print(f"[INFO] Circleback: {len(meetings)} meetings")

    gmail_threads = get_gmail_threads(today)
    print(f"[INFO] Gmail: {len(gmail_threads)} threads")

    summary = generate_summary(today, slack_messages, meetings, gmail_threads)
    print("[INFO] Summary generated")

    send_to_slack(summary, SLACK_USER_ID)


if __name__ == "__main__":
    main()
