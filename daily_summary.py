"""
Daily Executive Summary — DaCodes
Queries Gmail, Slack, and Circleback, then sends a summary to Slack via Claude API.
"""

import os
import json
import base64
import re
from datetime import datetime, timezone, timedelta

import anthropic
import requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ── Configuration ──────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_TARGET_USER_ID = os.environ.get("SLACK_TARGET_USER_ID", "U02G57N1UDP")
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CIRCLEBACK_API_KEY = os.environ.get("CIRCLEBACK_API_KEY", "")

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
GOOGLE_TOKEN_JSON = os.environ.get("GOOGLE_TOKEN_JSON", "")  # full token JSON as env var

CST = timezone(timedelta(hours=-6))

# ── Gmail ───────────────────────────────────────────────────────────────────────

def gmail_service():
    creds = Credentials.from_authorized_user_info(json.loads(GOOGLE_TOKEN_JSON), GMAIL_SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def get_today_relevant_emails(service):
    today = datetime.now(CST).strftime("%Y/%m/%d")
    tomorrow = (datetime.now(CST) + timedelta(days=1)).strftime("%Y/%m/%d")
    ignore = [
        "noreply", "no-reply", "notifications@", "automated@",
        "newsletter", "beehiiv", "trovit", "airbnb", "americanexpress",
        "linkedin", "crunchbase", "bamboohr", "nu.com", "forbes",
        "sectionai", "aiagentstore", "bventure",
    ]
    ignore_pattern = "|".join(ignore)

    query = (
        f"after:{today} before:{tomorrow} "
        f"({' OR '.join(['from:@dacodes.com', 'to:@dacodes.com', 'cc:@dacodes.com'])})"
    )
    result = service.users().threads().list(userId="me", q=query, maxResults=30).execute()
    threads = result.get("threads", [])

    emails = []
    for t in threads:
        thread = service.users().threads().get(userId="me", id=t["id"], format="full").execute()
        for msg in thread.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
            sender = headers.get("From", "")
            if re.search(ignore_pattern, sender, re.IGNORECASE):
                continue
            body = ""
            parts = msg["payload"].get("parts", [msg["payload"]])
            for p in parts:
                if p.get("mimeType") == "text/plain":
                    data = p.get("body", {}).get("data", "")
                    if data:
                        body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                        break
            emails.append({
                "subject": headers.get("Subject", ""),
                "from": sender,
                "to": headers.get("To", ""),
                "cc": headers.get("Cc", ""),
                "date": headers.get("Date", ""),
                "body": body[:2000],
            })
    return emails


# ── Slack ───────────────────────────────────────────────────────────────────────

def get_today_slack_messages():
    today_ts = datetime.now(CST).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    headers = {"Authorization": f"Bearer {SLACK_BOT_TOKEN}"}

    channels_resp = requests.get(
        "https://slack.com/api/conversations.list",
        headers=headers,
        params={"types": "public_channel,private_channel", "limit": 200},
    ).json()

    messages = []
    for ch in channels_resp.get("channels", []):
        hist = requests.get(
            "https://slack.com/api/conversations.history",
            headers=headers,
            params={"channel": ch["id"], "oldest": today_ts, "limit": 50},
        ).json()
        for m in hist.get("messages", []):
            if m.get("subtype") or m.get("bot_id"):
                continue
            messages.append({
                "channel": ch.get("name", ch["id"]),
                "user": m.get("user", ""),
                "text": m.get("text", "")[:500],
                "ts": m.get("ts", ""),
            })
    return messages


# ── Circleback ──────────────────────────────────────────────────────────────────

def get_today_circleback_calls():
    if not CIRCLEBACK_API_KEY:
        return []
    today = datetime.now(CST).strftime("%Y-%m-%d")
    resp = requests.get(
        "https://api.circleback.ai/v1/meetings",
        headers={"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"},
        params={"date": today},
    )
    if resp.status_code != 200:
        return []
    return resp.json().get("meetings", [])


# ── Claude Summarizer ───────────────────────────────────────────────────────────

def generate_summary(emails, slack_messages, calls):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    context = f"""
Hoy es {datetime.now(CST).strftime('%d de %B de %Y')}.

=== EMAILS DEL DÍA (DaCodes + Clientes) ===
{json.dumps(emails, ensure_ascii=False, indent=2)}

=== MENSAJES DE SLACK DEL DÍA ===
{json.dumps(slack_messages, ensure_ascii=False, indent=2)}

=== LLAMADAS DEL DÍA (Circleback) ===
{json.dumps(calls, ensure_ascii=False, indent=2)}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=(
            "Eres un asistente ejecutivo de DaCodes. Tu tarea es generar un resumen diario "
            "ejecutivo conciso en español. Usa encabezados con emojis, bullet points y sé directo. "
            "Ignora correos de ventas, newsletters, automatizaciones y notificaciones irrelevantes. "
            "Enfócate en: clientes, deals, decisiones, próximos pasos, alertas financieras y talento."
        ),
        messages=[
            {
                "role": "user",
                "content": (
                    f"{context}\n\n"
                    "Genera el resumen ejecutivo diario con estas secciones:\n"
                    "1. 💬 SLACK — Conversaciones Clave\n"
                    "2. 📞 CIRCLEBACK — Llamadas del Día\n"
                    "3. 📧 GMAIL — Correos Relevantes\n"
                    "4. ✅ Acciones Prioritarias para Mañana\n\n"
                    "Al final agrega una línea: _Generado automáticamente · DaCodes Executive Summary Bot_"
                ),
            }
        ],
    )
    return message.content[0].text


# ── Slack Sender ────────────────────────────────────────────────────────────────

def send_to_slack(text):
    resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"channel": SLACK_TARGET_USER_ID, "text": text, "mrkdwn": True},
    )
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack error: {data.get('error')}")
    print(f"Sent to Slack: {data['ts']}")


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    print("Fetching Gmail...")
    gmail = gmail_service()
    emails = get_today_relevant_emails(gmail)
    print(f"  {len(emails)} relevant emails found")

    print("Fetching Slack...")
    slack_msgs = get_today_slack_messages()
    print(f"  {len(slack_msgs)} messages found")

    print("Fetching Circleback...")
    calls = get_today_circleback_calls()
    print(f"  {len(calls)} calls found")

    print("Generating summary with Claude...")
    summary = generate_summary(emails, slack_msgs, calls)

    header = f"## 📊 Resumen Ejecutivo Diario — {datetime.now(CST).strftime('%d de %B de %Y')}\n\n---\n\n"
    send_to_slack(header + summary)
    print("Done!")


if __name__ == "__main__":
    main()
