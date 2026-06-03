#!/usr/bin/env python3
"""
Daily Executive Summary — DaCodes
Fetches Slack, Circleback, and Gmail data, generates a summary with Claude,
and sends it as a Slack DM at 6pm Mexico City time.
"""

import json
import os
import sys
from datetime import datetime

import pytz
import requests
from anthropic import Anthropic
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

MEXICO_TZ = pytz.timezone("America/Mexico_City")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def today_range():
    """Unix timestamps for start/end of today in Mexico City time."""
    now = datetime.now(MEXICO_TZ)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    return start.timestamp(), end.timestamp(), now


# ─── Slack ────────────────────────────────────────────────────────────────────

def fetch_slack_messages(token: str) -> list[dict]:
    """Fetch all of today's messages from channels the bot is a member of."""
    client = WebClient(token=token)
    oldest, latest, _ = today_range()

    # Collect channels
    channels, cursor = [], None
    while True:
        resp = client.conversations_list(
            types="public_channel,private_channel,mpim,im",
            limit=200,
            cursor=cursor,
            exclude_archived=True,
        )
        for ch in resp["channels"]:
            if ch.get("is_member"):
                channels.append({"id": ch["id"], "name": ch.get("name", ch["id"])})
        cursor = resp.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break

    messages = []
    for ch in channels[:30]:  # cap to avoid rate limits
        try:
            resp = client.conversations_history(
                channel=ch["id"],
                oldest=str(oldest),
                latest=str(latest),
                limit=100,
            )
            for msg in resp.get("messages", []):
                if msg.get("type") == "message" and not msg.get("subtype"):
                    messages.append({
                        "canal": ch["name"],
                        "usuario": msg.get("user", "bot"),
                        "texto": msg.get("text", "")[:400],
                        "respuestas": msg.get("reply_count", 0),
                    })
        except SlackApiError:
            pass

    return messages


# ─── Circleback ───────────────────────────────────────────────────────────────

def fetch_circleback_meetings(api_key: str) -> list[dict]:
    """Fetch today's meeting notes from Circleback."""
    now = datetime.now(MEXICO_TZ)
    date_str = now.strftime("%Y-%m-%d")

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    # Try common Circleback API endpoints
    endpoints = [
        f"https://app.circleback.ai/api/v1/notes?date={date_str}",
        f"https://app.circleback.ai/api/v1/meetings?date={date_str}",
        f"https://app.circleback.ai/api/notes?created_after={date_str}T00:00:00Z",
    ]

    for url in endpoints:
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", data) if isinstance(data, dict) else data
            if resp.status_code == 404:
                continue
            # Log unexpected status but don't crash
            print(f"Circleback {resp.status_code} at {url}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"Circleback request error: {e}", file=sys.stderr)

    return []


# ─── Gmail ────────────────────────────────────────────────────────────────────

def fetch_gmail_emails(credentials_json: str) -> list[dict]:
    """Fetch today's relevant emails (dacodes + clients, no sales/automation)."""
    data = json.loads(credentials_json)
    creds = Credentials(
        token=data.get("token"),
        refresh_token=data.get("refresh_token"),
        token_uri=data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=data.get("client_id"),
        client_secret=data.get("client_secret"),
        scopes=data.get("scopes", ["https://www.googleapis.com/auth/gmail.readonly"]),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

    service = build("gmail", "v1", credentials=creds)

    now = datetime.now(MEXICO_TZ)
    date_filter = now.strftime("%Y/%m/%d")

    # Emails involving dacodes or clients; exclude automated/promotional
    query = (
        f"after:{date_filter} "
        "(from:@dacodes.com OR to:@dacodes.com) "
        "-from:noreply -from:no-reply -from:notifications@ "
        "-unsubscribe -category:promotions -category:updates "
        "-subject:unsubscribe"
    )

    results = service.users().messages().list(
        userId="me", q=query, maxResults=50
    ).execute()

    emails = []
    for ref in results.get("messages", []):
        try:
            msg = service.users().messages().get(
                userId="me",
                id=ref["id"],
                format="metadata",
                metadataHeaders=["Subject", "From", "To", "Cc", "Date"],
            ).execute()
            hdrs = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            emails.append({
                "asunto": hdrs.get("Subject", "(sin asunto)"),
                "de": hdrs.get("From", ""),
                "para": hdrs.get("To", ""),
                "cc": hdrs.get("Cc", ""),
                "fecha": hdrs.get("Date", ""),
                "resumen": msg.get("snippet", "")[:300],
            })
        except Exception:
            pass

    return emails


# ─── Summary Generation ───────────────────────────────────────────────────────

PROMPT = """\
Eres el asistente ejecutivo de Jorge Campos (jorge.campos@dacodes.com), Director en DaCodes.

Genera un resumen ejecutivo diario conciso para el {date}.

DATOS DEL DÍA:

### SLACK — mensajes de hoy:
{slack}

### CIRCLEBACK — llamadas/reuniones de hoy:
{circleback}

### GMAIL — correos relevantes de hoy:
{gmail}

REGLAS:
- Escribe en español profesional y directo
- Bullet points cortos — nada de párrafos largos
- Prioriza lo urgente y lo que requiere acción
- Si una sección no tiene datos relevantes: "Sin actividad registrada."
- Para Gmail: solo dacodes + clientes reales; ignora ventas, secuencias y no-reply

FORMATO (respeta exactamente las secciones):

## 💬 Slack — Conversaciones Clave
[bullets con las conversaciones más importantes, agrupadas por proyecto o tema]

---

## 📞 Llamadas del Día
[Para cada llamada:
• **[Nombre reunión]** — [participantes]
  - Temas: ...
  - Acuerdos: ...
  - Próximos pasos: ...]

---

## 📧 Correos Importantes
[bullets: emisor → tema clave y contexto]

---

## ⚡ Acciones Pendientes
[Lista consolidada de follow-ups y tareas de todas las fuentes anteriores]
"""


def generate_summary(
    client: Anthropic,
    slack: list,
    circleback: list,
    gmail: list,
    date_str: str,
) -> str:
    def fmt(data):
        if not data:
            return "Sin datos disponibles."
        return json.dumps(data, ensure_ascii=False, indent=2)[:6000]

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": PROMPT.format(
                date=date_str,
                slack=fmt(slack),
                circleback=fmt(circleback),
                gmail=fmt(gmail),
            ),
        }],
    )
    return resp.content[0].text


