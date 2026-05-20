#!/usr/bin/env python3
"""
Daily Executive Summary — DaCodes
Fetches data from Slack, Circleback, and Gmail, then sends a formatted
executive summary via Slack DM at 6 PM Mexico City time.

Required environment variables:
  ANTHROPIC_API_KEY      - Anthropic API key
  SLACK_BOT_TOKEN        - Slack bot OAuth token (xoxb-...)
  SLACK_USER_ID          - Slack user ID to DM (default: U02G57N1UDP)
  CIRCLEBACK_API_KEY     - Circleback API key
  GMAIL_CREDENTIALS_JSON - Gmail OAuth credentials as JSON string
"""

import os
import json
from datetime import datetime, timezone
from typing import Optional
import httpx
from anthropic import Anthropic

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")
CIRCLEBACK_API_KEY = os.environ["CIRCLEBACK_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
GMAIL_CREDENTIALS_JSON = os.environ.get("GMAIL_CREDENTIALS_JSON", "")
CIRCLEBACK_BASE_URL = os.environ.get("CIRCLEBACK_BASE_URL", "https://api.circleback.ai")


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# ── Circleback ────────────────────────────────────────────────────────────────

def fetch_circleback_meetings(date: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"}
    meetings: list[dict] = []
    page = 0

    while True:
        resp = httpx.get(
            f"{CIRCLEBACK_BASE_URL}/v1/meetings",
            params={"start_date": date, "end_date": date, "page": page, "limit": 20},
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        batch: list[dict] = data.get("meetings", data if isinstance(data, list) else [])
        if not batch:
            break
        meetings.extend(batch)
        if len(batch) < 20:
            break
        page += 1

    return meetings


def fetch_meeting_details(meeting_ids: list[int]) -> list[dict]:
    if not meeting_ids:
        return []
    headers = {"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"}
    details = []
    for mid in meeting_ids[:20]:
        try:
            resp = httpx.get(
                f"{CIRCLEBACK_BASE_URL}/v1/meetings/{mid}",
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            details.append(resp.json())
        except Exception as e:
            print(f"  Warning: could not fetch meeting {mid}: {e}")
    return details


# ── Slack ─────────────────────────────────────────────────────────────────────

def fetch_slack_channels() -> list[dict]:
    resp = httpx.get(
        "https://slack.com/api/conversations.list",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
        params={"types": "public_channel,private_channel", "limit": 200, "exclude_archived": "true"},
        timeout=30,
    )
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack error: {data.get('error')}")
    return [ch for ch in data.get("channels", []) if ch.get("is_member")]


def fetch_slack_messages_today() -> list[dict]:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    oldest = str(today_start.timestamp())

    channels = fetch_slack_channels()
    all_messages: list[dict] = []

    for channel in channels[:25]:
        try:
            resp = httpx.get(
                "https://slack.com/api/conversations.history",
                headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
                params={"channel": channel["id"], "oldest": oldest, "limit": 50},
                timeout=30,
            )
            data = resp.json()
            if not data.get("ok"):
                continue
            for msg in data.get("messages", []):
                if msg.get("type") == "message" and not msg.get("bot_id") and msg.get("text"):
                    all_messages.append({
                        "channel": channel.get("name", channel["id"]),
                        "text": msg["text"][:500],
                        "ts": msg.get("ts"),
                        "thread_ts": msg.get("thread_ts"),
                        "reply_count": msg.get("reply_count", 0),
                    })
        except Exception as e:
            print(f"  Warning: Slack channel {channel.get('name')}: {e}")

    return all_messages


# ── Gmail ─────────────────────────────────────────────────────────────────────

def fetch_gmail_threads() -> list[dict]:
    if not GMAIL_CREDENTIALS_JSON:
        return []

    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    creds_data = json.loads(GMAIL_CREDENTIALS_JSON)
    creds = Credentials(
        token=creds_data.get("token"),
        refresh_token=creds_data["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=creds_data["client_id"],
        client_secret=creds_data["client_secret"],
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

    service = build("gmail", "v1", credentials=creds)
    query = "newer_than:1d -category:promotions -from:noreply -from:no-reply -subject:unsubscribe"

    result = service.users().threads().list(userId="me", q=query, maxResults=30).execute()
    threads_raw = result.get("threads", [])

    # Phrases that identify outbound sales sequences to skip
    sales_phrases = [
        "just wanted to follow up", "looping back in", "talent that delivers",
        "top engineers ready to join", "nuvista", "vmware", "unsubscribe",
        "touching base on our previous email", "hope you're doing great! just wanted",
    ]

    threads: list[dict] = []
    for t in threads_raw:
        try:
            thread = service.users().threads().get(
                userId="me", id=t["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date"],
            ).execute()
            messages = thread.get("messages", [])
            if not messages:
                continue

            last = messages[-1]
            headers = {h["name"]: h["value"] for h in last.get("payload", {}).get("headers", [])}
            snippet = last.get("snippet", "").lower()

            if any(phrase in snippet for phrase in sales_phrases):
                continue

            threads.append({
                "subject": headers.get("Subject", "(sin asunto)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "snippet": last.get("snippet", "")[:300],
                "message_count": len(messages),
            })
        except Exception as e:
            print(f"  Warning: Gmail thread {t['id']}: {e}")

    return threads


# ── Claude Summary ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres el asistente ejecutivo de Jorge Campos, Co-Founder de DaCodes.
Genera resúmenes ejecutivos diarios concisos, útiles y bien formateados.
Usa Markdown (encabezados ##, bullet points -). Escribe siempre en español.
Sé directo. Omite secciones sin datos (escribe "Sin actividad registrada").
Máximo ~100 palabras por sección."""

USER_PROMPT = """Genera el resumen ejecutivo diario del {date} con los datos siguientes.

Formato requerido:
## 📊 Resumen Ejecutivo Diario — {date}

## 💬 Slack
[conversaciones importantes del día]

## 📞 Circleback — Llamadas del día
[por cada reunión: participantes clave, temas, acuerdos, próximos pasos]

## 📧 Gmail — Correos relevantes
[solo dacodes y clientes, sin secuencias de ventas]

---
_Generado automáticamente · DaCodes_

DATOS DEL DÍA:
{data}
"""


def generate_summary(meetings: list, slack_messages: list, emails: list) -> str:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    today = datetime.now().strftime("%-d de %B de %Y")

    data = json.dumps(
        {"circleback_meetings": meetings, "slack_messages": slack_messages, "gmail_emails": emails},
        ensure_ascii=False,
        indent=2,
    )

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": USER_PROMPT.format(date=today, data=data[:80000])}],
    )
    return response.content[0].text


# ── Slack Send ────────────────────────────────────────────────────────────────

def send_slack_dm(user_id: str, message: str) -> str:
    resp = httpx.post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}", "Content-Type": "application/json"},
        json={"channel": user_id, "text": message, "mrkdwn": True},
        timeout=30,
    )
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack send error: {data.get('error')}")
    return data["ts"]


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    date = today_iso()
    print(f"[daily-summary] Generating executive summary for {date}")

    print("  → Fetching Circleback meetings...")
    try:
        meetings_list = fetch_circleback_meetings(date)
        meeting_ids = [m["id"] for m in meetings_list if isinstance(m.get("id"), int)]
        meetings = fetch_meeting_details(meeting_ids) or meetings_list
    except Exception as e:
        print(f"  ✗ Circleback: {e}")
        meetings = []

    print("  → Fetching Slack messages...")
    try:
        slack_messages = fetch_slack_messages_today()
    except Exception as e:
        print(f"  ✗ Slack: {e}")
        slack_messages = []

    print("  → Fetching Gmail threads...")
    try:
        emails = fetch_gmail_threads()
    except Exception as e:
        print(f"  ✗ Gmail: {e}")
        emails = []

    print(f"  Data: {len(meetings)} meetings, {len(slack_messages)} Slack msgs, {len(emails)} emails")

    print("  → Generating summary with Claude...")
    summary = generate_summary(meetings, slack_messages, emails)

    print("  → Sending Slack DM...")
    ts = send_slack_dm(SLACK_USER_ID, summary)
    print(f"  ✓ Sent! ts={ts}")


if __name__ == "__main__":
    main()
