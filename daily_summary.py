"""
Daily Executive Summary Generator
Fetches data from Slack, Circleback, and Gmail, then sends a DM summary via Slack at 6pm CST.
"""

import os
import json
import base64
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import requests


# ── Config ──────────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID = os.environ["SLACK_USER_ID"]          # U02G57N1UDP
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CIRCLEBACK_API_KEY = os.environ.get("CIRCLEBACK_API_KEY", "")

# Gmail OAuth credentials (stored as JSON string in env)
GMAIL_TOKEN_JSON = os.environ.get("GMAIL_TOKEN_JSON", "")

CST_OFFSET = timezone(timedelta(hours=-6))


# ── Helpers ──────────────────────────────────────────────────────────────────

def today_cst() -> datetime:
    return datetime.now(CST_OFFSET).replace(hour=0, minute=0, second=0, microsecond=0)


def today_range_unix() -> tuple[float, float]:
    start = today_cst()
    end = start + timedelta(days=1)
    return start.timestamp(), end.timestamp()


# ── Slack ────────────────────────────────────────────────────────────────────

CHANNELS_TO_MONITOR = [
    "general", "talentaugmentation", "proyectos-internos", "leads",
    "ventas", "clientes", "directivos",
]


def fetch_slack_messages() -> str:
    client = WebClient(token=SLACK_BOT_TOKEN)
    start_ts, end_ts = today_range_unix()
    sections: list[str] = []

    # Resolve channel names to IDs
    channel_map: dict[str, str] = {}
    try:
        cursor = None
        while True:
            kwargs = {"types": "public_channel,private_channel", "limit": 200}
            if cursor:
                kwargs["cursor"] = cursor
            resp = client.conversations_list(**kwargs)
            for ch in resp["channels"]:
                if ch["name"] in CHANNELS_TO_MONITOR:
                    channel_map[ch["name"]] = ch["id"]
            cursor = resp.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                break
    except SlackApiError:
        pass

    for name, ch_id in channel_map.items():
        try:
            resp = client.conversations_history(
                channel=ch_id,
                oldest=str(start_ts),
                latest=str(end_ts),
                limit=50,
            )
            messages = resp.get("messages", [])
            if not messages:
                continue
            lines = [f"## #{name}"]
            for m in reversed(messages):
                if m.get("subtype") or m.get("bot_id"):
                    continue
                user_info = _get_user_name(client, m.get("user", ""))
                lines.append(f"- {user_info}: {m.get('text', '')[:300]}")
            if len(lines) > 1:
                sections.append("\n".join(lines))
        except SlackApiError:
            continue

    # Also fetch DMs sent to/from the user
    try:
        dm_resp = client.conversations_history(
            channel=SLACK_USER_ID,
            oldest=str(start_ts),
            latest=str(end_ts),
            limit=30,
        )
        dm_msgs = dm_resp.get("messages", [])
        if dm_msgs:
            lines = ["## DMs recibidos"]
            for m in reversed(dm_msgs):
                if m.get("bot_id"):
                    continue
                lines.append(f"- {m.get('text', '')[:300]}")
            if len(lines) > 1:
                sections.append("\n".join(lines))
    except SlackApiError:
        pass

    return "\n\n".join(sections) if sections else "Sin actividad en Slack hoy."


_user_cache: dict[str, str] = {}


def _get_user_name(client: WebClient, user_id: str) -> str:
    if not user_id:
        return "Desconocido"
    if user_id not in _user_cache:
        try:
            info = client.users_info(user=user_id)
            profile = info["user"]["profile"]
            _user_cache[user_id] = profile.get("real_name") or profile.get("display_name") or user_id
        except SlackApiError:
            _user_cache[user_id] = user_id
    return _user_cache[user_id]


# ── Circleback ────────────────────────────────────────────────────────────────

def fetch_circleback_meetings() -> str:
    if not CIRCLEBACK_API_KEY:
        return "Circleback: API key no configurada."

    today = today_cst().strftime("%Y-%m-%d")
    url = "https://app.circleback.ai/api/v1/meetings"
    headers = {"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"}
    params = {"date": today}

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        meetings = resp.json()
    except Exception as e:
        return f"Circleback: error al obtener reuniones — {e}"

    if not meetings:
        return "Sin llamadas registradas hoy en Circleback."

    sections: list[str] = []
    for m in meetings:
        title = m.get("title", "Sin título")
        participants = ", ".join(
            p.get("name") or p.get("email", "") for p in m.get("participants", [])
        )
        summary = m.get("summary") or m.get("notes") or ""
        action_items = m.get("action_items") or []
        ai_text = "\n".join(f"  • {a}" for a in action_items)
        block = f"**{title}**\nParticipantes: {participants}\nResumen: {summary[:500]}"
        if ai_text:
            block += f"\nPróximos pasos:\n{ai_text}"
        sections.append(block)

    return "\n\n".join(sections)


