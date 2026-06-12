#!/usr/bin/env python3
"""
Daily Executive Summary — DaCodes
Fetches data from Slack, Circleback (via Gmail notifications), and Gmail,
then sends a summary DM to jorge.campos@dacodes.com via Slack at 6 PM.

Required env vars:
  SLACK_BOT_TOKEN        — Bot token with channels:history, search:read, chat:write
  GMAIL_CREDENTIALS_JSON — Service account JSON or OAuth credentials path
  ANTHROPIC_API_KEY      — For AI summarization
  SLACK_USER_ID          — Target user's Slack user ID (default: U02G57N1UDP)
"""

import os
import json
import base64
import re
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

import anthropic

# ── Dependencies: pip install anthropic google-auth google-auth-oauthlib
#    google-auth-httplib2 google-api-python-client slack-sdk

try:
    from slack_sdk import WebClient as SlackClient
    from slack_sdk.errors import SlackApiError
    from googleapiclient.discovery import build as gmail_build
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    import google.auth
except ImportError:
    SlackClient = None  # graceful degradation in import-only contexts


SLACK_USER_ID = os.getenv("SLACK_USER_ID", "U02G57N1UDP")
DACODES_DOMAIN = "dacodes.com"

# Sales/noise senders to ignore
IGNORED_SENDER_PATTERNS = [
    r"noreply@", r"no-reply@", r"newsletter@", r"notifications@linkedin",
    r"invitations@linkedin", r"@email-marriott", r"@airbnb\.com",
    r"notifications@app\.bamboohr",  # HR notifications are included separately
    r"@myvistage", r"biautomation", r"stephensteers", r"montecarlodata",
    r"@luma-mail",
]


def is_noise_email(sender: str) -> bool:
    sender_lower = sender.lower()
    return any(re.search(p, sender_lower) for p in IGNORED_SENDER_PATTERNS)


def get_today_bounds() -> tuple[str, str]:
    """Return (start_ts, end_ts) as ISO date strings for today in UTC."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.strftime("%Y/%m/%d"), end.strftime("%Y/%m/%d")


def fetch_gmail_threads(service, query: str, max_results: int = 30) -> list[dict]:
    """Return list of thread dicts with subject, sender, snippet, date."""
    result = service.users().threads().list(
        userId="me", q=query, maxResults=max_results
    ).execute()
    threads = result.get("threads", [])
    enriched = []
    for t in threads:
        full = service.users().threads().get(
            userId="me", threadId=t["id"], format="metadata",
            metadataHeaders=["Subject", "From", "To", "Date"]
        ).execute()
        messages = full.get("messages", [])
        if not messages:
            continue
        last = messages[-1]
        headers = {h["name"]: h["value"] for h in last.get("payload", {}).get("headers", [])}
        sender = headers.get("From", "")
        if is_noise_email(sender):
            continue
        enriched.append({
            "subject": headers.get("Subject", "(sin asunto)"),
            "sender": sender,
            "to": headers.get("To", ""),
            "date": headers.get("Date", ""),
            "snippet": last.get("snippet", ""),
        })
    return enriched


def fetch_slack_messages(client: "SlackClient", days_back: int = 1) -> list[dict]:
    """Search for Slack messages from the last N days across all channels."""
    since = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    try:
        resp = client.search_messages(
            query=f"after:{since}",
            sort="timestamp",
            sort_dir="desc",
            count=50,
        )
        matches = resp.get("messages", {}).get("matches", [])
        return [
            {
                "channel": m.get("channel", {}).get("name", ""),
                "user": m.get("username", m.get("user", "")),
                "text": m.get("text", ""),
                "ts": m.get("ts", ""),
            }
            for m in matches
        ]
    except SlackApiError:
        return []


def fetch_circleback_notes(service) -> list[dict]:
    """Extract meeting notes from Circleback email notifications received today."""
    today_start, today_end = get_today_bounds()
    query = f"from:notifications@circleback.ai after:{today_start} before:{today_end}"
    result = service.users().threads().list(userId="me", q=query, maxResults=5).execute()
    threads = result.get("threads", [])
    notes = []
    for t in threads:
        full = service.users().threads().get(
            userId="me", threadId=t["id"], format="full"
        ).execute()
        messages = full.get("messages", [])
        for msg in messages:
            payload = msg.get("payload", {})
            body = _extract_body(payload)
            if body:
                notes.append({"body": body[:8000]})
    return notes


def _extract_body(payload: dict) -> str:
    """Recursively extract plain text body from Gmail message payload."""
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace") if data else ""
    for part in payload.get("parts", []):
        text = _extract_body(part)
        if text:
            return text
    return ""


def build_summary_with_ai(
    slack_messages: list[dict],
    circleback_notes: list[dict],
    gmail_threads: list[dict],
    today: str,
) -> str:
    """Use Claude to generate the executive summary."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    slack_section = json.dumps(slack_messages, ensure_ascii=False, indent=2) if slack_messages else "Sin mensajes nuevos."
    cb_section = json.dumps(circleback_notes, ensure_ascii=False, indent=2) if circleback_notes else "Sin llamadas registradas hoy."
    gmail_section = json.dumps(gmail_threads, ensure_ascii=False, indent=2) if gmail_threads else "Sin correos relevantes hoy."

    prompt = f"""Genera un resumen ejecutivo diario en español para Jorge Campos (Co-CEO de DaCodes).
Hoy es {today}.

Usa este formato con emojis Slack y markdown:
- :speech_balloon: SLACK — resume las conversaciones más importantes del día
- :telephone_receiver: CIRCLEBACK — resume llamadas del día (participantes, temas, acuerdos, próximos pasos)
- :e-mail: GMAIL — solo emails de/a gente de DaCodes o clientes reales; ignora ventas, newsletters y secuencias

Sé conciso, usa bullet points. Marca con ⚠️ lo urgente y ✅ lo resuelto.

--- SLACK DATA ---
{slack_section}

--- CIRCLEBACK DATA ---
{cb_section}

--- GMAIL DATA ---
{gmail_section}

Termina con una línea: "_Generado automáticamente por Claude Code | DaCodes_"
"""

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def get_6pm_timestamp() -> int:
    """Return Unix timestamp for 6 PM Mexico City time (UTC-5 CDT in summer, UTC-6 CST in winter)."""
    now_utc = datetime.now(timezone.utc)
    # Mexico City offset: CDT (UTC-5) Apr–Oct, CST (UTC-6) Nov–Mar
    month = now_utc.month
    offset_hours = -5 if 4 <= month <= 10 else -6
    mx_tz = timezone(timedelta(hours=offset_hours))
    now_mx = now_utc.astimezone(mx_tz)
    target_mx = now_mx.replace(hour=18, minute=0, second=0, microsecond=0)
    if target_mx <= now_mx:
        target_mx += timedelta(days=1)
    return int(target_mx.timestamp())


