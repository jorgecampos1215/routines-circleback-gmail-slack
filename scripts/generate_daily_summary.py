#!/usr/bin/env python3
"""
Daily Executive Summary Generator
Fetches data from Slack, Gmail (including Circleback notes), generates a
summary with Claude, and posts it to a Slack DM.

Required environment variables:
  ANTHROPIC_API_KEY       - Anthropic API key
  SLACK_BOT_TOKEN         - Slack bot token (xoxb-...)
  SLACK_USER_ID           - Slack user ID to send the DM to (e.g. U02G57N1UDP)
  GMAIL_REFRESH_TOKEN     - Gmail OAuth2 refresh token
  GMAIL_CLIENT_ID         - Gmail OAuth2 client ID
  GMAIL_CLIENT_SECRET     - Gmail OAuth2 client secret
"""

import os
import json
import datetime
import sys
from zoneinfo import ZoneInfo

import anthropic
import requests
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


# ─── Config ──────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")
GMAIL_REFRESH_TOKEN = os.environ["GMAIL_REFRESH_TOKEN"]
GMAIL_CLIENT_ID = os.environ["GMAIL_CLIENT_ID"]
GMAIL_CLIENT_SECRET = os.environ["GMAIL_CLIENT_SECRET"]

CDT = ZoneInfo("America/Mexico_City")
TODAY = datetime.datetime.now(CDT).date()
TODAY_STR = TODAY.strftime("%d de %B de %Y")
TOMORROW = TODAY + datetime.timedelta(days=1)

DACODES_DOMAIN = "dacodes.com"
SALES_KEYWORDS = [
    "unsubscribe", "darse de baja", "promoción", "marketing",
    "newsletter", "no-reply", "noreply", "notifications@",
    "automated@", "businessprofile-noreply", "invitations@linkedin",
    "fans.formula1", "airbnb", "myvistage", "beehiiv", "heygen",
    "techservealliance",
]


# ─── Slack ────────────────────────────────────────────────────────────────────

def fetch_slack_messages() -> str:
    client = WebClient(token=SLACK_BOT_TOKEN)
    # Timestamp range: today midnight to end of day (CDT → UTC)
    start = datetime.datetime.combine(TODAY, datetime.time.min, tzinfo=CDT)
    end = start + datetime.timedelta(days=1)
    oldest = str(start.timestamp())
    latest = str(end.timestamp())

    results = []
    try:
        # Search all channels + DMs for today's messages
        resp = client.search_messages(
            query=f"after:{(TODAY - datetime.timedelta(days=1)).isoformat()} before:{TOMORROW.isoformat()}",
            count=50,
            sort="timestamp",
            sort_dir="desc",
        )
        matches = resp.get("messages", {}).get("matches", [])
        for m in matches:
            channel = m.get("channel", {}).get("name", "DM")
            user = m.get("username", "?")
            text = m.get("text", "")
            ts = m.get("ts", "")
            if text.strip():
                results.append(f"[#{channel}] {user}: {text[:300]}")
    except SlackApiError as e:
        results.append(f"[Error fetching Slack messages: {e.response['error']}]")

    return "\n".join(results) if results else "No hay mensajes de Slack para hoy."


# ─── Gmail ────────────────────────────────────────────────────────────────────

def _gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _is_sales_email(sender: str, subject: str) -> bool:
    combined = (sender + " " + subject).lower()
    return any(kw.lower() in combined for kw in SALES_KEYWORDS)


def _is_dacodes_or_client(sender: str, recipients: list[str]) -> bool:
    all_addrs = [sender] + recipients
    return any(DACODES_DOMAIN in addr for addr in all_addrs)