# ── Gmail ────────────────────────────────────────────────────────────────────

DACODES_DOMAIN = "dacodes"
OUTBOUND_SEQUENCE_SUBJECTS = [
    "top engineers ready",
    "ai-driven software development",
    "just following up",
]
IGNORED_SENDERS = ["noreply", "no-reply", "invitations@linkedin", "notifications@"]


def fetch_gmail_threads() -> str:
    if not GMAIL_TOKEN_JSON:
        return "Gmail: credenciales no configuradas."

    try:
        token_data = json.loads(GMAIL_TOKEN_JSON)
        creds = Credentials(
            token=token_data.get("token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret"),
            scopes=token_data.get("scopes", ["https://www.googleapis.com/auth/gmail.readonly"]),
        )
        service = build("gmail", "v1", credentials=creds)
    except Exception as e:
        return f"Gmail: error de autenticación — {e}"

    today = today_cst()
    query = (
        f"newer_than:1d "
        f"-from:noreply -from:no-reply "
        f"-category:promotions -category:forums "
        f"({DACODES_DOMAIN} OR dacodes.com OR dacodes.ai)"
    )

    try:
        result = service.users().threads().list(userId="me", q=query, maxResults=30).execute()
        thread_ids = [t["id"] for t in result.get("threads", [])]
    except Exception as e:
        return f"Gmail: error al buscar hilos — {e}"

    if not thread_ids:
        return "Sin correos relevantes hoy."

    sections: list[str] = []
    for tid in thread_ids[:20]:
        try:
            thread = service.users().threads().get(userId="me", id=tid, format="metadata").execute()
            msg = thread["messages"][-1]
            headers = {h["name"].lower(): h["value"] for h in msg["payload"]["headers"]}
            subject = headers.get("subject", "(sin asunto)")
            sender = headers.get("from", "")
            date = headers.get("date", "")
            snippet = thread["messages"][-1].get("snippet", "")

            # Skip outbound sequences
            if any(kw in subject.lower() for kw in OUTBOUND_SEQUENCE_SUBJECTS):
                continue
            if any(ign in sender.lower() for ign in IGNORED_SENDERS):
                continue

            sections.append(f"**{subject}**\nDe: {sender}\nResumen: {snippet[:300]}")
        except Exception:
            continue

    return "\n\n".join(sections) if sections else "Sin correos relevantes hoy."


# ── Claude summary ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres el asistente ejecutivo de Jorge Campos, Co-Founder de DaCodes.
Tu trabajo es generar un resumen ejecutivo diario conciso y accionable en español.
Usa emojis de Slack, bullets y encabezados en negrita.
Destaca claramente los puntos que requieren acción de Jorge con ⚠️ o ⏳.
Máximo ~600 palabras. Formato Slack markdown."""


def generate_summary(slack_data: str, circleback_data: str, gmail_data: str) -> str:
    today_str = today_cst().strftime("%-d de %B %Y")
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""Genera el resumen ejecutivo diario de hoy ({today_str}) con la siguiente información:

=== SLACK ===
{slack_data}

=== CIRCLEBACK (llamadas) ===
{circleback_data}

=== GMAIL ===
{gmail_data}

Instrucciones:
- Slack: resume las conversaciones más importantes del día
- Circleback: incluye participantes, temas clave, acuerdos y próximos pasos
- Gmail: solo correos que involucren gente de DaCodes y clientes activos (ignora ventas frías/secuencias)
- Marca claramente los puntos pendientes de acción
- Comienza con ":clipboard: *RESUMEN EJECUTIVO DIARIO — {today_str}*"
- Termina con "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n_Resumen generado automáticamente · DaCodes · {today_str} · 6:00 PM_"
"""

    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ── Send to Slack ─────────────────────────────────────────────────────────────

def send_slack_dm(text: str) -> None:
    client = WebClient(token=SLACK_BOT_TOKEN)
    client.chat_postMessage(channel=SLACK_USER_ID, text=text, mrkdwn=True)
    print(f"✅ Resumen enviado a {SLACK_USER_ID}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"📊 Generando resumen del {today_cst().strftime('%Y-%m-%d')}...")

    print("  → Obteniendo mensajes de Slack...")
    slack_data = fetch_slack_messages()

    print("  → Obteniendo llamadas de Circleback...")
    circleback_data = fetch_circleback_meetings()

    print("  → Obteniendo correos de Gmail...")
    gmail_data = fetch_gmail_threads()

    print("  → Generando resumen con Claude...")
    summary = generate_summary(slack_data, circleback_data, gmail_data)

    print("  → Enviando DM por Slack...")
    send_slack_dm(summary)

    print("✅ Listo.")


if __name__ == "__main__":
    main()
