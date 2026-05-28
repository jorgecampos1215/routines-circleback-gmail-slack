#!/usr/bin/env python3
"""Daily Executive Summary Generator

Fetches data from Slack, Circleback, and Gmail, then sends a formatted
executive summary as a Slack DM.

Required env vars:
  ANTHROPIC_API_KEY     - Anthropic API key
  SLACK_BOT_TOKEN       - Slack Bot OAuth token (scopes: search:read, chat:write)
  GMAIL_TOKEN_JSON      - Gmail OAuth2 token as JSON string
  CIRCLEBACK_API_TOKEN  - Circleback API bearer token
  CIRCLEBACK_BASE_URL   - Circleback API base URL (default: https://api.circleback.ai)
"""

import json
import os
import sys
from datetime import date, datetime

import anthropic
import pytz
import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

MEXICO_TZ = pytz.timezone("America/Mexico_City")
SLACK_TARGET_USER_ID = "U02G57N1UDP"  # jorge.campos@dacodes.com
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

GMAIL_IGNORE_SENDERS = [
    "myvistage.com", "techservealliance.org", "linkedin.com",
    "bamboohr.com", "airbnb.com", "notifications@", "automated@",
    "noreply@", "no-reply@",
]


def today_mexico() -> date:
    return datetime.now(MEXICO_TZ).date()


# ── Gmail ────────────────────────────────────────────────────────────────────

def build_gmail_service():
    token_json = os.environ.get("GMAIL_TOKEN_JSON", "")
    if not token_json:
        raise RuntimeError("GMAIL_TOKEN_JSON not set")
    creds = Credentials.from_authorized_user_info(json.loads(token_json), GMAIL_SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def fetch_gmail_threads(service, target_date: date) -> list[dict]:
    query = (
        "newer_than:1d "
        "(from:dacodes.com OR to:dacodes.com) "
        "-category:promotions -category:updates "
        "-from:myvistage.com -from:linkedin.com -from:bamboohr.com "
        "-from:airbnb.com -from:noreply -from:no-reply "
        "-from:techservealliance.org -from:notifications@"
    )
    result = service.users().threads().list(
        userId="me", q=query, maxResults=30
    ).execute()

    threads = []
    for item in result.get("threads", [])[:20]:
        t = service.users().threads().get(
            userId="me", threadId=item["id"], format="metadata"
        ).execute()
        msgs = t.get("messages", [])
        if not msgs:
            continue
        first_msg = msgs[0]
        last_msg = msgs[-1]
        headers = {
            h["name"]: h["value"]
            for h in last_msg.get("payload", {}).get("headers", [])
        }
        sender = headers.get("From", "")
        if any(s in sender.lower() for s in GMAIL_IGNORE_SENDERS):
            continue
        threads.append({
            "subject": headers.get("Subject", "(sin asunto)"),
            "from": sender,
            "to": headers.get("To", ""),
            "date": headers.get("Date", ""),
            "snippet": last_msg.get("snippet", "")[:400],
            "message_count": len(msgs),
        })
    return threads


# ── Slack ─────────────────────────────────────────────────────────────────────

def fetch_slack_messages(target_date: date) -> list[dict]:
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("SLACK_BOT_TOKEN not set")
    client = WebClient(token=token)
    date_str = target_date.strftime("%Y-%m-%d")
    messages = []
    try:
        resp = client.search_messages(
            query=f"on:{date_str} -is:bot",
            sort="timestamp",
            sort_dir="desc",
            count=50,
        )
        for m in resp.get("messages", {}).get("matches", [])[:40]:
            if m.get("bot_id"):
                continue
            messages.append({
                "channel": m.get("channel", {}).get("name", "DM"),
                "user": m.get("username", m.get("user", "")),
                "text": m.get("text", "")[:500],
            })
    except SlackApiError as e:
        print(f"[WARN] Slack search error: {e}", file=sys.stderr)
    return messages


# ── Circleback ────────────────────────────────────────────────────────────────

def fetch_circleback_meetings(target_date: date) -> list[dict]:
    token = os.environ.get("CIRCLEBACK_API_TOKEN", "")
    base_url = os.environ.get("CIRCLEBACK_BASE_URL", "https://api.circleback.ai")
    if not token:
        raise RuntimeError("CIRCLEBACK_API_TOKEN not set")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    date_str = target_date.isoformat()

    resp = requests.get(
        f"{base_url}/v1/meetings",
        headers=headers,
        params={"startDate": date_str, "endDate": date_str, "pageIndex": 0},
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"[WARN] Circleback API {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return []

    data = resp.json()
    return data if isinstance(data, list) else data.get("meetings", data.get("data", []))


# ── Summary generation ────────────────────────────────────────────────────────

def generate_summary(
    gmail_data: list,
    slack_data: list,
    circleback_data: list,
    target_date: date,
) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)
    day_label = target_date.strftime("%A %d de %B, %Y")

    prompt = f"""Genera un resumen ejecutivo diario conciso en español para {day_label}.

DATOS DE SLACK ({len(slack_data)} mensajes):
{json.dumps(slack_data, ensure_ascii=False, indent=2)}

DATOS DE CIRCLEBACK — llamadas del día ({len(circleback_data)} reuniones):
{json.dumps(circleback_data, ensure_ascii=False, indent=2)}

DATOS DE GMAIL — correos relevantes ({len(gmail_data)} hilos):
{json.dumps(gmail_data, ensure_ascii=False, indent=2)}

INSTRUCCIONES:
- Resume las conversaciones más importantes de Slack
- Para Circleback incluye: participantes, temas clave, acuerdos y próximos pasos
- Para Gmail incluye solo lo relacionado con gente de DaCodes y clientes reales; ignora newsletters, emails de venta de terceros y outreach que nosotros mandamos
- Usa encabezados y bullet points, sé conciso
- 🔴 urgencias · 🟡 importante · 🟢 positivo
- Formato Slack markdown (*negrita*, listas con •, sin HTML)
- Máximo 4000 caracteres
- Comienza exactamente con la línea: 📊 *RESUMEN EJECUTIVO DIARIO — {day_label}*
"""

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── Slack DM sender ───────────────────────────────────────────────────────────

def send_slack_dm(text: str) -> str:
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("SLACK_BOT_TOKEN not set")
    client = WebClient(token=token)
    resp = client.chat_postMessage(
        channel=SLACK_TARGET_USER_ID,
        text=text,
        mrkdwn=True,
    )
    return resp["ts"]


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    target = today_mexico()
    print(f"Generating executive summary for {target} …")

    print("  [1/4] Fetching Gmail …")
    gmail_svc = build_gmail_service()
    gmail_data = fetch_gmail_threads(gmail_svc, target)
    print(f"        {len(gmail_data)} relevant threads")

    print("  [2/4] Fetching Slack …")
    slack_data = fetch_slack_messages(target)
    print(f"        {len(slack_data)} messages")

    print("  [3/4] Fetching Circleback …")
    circleback_data = fetch_circleback_meetings(target)
    print(f"        {len(circleback_data)} meetings")

    print("  [4/4] Generating summary with Claude …")
    summary = generate_summary(gmail_data, slack_data, circleback_data, target)

    print("  Sending to Slack …")
    ts = send_slack_dm(summary)
    print(f"  ✓ Sent (ts={ts})")
    print("\n--- SUMMARY ---")
    print(summary)


if __name__ == "__main__":
    main()
