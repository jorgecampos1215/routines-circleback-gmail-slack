#!/usr/bin/env python3
"""
Daily Executive Summary — DaCodes
Recopila información de Gmail (incluyendo notas de Circleback) y Slack,
genera un resumen ejecutivo con Claude y lo envía por Slack DM.
"""

import os
import json
import base64
import re
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


# ── Configuración ──────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN   = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID     = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# Gmail OAuth2 — se espera el JSON del token almacenado en base64
GMAIL_TOKEN_B64       = os.environ["GMAIL_TOKEN_B64"]
GMAIL_CREDENTIALS_B64 = os.environ["GMAIL_CREDENTIALS_B64"]


# ── Gmail ──────────────────────────────────────────────────────────────────────

def get_gmail_service():
    token_json = json.loads(base64.b64decode(GMAIL_TOKEN_B64))
    creds_json = json.loads(base64.b64decode(GMAIL_CREDENTIALS_B64))

    creds = Credentials(
        token=token_json.get("token"),
        refresh_token=token_json.get("refresh_token"),
        token_uri=creds_json["installed"]["token_uri"],
        client_id=creds_json["installed"]["client_id"],
        client_secret=creds_json["installed"]["client_secret"],
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

    return build("gmail", "v1", credentials=creds)


def get_email_body(payload):
    """Extrae el texto plano de un mensaje de Gmail."""
    if payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore") if data else ""

    for part in payload.get("parts", []):
        text = get_email_body(part)
        if text:
            return text
    return ""


def fetch_emails(service, hours_back=24):
    """Obtiene emails relevantes de las últimas N horas."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    after_ts = int(cutoff.timestamp())

    # Circleback: notas de reuniones
    circleback_results = service.users().messages().list(
        userId="me",
        q=f"from:notifications@circleback.ai after:{after_ts}",
        maxResults=20,
    ).execute()

    # Emails DaCodes + clientes (excluye ventas outbound y secuencias)
    dacodes_results = service.users().messages().list(
        userId="me",
        q=(
            f"after:{after_ts} "
            "(from:@dacodes.com OR to:@dacodes.com) "
            "-from:noreply -from:no-reply "
            "-subject:unsubscribe -subject:newsletter "
            "-from:notifications@hubspot.com "
            "-from:notifications@circleback.ai"
        ),
        maxResults=40,
    ).execute()

    def extract_messages(results):
        messages = []
        for m in results.get("messages", []):
            msg = service.users().messages().get(
                userId="me", id=m["id"], format="full"
            ).execute()
            headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            body = get_email_body(msg["payload"])
            # Limpiar HTML básico
            body = re.sub(r"<[^>]+>", "", body)
            body = re.sub(r"\s{3,}", "\n\n", body)
            messages.append({
                "subject": headers.get("Subject", "(sin asunto)"),
                "from":    headers.get("From", ""),
                "to":      headers.get("To", ""),
                "date":    headers.get("Date", ""),
                "snippet": msg.get("snippet", ""),
                "body":    body[:3000],
            })
        return messages

    return {
        "circleback": extract_messages(circleback_results),
        "emails":     extract_messages(dacodes_results),
    }


# ── Slack ──────────────────────────────────────────────────────────────────────

def fetch_slack_messages(hours_back=24):
    """Obtiene mensajes recientes de todos los canales accesibles."""
    client = WebClient(token=SLACK_BOT_TOKEN)
    cutoff_ts = str((datetime.now(timezone.utc) - timedelta(hours=hours_back)).timestamp())

    conversations = []
    try:
        response = client.conversations_list(
            types="public_channel,private_channel,mpim,im",
            limit=100,
        )
        for ch in response["channels"]:
            try:
                history = client.conversations_history(
                    channel=ch["id"],
                    oldest=cutoff_ts,
                    limit=50,
                )
                msgs = [
                    {
                        "channel": ch.get("name") or ch["id"],
                        "user":    m.get("user", "bot"),
                        "text":    m.get("text", ""),
                        "ts":      m.get("ts", ""),
                    }
                    for m in history.get("messages", [])
                    if m.get("type") == "message" and not m.get("bot_id")
                ]
                if msgs:
                    conversations.extend(msgs)
            except SlackApiError:
                pass
    except SlackApiError as e:
        print(f"Slack error: {e}")

    return conversations


# ── Claude ─────────────────────────────────────────────────────────────────────

SUMMARY_PROMPT = """Eres el asistente ejecutivo de Jorge Campos, Co-CEO de DaCodes.
Genera un resumen ejecutivo diario conciso en español basado en la información proporcionada.

REGLAS:
- Usa encabezados claros con emojis
- Bullet points concisos
- Ignora correos de vendedores externos, newsletters, secuencias de marketing
- Para Circleback: menciona participantes clave, temas, acuerdos y próximos pasos
- Para Gmail: solo DaCodes y clientes con los que interactúan
- Para Slack: solo conversaciones con contenido relevante (ignora notificaciones de bots)
- Agrupa por tema/cliente cuando sea posible
- Termina con una sección de "Pendientes urgentes" si hay items críticos

Fecha del resumen: {date}

=== CIRCLEBACK (notas de llamadas) ===
{circleback}

=== GMAIL (correos DaCodes + clientes) ===
{emails}

=== SLACK (mensajes del día) ===
{slack}
"""


def generate_summary(data: dict) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def fmt_circleback(msgs):
        if not msgs:
            return "Sin llamadas registradas hoy."
        parts = []
        for m in msgs:
            parts.append(f"**{m['subject']}**\n{m['body'][:2000]}")
        return "\n\n---\n\n".join(parts)

    def fmt_emails(msgs):
        if not msgs:
            return "Sin correos relevantes hoy."
        parts = []
        for m in msgs:
            parts.append(
                f"De: {m['from']}\nAsunto: {m['subject']}\nFecha: {m['date']}\n{m['snippet']}"
            )
        return "\n\n".join(parts)

    def fmt_slack(msgs):
        if not msgs:
            return "Sin actividad en Slack hoy."
        parts = []
        for m in msgs:
            parts.append(f"[#{m['channel']}] {m['text'][:300]}")
        return "\n".join(parts[:100])

    today = datetime.now(timezone(timedelta(hours=-5))).strftime("%A %d de %B, %Y")

    prompt = SUMMARY_PROMPT.format(
        date=today,
        circleback=fmt_circleback(data["circleback"]),
        emails=fmt_emails(data["emails"]),
        slack=fmt_slack(data["slack"]),
    )

    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ── Slack send ─────────────────────────────────────────────────────────────────

def send_slack_dm(text: str):
    client = WebClient(token=SLACK_BOT_TOKEN)
    # Abre DM con el usuario
    dm = client.conversations_open(users=[SLACK_USER_ID])
    channel_id = dm["channel"]["id"]
    client.chat_postMessage(channel=channel_id, text=text)
    print(f"Resumen enviado a {SLACK_USER_ID} ({channel_id})")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("Recopilando datos...")

    gmail_service = get_gmail_service()
    gmail_data    = fetch_emails(gmail_service, hours_back=24)
    slack_msgs    = fetch_slack_messages(hours_back=24)

    print(
        f"Circleback: {len(gmail_data['circleback'])} | "
        f"Emails: {len(gmail_data['emails'])} | "
        f"Slack: {len(slack_msgs)}"
    )

    data = {
        "circleback": gmail_data["circleback"],
        "emails":     gmail_data["emails"],
        "slack":      slack_msgs,
    }

    print("Generando resumen con Claude...")
    summary = generate_summary(data)

    print("Enviando a Slack...")
    send_slack_dm(summary)
    print("Listo.")


if __name__ == "__main__":
    main()
