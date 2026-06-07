"""
DaCodes Daily Executive Summary
Runs daily at 6pm CST (00:00 UTC), gathers data from Gmail, Slack, Circleback,
generates a summary with Claude, and sends it via Slack DM.
"""

import os
import json
from datetime import datetime, timezone, timedelta

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import requests

# ── Configuration ──────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")

GMAIL_CLIENT_ID = os.environ["GMAIL_CLIENT_ID"]
GMAIL_CLIENT_SECRET = os.environ["GMAIL_CLIENT_SECRET"]
GMAIL_REFRESH_TOKEN = os.environ["GMAIL_REFRESH_TOKEN"]

CIRCLEBACK_API_KEY = os.environ.get("CIRCLEBACK_API_KEY", "")

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# Mexico City is permanently on CST (UTC-6) since 2023
CST = timezone(timedelta(hours=-6))


# ── Gmail helpers ──────────────────────────────────────────────────────────────

def get_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    return build("gmail", "v1", credentials=creds)


def fetch_relevant_emails(service, days_back: int = 1) -> list[dict]:
    """Fetch today's emails involving DaCodes team and clients (no sales sequences/promos)."""
    cutoff = datetime.now(CST).replace(hour=0, minute=0, second=0, microsecond=0)
    after_ts = int(cutoff.timestamp())

    query = (
        f"after:{cutoff.strftime('%Y/%m/%d')} "
        "(from:dacodes.com OR from:dacodes.ai OR to:dacodes.com OR to:dacodes.ai) "
        "-from:noreply -from:no-reply -from:notifications@app.bamboohr.com "
        "-category:promotions -from:trovit -from:airbnb -from:substack "
        "-subject:unsubscribe"
    )

    result = service.users().messages().list(userId="me", q=query, maxResults=30).execute()
    messages = result.get("messages", [])

    emails = []
    for msg in messages:
        detail = service.users().messages().get(
            userId="me", id=msg["id"], format="metadata",
            metadataHeaders=["Subject", "From", "To", "Cc", "Date"],
        ).execute()

        headers = {h["name"]: h["value"] for h in detail["payload"]["headers"]}
        emails.append({
            "id": msg["id"],
            "subject": headers.get("Subject", ""),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "cc": headers.get("Cc", ""),
            "date": headers.get("Date", ""),
            "snippet": detail.get("snippet", ""),
        })

    return emails


# ── Slack helpers ──────────────────────────────────────────────────────────────

def fetch_slack_activity(client: WebClient, days_back: int = 1) -> list[dict]:
    """Fetch today's Slack messages across all accessible channels."""
    cutoff = datetime.now(CST).replace(hour=0, minute=0, second=0, microsecond=0)
    oldest = str(cutoff.timestamp())

    channels_resp = client.conversations_list(
        types="public_channel,private_channel", limit=200, exclude_archived=True
    )
    channels = channels_resp.get("channels", [])

    messages = []
    for ch in channels:
        try:
            resp = client.conversations_history(
                channel=ch["id"], oldest=oldest, limit=50
            )
            for msg in resp.get("messages", []):
                if msg.get("subtype"):
                    continue
                messages.append({
                    "channel": ch["name"],
                    "user": msg.get("user", ""),
                    "text": msg.get("text", "")[:500],
                    "ts": msg.get("ts", ""),
                })
        except SlackApiError:
            pass

    return messages


# ── Circleback helpers ─────────────────────────────────────────────────────────

def fetch_circleback_meetings() -> list[dict]:
    """Fetch today's meetings from Circleback."""
    if not CIRCLEBACK_API_KEY:
        return []

    today = datetime.now(CST).strftime("%Y-%m-%d")
    try:
        resp = requests.get(
            "https://app.circleback.ai/api/meetings",
            headers={"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"},
            params={"date": today},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("meetings", [])
    except Exception:
        return []


# ── Summary generation ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres un asistente ejecutivo de DaCodes. Genera resúmenes diarios concisos en español.
Formato Slack (usa *negrita*, _cursiva_, listas con •). Sé conciso pero completo.
Ignora correos de ventas/secuencias/promociones. Prioriza clientes activos y acciones requeridas."""

def generate_summary(emails: list, slack_msgs: list, meetings: list) -> str:
    today_str = datetime.now(CST).strftime("%A %d %b %Y").capitalize()

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    data_block = json.dumps({
        "emails": emails[:20],
        "slack_messages": slack_msgs[:30],
        "circleback_meetings": meetings,
    }, ensure_ascii=False, indent=2)

    prompt = f"""Genera el Resumen Diario Ejecutivo de DaCodes para {today_str}.

Datos del día:
{data_block}

Estructura del resumen:
📊 *Resumen Diario Ejecutivo — {today_str}*
━━━━━━━━━━━━━━━━━━━━━

💬 *SLACK — Conversaciones Importantes*
[resume hilos y decisiones relevantes; si no hay actividad, indícalo brevemente]

━━━━━━━━━━━━━━━━━━━━━

📞 *CIRCLEBACK — Llamadas del Día*
[para cada llamada: participantes, temas clave, acuerdos, próximos pasos; si no hay, indícalo]

━━━━━━━━━━━━━━━━━━━━━

📧 *GMAIL — Correos con DaCodes y Clientes*
[prioriza clientes activos con 🔴/🟡/🔵; incluye próximos pasos; omite newsletters, promos y secuencias de ventas]

━━━━━━━━━━━━━━━━━━━━━
_Generado automáticamente · DaCodes Daily Briefing · Claude Code_"""

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
        system=SYSTEM_PROMPT,
    )
    return resp.content[0].text


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("Gathering data...")

    slack_client = WebClient(token=SLACK_BOT_TOKEN)
    gmail_service = get_gmail_service()

    emails = fetch_relevant_emails(gmail_service)
    slack_msgs = fetch_slack_activity(slack_client)
    meetings = fetch_circleback_meetings()

    print(f"  Gmail: {len(emails)} emails | Slack: {len(slack_msgs)} messages | Meetings: {len(meetings)}")

    print("Generating summary with Claude...")
    summary = generate_summary(emails, slack_msgs, meetings)

    print("Sending to Slack...")
    slack_client.chat_postMessage(channel=SLACK_USER_ID, text=summary, mrkdwn=True)
    print("Done.")


if __name__ == "__main__":
    main()
