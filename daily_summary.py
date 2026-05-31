"""
Resumen Ejecutivo Diario — DaCodes
Fetches Slack, Circleback, and Gmail data, then sends a daily summary via Slack DM.

Required environment variables:
  ANTHROPIC_API_KEY   — Anthropic API key
  SLACK_USER_TOKEN    — Slack user OAuth token (xoxp-...) with search:read, channels:history,
                        im:history, mpim:history, users:read, chat:write scopes
  SLACK_USER_ID       — Slack user ID to DM (e.g. U02G57N1UDP)
  CIRCLEBACK_API_KEY  — Circleback API key (Settings → Integrations → API)
  GMAIL_CREDENTIALS   — Base64-encoded Google service account JSON (with Gmail API access)
                        OR set GMAIL_TOKEN for a pre-authorized OAuth token JSON
  GMAIL_USER_EMAIL    — Gmail address to query (e.g. jorge.campos@dacodes.com)
"""

import os
import json
import base64
import datetime
import zoneinfo
from pathlib import Path

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import requests
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
import email as email_lib


# ── Config ────────────────────────────────────────────────────────────────────

TZ = zoneinfo.ZoneInfo("America/Mexico_City")
SLACK_USER_ID = os.environ["SLACK_USER_ID"]
GMAIL_USER   = os.environ["GMAIL_USER_EMAIL"]
DACODES_DOMAIN = "dacodes.com"

# ── Slack helpers ─────────────────────────────────────────────────────────────

def fetch_slack_messages(since_ts: float, limit: int = 60) -> list[dict]:
    """Return the most recent human messages across all accessible channels."""
    client = WebClient(token=os.environ["SLACK_USER_TOKEN"])
    results = []
    try:
        resp = client.search_messages(
            query=f"after:{datetime.date.today() - datetime.timedelta(days=1)}",
            sort="timestamp",
            sort_dir="desc",
            count=limit,
        )
        for msg in resp["messages"]["matches"]:
            if msg.get("username") and not msg.get("bot_id"):
                results.append({
                    "channel": msg.get("channel", {}).get("name", ""),
                    "user": msg.get("username", ""),
                    "text": msg.get("text", ""),
                    "ts": msg.get("ts", ""),
                })
    except SlackApiError as e:
        print(f"Slack error: {e.response['error']}")
    return results


# ── Circleback helpers ────────────────────────────────────────────────────────

def fetch_circleback_meetings(date_str: str) -> list[dict]:
    """Return meeting summaries for the given date (YYYY-MM-DD)."""
    api_key = os.environ["CIRCLEBACK_API_KEY"]
    url = "https://api.circleback.ai/v1/meetings"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    params = {"startDate": date_str, "endDate": date_str, "limit": 50}
    meetings = []
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        for m in data.get("meetings", data if isinstance(data, list) else []):
            meetings.append({
                "name": m.get("name", m.get("title", "")),
                "attendees": [a.get("name", a.get("email", "")) for a in m.get("attendees", [])],
                "notes": m.get("notes", ""),
                "action_items": [ai.get("title", str(ai)) for ai in m.get("actionItems", [])],
            })
    except Exception as e:
        print(f"Circleback error: {e}")
    return meetings


# ── Gmail helpers ─────────────────────────────────────────────────────────────

def _gmail_service():
    if token_json := os.environ.get("GMAIL_TOKEN"):
        creds = Credentials.from_authorized_user_info(json.loads(token_json))
    else:
        sa_json = json.loads(base64.b64decode(os.environ["GMAIL_CREDENTIALS"]))
        creds = service_account.Credentials.from_service_account_info(
            sa_json,
            scopes=["https://www.googleapis.com/auth/gmail.readonly"],
            subject=GMAIL_USER,
        )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def fetch_gmail_threads(date_str: str) -> list[dict]:
    """Return email threads from today involving dacodes.com or known clients."""
    service = _gmail_service()
    query = (
        f"newer_than:1d "
        f"(from:{DACODES_DOMAIN} OR to:{DACODES_DOMAIN}) "
        f"-from:noreply -from:no-reply -from:notifications@ "
        f"-category:promotions -category:social"
    )
    results = []
    resp = service.users().threads().list(userId="me", q=query, maxResults=40).execute()
    for thread_stub in resp.get("threads", []):
        thread = service.users().threads().get(
            userId="me", id=thread_stub["id"], format="metadata",
            metadataHeaders=["Subject", "From", "To", "Cc", "Date"],
        ).execute()
        messages = thread.get("messages", [])
        if not messages:
            continue
        headers = {h["name"]: h["value"] for h in messages[-1].get("payload", {}).get("headers", [])}
        results.append({
            "subject": headers.get("Subject", ""),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "date": headers.get("Date", ""),
            "snippet": messages[-1].get("snippet", ""),
        })
    return results


# ── Summary generation ────────────────────────────────────────────────────────

def generate_summary(
    date_label: str,
    slack_msgs: list[dict],
    meetings: list[dict],
    emails: list[dict],
) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    slack_text = json.dumps(slack_msgs, ensure_ascii=False, indent=2) if slack_msgs else "Sin mensajes nuevos hoy."
    meetings_text = json.dumps(meetings, ensure_ascii=False, indent=2) if meetings else "Sin llamadas grabadas hoy."
    emails_text = json.dumps(emails, ensure_ascii=False, indent=2) if emails else "Sin correos relevantes hoy."

    prompt = f"""Eres el asistente ejecutivo de Jorge Campos, Co-CEO de DaCodes.
Genera un resumen ejecutivo diario conciso en español para el {date_label}.

Datos crudos:

=== SLACK (mensajes del día) ===
{slack_text}

=== CIRCLEBACK (llamadas del día) ===
{meetings_text}

=== GMAIL (correos relevantes del día) ===
{emails_text}

Instrucciones:
- Usa encabezados con emoji: 💬 SLACK, 📞 CIRCLEBACK, 📧 GMAIL
- Bullet points concisos; destaca acciones pendientes con "🔎 Acción"
- Ignora correos de ventas, newsletters, notificaciones automáticas (Airbnb, tiendas, etc.)
- Incluye SOLO emails que involucren a personas de DaCodes o clientes/prospectos de negocio
- Para reuniones: menciona participantes, temas clave, acuerdos y próximos pasos
- Formato Slack (usa *negrita*, _cursiva_, bullet con •)
- Máximo 60 líneas total"""

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── Slack send ────────────────────────────────────────────────────────────────

def send_slack_dm(text: str) -> str:
    client = WebClient(token=os.environ["SLACK_USER_TOKEN"])
    resp = client.chat_postMessage(channel=SLACK_USER_ID, text=text)
    return resp["ts"]


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    now_mx = datetime.datetime.now(TZ)
    date_str = now_mx.strftime("%Y-%m-%d")
    date_label = now_mx.strftime("%A %d de %B %Y")

    print(f"Generating daily summary for {date_str} ({date_label})…")

    slack_msgs = fetch_slack_messages(since_ts=0)
    print(f"  Slack: {len(slack_msgs)} messages")

    meetings = fetch_circleback_meetings(date_str)
    print(f"  Circleback: {len(meetings)} meetings")

    emails = fetch_gmail_threads(date_str)
    print(f"  Gmail: {len(emails)} threads")

    header = f"📊 *Resumen Ejecutivo Diario — {date_label}*\n\n---\n\n"
    summary = generate_summary(date_label, slack_msgs, meetings, emails)
    full_message = header + summary

    ts = send_slack_dm(full_message)
    print(f"  ✅ Slack DM sent (ts={ts})")


if __name__ == "__main__":
    main()
