#!/usr/bin/env python3
"""
Daily Executive Summary — Circleback + Gmail + Slack → Slack DM at 6pm
"""

import os
import json
import datetime
import base64
import re
from email.utils import parsedate_to_datetime

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import requests


# ── Config ────────────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN   = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID     = os.environ["SLACK_USER_ID"]       # DM recipient (your own user_id)
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CIRCLEBACK_API_KEY = os.environ["CIRCLEBACK_API_KEY"]

# Gmail OAuth2 – export these from your Google Cloud credentials JSON
GMAIL_CLIENT_ID     = os.environ["GMAIL_CLIENT_ID"]
GMAIL_CLIENT_SECRET = os.environ["GMAIL_CLIENT_SECRET"]
GMAIL_REFRESH_TOKEN = os.environ["GMAIL_REFRESH_TOKEN"]

DACODES_DOMAINS = ["dacodes.com", "dacodes.ai"]
TIMEZONE_OFFSET = -5  # CDT (UTC-5); change to -6 for CST


# ── Helpers ───────────────────────────────────────────────────────────────────
def today_range() -> tuple[str, str]:
    """Return (start_iso, end_iso) for today in UTC covering a full local day."""
    now_utc = datetime.datetime.utcnow()
    local_date = (now_utc + datetime.timedelta(hours=TIMEZONE_OFFSET)).date()
    start = datetime.datetime.combine(local_date, datetime.time.min) - datetime.timedelta(hours=TIMEZONE_OFFSET)
    end   = datetime.datetime.combine(local_date, datetime.time.max) - datetime.timedelta(hours=TIMEZONE_OFFSET)
    return start.strftime("%Y-%m-%dT%H:%M:%SZ"), end.strftime("%Y-%m-%dT%H:%M:%SZ"), str(local_date)


def is_sales_sequence(subject: str, snippet: str) -> bool:
    """Return True for outbound sales/sequence emails to ignore."""
    sales_subjects = [
        "Talent That Delivers",
        "Tu equipo ideal en software",
        "DaCodes: Tu Socio Estratégico",
        "¿Colaboramos en",
        "Top Engineers Ready",
        "45 New Clients",
    ]
    return any(s.lower() in (subject + snippet).lower() for s in sales_subjects)


def is_relevant_email(msg: dict) -> bool:
    """Keep only emails involving dacodes people or known clients."""
    sender    = msg.get("sender", "")
    recipients = msg.get("toRecipients", []) + msg.get("ccRecipients", [])
    subject   = msg.get("subject", "")
    snippet   = msg.get("snippet", "")

    if is_sales_sequence(subject, snippet):
        return False

    all_addresses = [sender] + recipients
    involves_dacodes = any(
        any(d in addr for d in DACODES_DOMAINS)
        for addr in all_addresses
    )
    return involves_dacodes


# ── Data fetchers ──────────────────────────────────────────────────────────────
def fetch_slack_messages(start_ts: str, end_ts: str) -> list[dict]:
    """Fetch today's Slack messages via Search API (public + private + DMs)."""
    client = WebClient(token=SLACK_BOT_TOKEN)
    today = start_ts[:10].replace("-", "/")
    results = []
    try:
        resp = client.search_messages(
            query=f"after:{today}",
            sort="timestamp",
            sort_dir="desc",
            count=50,
        )
        for match in resp.get("messages", {}).get("matches", []):
            results.append({
                "channel": match.get("channel", {}).get("name", ""),
                "user":    match.get("username", ""),
                "text":    match.get("text", ""),
                "ts":      match.get("ts", ""),
            })
    except SlackApiError as e:
        print(f"Slack error: {e.response['error']}")
    return results