def fetch_gmail_threads() -> str:
    service = _gmail_service()
    query = (
        f"after:{TODAY.strftime('%Y/%m/%d')} before:{TOMORROW.strftime('%Y/%m/%d')} "
        f"(from:{DACODES_DOMAIN} OR to:{DACODES_DOMAIN} OR cc:{DACODES_DOMAIN})"
    )
    result = service.users().threads().list(userId="me", q=query, maxResults=30).execute()
    threads = result.get("threads", [])

    relevant = []
    for t in threads:
        thread = service.users().threads().get(
            userId="me", id=t["id"], format="metadata",
            metadataHeaders=["Subject", "From", "To", "Cc", "Date"],
        ).execute()
        messages = thread.get("messages", [])
        if not messages:
            continue

        first = messages[0]
        headers = {h["name"]: h["value"] for h in first.get("payload", {}).get("headers", [])}
        sender = headers.get("From", "")
        subject = headers.get("Subject", "")
        to = headers.get("To", "")

        if _is_sales_email(sender, subject):
            continue
        if not _is_dacodes_or_client(sender, [to]):
            continue

        snippet = first.get("snippet", "")[:200]
        relevant.append(f"De: {sender}\nAsunto: {subject}\nResumen: {snippet}")

    return "\n\n".join(relevant) if relevant else "No hay correos relevantes para hoy."


def fetch_circleback_from_gmail() -> str:
    service = _gmail_service()
    query = (
        f"after:{TODAY.strftime('%Y/%m/%d')} before:{TOMORROW.strftime('%Y/%m/%d')} "
        f"from:notifications@circleback.ai"
    )
    result = service.users().threads().list(userId="me", q=query, maxResults=10).execute()
    threads = result.get("threads", [])

    notes = []
    for t in threads:
        thread = service.users().threads().get(
            userId="me", id=t["id"], format="full"
        ).execute()
        messages = thread.get("messages", [])
        if not messages:
            continue
        first = messages[0]
        headers = {h["name"]: h["value"] for h in first.get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "")
        # Extract plain text body
        body = _extract_body(first.get("payload", {}))
        if body:
            notes.append(f"=== {subject} ===\n{body[:3000]}")

    return "\n\n".join(notes) if notes else "No hay notas de Circleback para hoy."


def _extract_body(payload: dict) -> str:
    import base64
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore") if data else ""
    for part in payload.get("parts", []):
        text = _extract_body(part)
        if text:
            return text
    return ""


# ─── Claude summary ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres un asistente ejecutivo experto. Tu tarea es generar un resumen ejecutivo diario conciso y accionable en español, basado en la información proporcionada de Slack, Circleback y Gmail.

Formato:
- Usa encabezados claros con emojis
- Bullet points concisos
- Marca las acciones pendientes con 🔴 (urgente) 🟡 (hoy) 🟢 (en seguimiento)
- Sé directo, sin relleno
- Máximo 600 palabras total
"""

def generate_summary(slack: str, circleback: str, gmail: str, date_str: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_prompt = f"""Genera el resumen ejecutivo diario para el {date_str}.

=== SLACK (mensajes del día) ===
{slack}

=== CIRCLEBACK (notas de llamadas) ===
{circleback}

=== GMAIL (correos relevantes) ===
{gmail}
"""
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


# ─── Send to Slack ────────────────────────────────────────────────────────────

def send_to_slack(text: str) -> None:
    client = WebClient(token=SLACK_BOT_TOKEN)
    try:
        client.chat_postMessage(channel=SLACK_USER_ID, text=text)
        print(f"Summary sent to Slack user {SLACK_USER_ID}")
    except SlackApiError as e:
        print(f"Failed to send Slack message: {e.response['error']}", file=sys.stderr)
        sys.exit(1)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"Generating daily summary for {TODAY_STR}...")

    print("  Fetching Slack messages...")
    slack_data = fetch_slack_messages()

    print("  Fetching Circleback notes from Gmail...")
    circleback_data = fetch_circleback_from_gmail()

    print("  Fetching Gmail threads...")
    gmail_data = fetch_gmail_threads()

    print("  Generating summary with Claude...")
    summary = generate_summary(slack_data, circleback_data, gmail_data, TODAY_STR)

    header = f"📋 *RESUMEN EJECUTIVO DIARIO — {TODAY_STR}*\n\n"
    footer = "\n\n_Generado automáticamente · DaCodes Daily Summary_"
    full_message = header + summary + footer

    print("  Sending to Slack...")
    send_to_slack(full_message)
    print("Done.")


if __name__ == "__main__":
    main()
