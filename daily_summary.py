"""
Daily Executive Summary — DaCodes
Runs at 6pm CST, fetches Slack/Gmail/Circleback data, generates summary via Claude, posts to Slack DM.
"""

import os
import json
import re
from datetime import datetime, timezone, timedelta

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import requests

# ── Config ────────────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN      = os.environ["SLACK_BOT_TOKEN"]
SLACK_SUMMARY_USER   = os.environ.get("SLACK_SUMMARY_USER_ID", "U02G57N1UDP")
ANTHROPIC_API_KEY    = os.environ["ANTHROPIC_API_KEY"]
CIRCLEBACK_API_TOKEN = os.environ.get("CIRCLEBACK_API_TOKEN", "")

# Gmail OAuth tokens (JSON string stored in env var)
GMAIL_TOKEN_JSON     = os.environ.get("GMAIL_TOKEN_JSON", "")
GMAIL_CREDENTIALS_JSON = os.environ.get("GMAIL_CREDENTIALS_JSON", "")

CST = timezone(timedelta(hours=-6))

# Channels to scan on Slack (add more as needed)
SLACK_CHANNELS = [
    "C02GG7RB1K2",  # #talentaugmentation
]

# Gmail filter terms — threads must involve these to be included
DACODES_DOMAINS = ["dacodes.com", "dacodes.ai"]
IGNORE_SENDERS  = [
    "airbnb", "linkedin", "trovit", "substack", "beehiiv",
    "crunchbase", "openai", "aa.com", "bamboohr", "apollo.io",
    "aiagentstore", "americanexpress", "workable",
]
SEQUENCE_SUBJECTS = [
    "tu equipo ideal en software",
    "ai-driven software development",
]

# ── Slack ─────────────────────────────────────────────────────────────────────

def fetch_slack_activity(today_ts: float, tomorrow_ts: float) -> str:
    client = WebClient(token=SLACK_BOT_TOKEN)
    sections = []

    for channel_id in SLACK_CHANNELS:
        try:
            resp = client.conversations_history(
                channel=channel_id,
                oldest=str(today_ts),
                latest=str(tomorrow_ts),
                limit=100,
            )
            msgs = resp.get("messages", [])
            if not msgs:
                continue
            lines = [f"*#{channel_id}*"]
            for m in msgs:
                if m.get("subtype") or m.get("bot_id"):
                    continue
                text = m.get("text", "").strip()
                if text:
                    lines.append(f"  • {text[:300]}")
            if len(lines) > 1:
                sections.append("\n".join(lines))
        except SlackApiError:
            pass

    # Search DMs for current user
    try:
        resp = client.search_messages(
            query=f"from:me after:{_date_str(today_ts)} before:{_date_str(tomorrow_ts)}",
            count=50,
        )
        matches = resp.get("messages", {}).get("matches", [])
        dm_lines = []
        for m in matches:
            if m.get("channel", {}).get("is_im"):
                text = m.get("text", "").strip()
                if text:
                    dm_lines.append(f"  • {text[:300]}")
        if dm_lines:
            sections.append("*DMs enviados:*\n" + "\n".join(dm_lines))
    except SlackApiError:
        pass

    return "\n\n".join(sections) if sections else "Sin actividad nueva hoy en Slack."


def _date_str(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=CST).strftime("%Y-%m-%d")


# ── Gmail ─────────────────────────────────────────────────────────────────────

def fetch_gmail_activity(date_str: str) -> str:
    if not GMAIL_TOKEN_JSON:
        return "Gmail no configurado (falta GMAIL_TOKEN_JSON)."

    token_data = json.loads(GMAIL_TOKEN_JSON)
    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )

    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    query = (
        f"newer_than:1d "
        f"-category:promotions "
        f"-from:airbnb -from:linkedin -from:trovit -from:substack "
        f"-from:beehiiv -from:crunchbase -from:openai -from:aa.com "
        f"-from:bamboohr -from:workable -from:americanexpress"
    )

    result = service.users().threads().list(
        userId="me", q=query, maxResults=50
    ).execute()

    threads = result.get("threads", [])
    relevant = []

    for t in threads:
        thread = service.users().threads().get(
            userId="me", id=t["id"], format="metadata",
            metadataHeaders=["Subject", "From", "To", "Cc"],
        ).execute()
        msgs = thread.get("messages", [])
        if not msgs:
            continue

        first = msgs[-1]
        headers = {h["name"]: h["value"] for h in first.get("payload", {}).get("headers", [])}
        subject  = headers.get("Subject", "")
        sender   = headers.get("From", "")
        snippet  = first.get("snippet", "")

        # Skip sequences
        if any(kw in subject.lower() for kw in SEQUENCE_SUBJECTS):
            continue
        # Skip ignored senders
        if any(ign in sender.lower() for ign in IGNORE_SENDERS):
            continue
        # Keep only dacodes-related or client threads
        all_participants = " ".join([sender, headers.get("To", ""), headers.get("Cc", "")])
        if not any(d in all_participants.lower() for d in DACODES_DOMAINS):
            continue

        relevant.append(f"• *{subject}* — {_clean_sender(sender)}\n  {snippet[:200]}")

    return "\n".join(relevant) if relevant else "Sin correos relevantes DaCodes/clientes hoy."