# ─── Slack Sender ─────────────────────────────────────────────────────────────

def send_slack_dm(token: str, user_id: str, summary: str, date_str: str):
    """Send the executive summary as a Slack DM."""
    client = WebClient(token=token)
    header = f"*📊 Resumen Ejecutivo Diario — {date_str}*\n{'─' * 44}\n\n"
    full = header + summary

    # Split on section dividers if message exceeds Slack's 4000-char limit
    if len(full) <= 4000:
        client.chat_postMessage(channel=user_id, text=full, mrkdwn=True)
        return

    sections = full.split("\n---\n")
    thread_ts = None
    for i, section in enumerate(sections):
        text = (header + section) if i == 0 else section
        resp = client.chat_postMessage(
            channel=user_id,
            text=text,
            mrkdwn=True,
            thread_ts=thread_ts,
        )
        if thread_ts is None:
            thread_ts = resp["ts"]


# ─── Entry Point ──────────────────────────────────────────────────────────────

def main():
    required = ["ANTHROPIC_API_KEY", "SLACK_BOT_TOKEN", "SLACK_USER_ID"]
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        print(f"ERROR: missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    anthropic_key = os.environ["ANTHROPIC_API_KEY"]
    slack_token = os.environ["SLACK_BOT_TOKEN"]
    slack_user_id = os.environ["SLACK_USER_ID"]
    circleback_key = os.environ.get("CIRCLEBACK_API_KEY", "")
    gmail_creds = os.environ.get("GMAIL_CREDENTIALS", "")

    now = datetime.now(MEXICO_TZ)
    date_str = now.strftime("%d de %B de %Y")

    print(f"📊 Generando resumen ejecutivo para {date_str}...")

    print("  📱 Slack...")
    slack_data = fetch_slack_messages(slack_token)
    print(f"     {len(slack_data)} mensajes")

    print("  📞 Circleback...")
    circleback_data = fetch_circleback_meetings(circleback_key) if circleback_key else []
    print(f"     {len(circleback_data)} reuniones")

    print("  📧 Gmail...")
    gmail_data = fetch_gmail_emails(gmail_creds) if gmail_creds else []
    print(f"     {len(gmail_data)} correos")

    print("  🤖 Generando con Claude...")
    anthropic_client = Anthropic(api_key=anthropic_key)
    summary = generate_summary(anthropic_client, slack_data, circleback_data, gmail_data, date_str)

    print("  📤 Enviando DM en Slack...")
    send_slack_dm(slack_token, slack_user_id, summary, date_str)

    print("✅ Resumen enviado!")


if __name__ == "__main__":
    main()