def main():
    # ── Auth ──────────────────────────────────────────────────────────────────
    slack = SlackClient(token=os.environ["SLACK_BOT_TOKEN"])

    creds_path = os.environ.get("GMAIL_CREDENTIALS_JSON", "credentials.json")
    creds = Credentials.from_authorized_user_file(creds_path, scopes=[
        "https://www.googleapis.com/auth/gmail.readonly"
    ])
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    gmail = gmail_build("gmail", "v1", credentials=creds)

    # ── Fetch ─────────────────────────────────────────────────────────────────
    today_start, today_end = get_today_bounds()
    gmail_query = (
        f"(from:{DACODES_DOMAIN} OR to:{DACODES_DOMAIN}) "
        f"after:{today_start} before:{today_end} "
        "-from:noreply -from:no-reply -category:promotions"
    )

    slack_messages = fetch_slack_messages(slack, days_back=1)
    circleback_notes = fetch_circleback_notes(gmail)
    gmail_threads = fetch_gmail_threads(gmail, query=gmail_query)

    today_str = datetime.now(timezone.utc).strftime("%A %d de %B, %Y")
    summary = build_summary_with_ai(slack_messages, circleback_notes, gmail_threads, today_str)

    # ── Send (or schedule) ────────────────────────────────────────────────────
    post_at = get_6pm_timestamp()
    now_unix = int(datetime.now(timezone.utc).timestamp())

    if post_at - now_unix > 120:  # more than 2 min away → schedule
        slack.chat_scheduleMessage(
            channel=SLACK_USER_ID,
            text=summary,
            post_at=post_at,
        )
        print(f"Scheduled for Unix {post_at}")
    else:  # already past 6 PM or within 2 min → send immediately
        slack.chat_postMessage(channel=SLACK_USER_ID, text=summary)
        print("Sent immediately (past 6 PM or within 2-min window)")


if __name__ == "__main__":
    main()