def fetch_circleback_meetings(date: str) -> list[dict]:
    """Fetch today's meetings from Circleback REST API."""
    url = "https://api.circleback.ai/v1/meetings"
    headers = {
        "Authorization": f"Bearer {CIRCLEBACK_API_KEY}",
        "Content-Type": "application/json",
    }
    params = {"startDate": date, "endDate": date, "pageSize": 50}
    meetings = []
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        for m in data.get("meetings", data if isinstance(data, list) else []):
            meetings.append({
                "name":       m.get("name", ""),
                "attendees":  [a.get("name") or a.get("email", "") for a in m.get("attendees", [])],
                "notes":      m.get("notes", ""),
                "actionItems": [a.get("text", "") for a in m.get("actionItems", [])],
                "duration":   m.get("duration", ""),
            })
    except Exception as e:
        print(f"Circleback error: {e}")
    return meetings


def fetch_gmail_threads(start_date: str) -> list[dict]:
    """Fetch today's Gmail threads via Gmail API."""
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)

    query = f"newer_than:1d"
    result = service.users().threads().list(userId="me", q=query, maxResults=50).execute()
    threads_raw = result.get("threads", [])

    threads = []
    for t in threads_raw:
        detail = service.users().threads().get(userId="me", id=t["id"], format="metadata",
                                                metadataHeaders=["Subject","From","To","Cc","Date"]).execute()
        messages = []
        for msg in detail.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            messages.append({
                "subject":      headers.get("Subject", ""),
                "sender":       headers.get("From", ""),
                "toRecipients": re.split(r",\s*", headers.get("To", "")),
                "ccRecipients": re.split(r",\s*", headers.get("Cc", "")) if headers.get("Cc") else [],
                "date":         headers.get("Date", ""),
                "snippet":      msg.get("snippet", ""),
            })

        relevant = [m for m in messages if is_relevant_email(m)]
        if relevant:
            threads.append({"threadId": t["id"], "messages": relevant})

    return threads


# ── Claude summarizer ──────────────────────────────────────────────────────────
def generate_summary(date: str, slack_msgs: list, meetings: list, gmail_threads: list) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    payload = {
        "date": date,
        "slack_messages": slack_msgs,
        "circleback_meetings": meetings,
        "gmail_threads": gmail_threads,
    }

    prompt = f"""Eres un asistente ejecutivo. Con los datos del día ({date}), genera un resumen ejecutivo conciso en español para Jorge Campos, co-fundador de DaCodes.

DATOS:
{json.dumps(payload, ensure_ascii=False, indent=2)}

INSTRUCCIONES:
- Slack: resume las conversaciones más importantes. Si no hubo actividad, indícalo brevemente.
- Circleback: por cada llamada incluye: participantes, temas clave, acuerdos y próximos pasos. Si no hubo llamadas, indícalo.
- Gmail: solo incluye correos que involucren a gente de DaCodes (@dacodes.com / @dacodes.ai) o clientes reales. Ignora correos de ventas salientes (secuencias), newsletters y notificaciones automáticas irrelevantes. Destaca acciones pendientes.
- Usa encabezados claros (Slack / Circleback / Gmail), bullet points y sé conciso.
- Formato: Markdown compatible con Slack (usa *negrita*, _cursiva_, ```código```, > blockquote).
- Máximo ~400 palabras en el cuerpo.
- Empieza con: 📋 *Resumen Ejecutivo Diario — {date}*"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ── Slack sender ───────────────────────────────────────────────────────────────
def send_slack_dm(text: str) -> None:
    client = WebClient(token=SLACK_BOT_TOKEN)
    client.chat_postMessage(channel=SLACK_USER_ID, text=text, mrkdwn=True)
    print("✅ Summary sent to Slack.")


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    start_ts, end_ts, date = today_range()
    print(f"Generating summary for {date}…")

    slack_msgs  = fetch_slack_messages(start_ts, end_ts)
    meetings    = fetch_circleback_meetings(date)
    gmail_threads = fetch_gmail_threads(date)

    summary = generate_summary(date, slack_msgs, meetings, gmail_threads)
    send_slack_dm(summary)


if __name__ == "__main__":
    main()