def _clean_sender(raw: str) -> str:
    # Extract display name or email from "Name <email>"
    m = re.match(r"^(.+?)\s*<", raw)
    return m.group(1).strip() if m else raw.strip()


# ── Circleback ────────────────────────────────────────────────────────────────

def fetch_circleback_calls(date_str: str) -> str:
    if not CIRCLEBACK_API_TOKEN:
        return "Circleback no configurado (falta CIRCLEBACK_API_TOKEN)."

    headers = {"Authorization": f"Bearer {CIRCLEBACK_API_TOKEN}"}
    try:
        resp = requests.get(
            "https://app.circleback.ai/api/v1/meetings",
            headers=headers,
            params={"date": date_str},
            timeout=15,
        )
        resp.raise_for_status()
        meetings = resp.json().get("data", [])
    except Exception as e:
        return f"Error al obtener llamadas de Circleback: {e}"

    if not meetings:
        return "Sin llamadas registradas hoy en Circleback."

    lines = []
    for m in meetings:
        title        = m.get("title", "Llamada sin título")
        participants = ", ".join(p.get("name", "") for p in m.get("participants", []))
        summary      = m.get("summary", "")
        action_items = m.get("action_items", [])

        block = [f"**{title}**", f"Participantes: {participants}"]
        if summary:
            block.append(f"Resumen: {summary[:400]}")
        if action_items:
            block.append("Próximos pasos:")
            for ai in action_items[:5]:
                block.append(f"  • {ai}")
        lines.append("\n".join(block))

    return "\n\n".join(lines)


# ── Claude summary ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres el asistente ejecutivo de Jorge Campos, cofundador de DaCodes.
Genera resúmenes ejecutivos diarios concisos en español, con emojis de sección,
bullet points y encabezados claros. Sé directo y accionable. Máximo 120 palabras por sección."""

def generate_summary(date_label: str, slack: str, circleback: str, gmail: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    user_content = f"""Genera el resumen ejecutivo diario para {date_label}.

=== SLACK ===
{slack}

=== CIRCLEBACK ===
{circleback}

=== GMAIL ===
{gmail}

Formato requerido:
1. Encabezado con fecha
2. Sección SLACK con conversaciones clave
3. Sección CIRCLEBACK con llamadas (participantes, temas, acuerdos, próximos pasos)
4. Sección GMAIL con correos DaCodes/clientes relevantes (ignora vendors que quieren vender)
5. Sección AGENDA MAÑANA con los puntos más urgentes
6. Pie: "Generado automáticamente · DaCodes Executive Summary Bot · {date_label}"
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return message.content[0].text


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    now_cst    = datetime.now(tz=CST)
    today_cst  = now_cst.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow   = today_cst + timedelta(days=1)
    date_label = now_cst.strftime("%-d de %B %Y")
    date_str   = now_cst.strftime("%Y-%m-%d")

    today_ts    = today_cst.timestamp()
    tomorrow_ts = tomorrow.timestamp()

    print(f"[{now_cst.isoformat()}] Generando resumen para {date_label}...")

    slack_data  = fetch_slack_activity(today_ts, tomorrow_ts)
    cb_data     = fetch_circleback_calls(date_str)
    gmail_data  = fetch_gmail_activity(date_str)

    summary = generate_summary(date_label, slack_data, cb_data, gmail_data)

    slack_client = WebClient(token=SLACK_BOT_TOKEN)
    slack_client.chat_postMessage(
        channel=SLACK_SUMMARY_USER,
        text=summary,
        mrkdwn=True,
    )
    print("Resumen enviado a Slack.")


if __name__ == "__main__":
    main()
