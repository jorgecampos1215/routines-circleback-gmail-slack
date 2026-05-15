#!/usr/bin/env python3
"""
Daily executive summary: fetches Slack, Circleback, and Gmail data,
generates a summary via Claude API, and sends it as a Slack DM.
"""

import os
import json
import time
import datetime
import base64
import re
import sys
from typing import Optional

import anthropic
import requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


# ── Configuration ────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN   = os.environ["SLACK_BOT_TOKEN"]
SLACK_TARGET_USER = os.environ.get("SLACK_TARGET_USER_ID", "U02G57N1UDP")
CIRCLEBACK_API_KEY = os.environ["CIRCLEBACK_API_KEY"]
ANTHROPIC_API_KEY  = os.environ["ANTHROPIC_API_KEY"]

GMAIL_CLIENT_ID     = os.environ.get("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET", "")
GMAIL_REFRESH_TOKEN = os.environ.get("GMAIL_REFRESH_TOKEN", "")

TODAY = datetime.date.today()
TODAY_STR      = TODAY.strftime("%Y-%m-%d")
TODAY_DISPLAY  = TODAY.strftime("%A %d de %B, %Y")
YESTERDAY      = (TODAY - datetime.timedelta(days=1)).strftime("%Y-%m-%d")


# ── Slack helpers ─────────────────────────────────────────────────────────────

def slack_get(endpoint: str, params: dict) -> dict:
    resp = requests.get(
        f"https://slack.com/api/{endpoint}",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def slack_post(endpoint: str, payload: dict) -> dict:
    resp = requests.post(
        f"https://slack.com/api/{endpoint}",
        headers={
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_slack_messages() -> str:
    """Search Slack for today's messages across all channels."""
    result = slack_get("search.messages", {
        "query": f"after:{YESTERDAY}",
        "sort": "timestamp",
        "sort_dir": "desc",
        "count": 50,
    })

    messages = result.get("messages", {}).get("matches", [])
    if not messages:
        return "Sin actividad en Slack hoy."

    # Deduplicate by channel and group
    by_channel: dict[str, list[str]] = {}
    for m in messages:
        ch = m.get("channel", {}).get("name", "unknown")
        text = m.get("text", "").strip()
        user = m.get("username", m.get("user", ""))
        if text and not text.startswith("has joined") and not text.startswith("has left"):
            by_channel.setdefault(ch, []).append(f"[{user}]: {text[:200]}")

    lines = []
    for ch, msgs in list(by_channel.items())[:10]:
        lines.append(f"**#{ch}**")
        for msg in msgs[:5]:
            lines.append(f"  - {msg}")
    return "\n".join(lines) if lines else "Sin actividad en Slack hoy."


# ── Circleback helpers ────────────────────────────────────────────────────────

def fetch_circleback_meetings() -> str:
    """Fetch today's (and yesterday's) meetings from Circleback."""
    headers = {"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"}
    params  = {"start_date": YESTERDAY, "end_date": TODAY_STR}

    try:
        resp = requests.get(
            "https://app.circleback.ai/api/meetings",
            headers=headers,
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        meetings = resp.json()
    except Exception as exc:
        return f"Error al obtener reuniones de Circleback: {exc}"

    if not meetings:
        return "Sin reuniones registradas hoy."

    lines = []
    for m in meetings:
        name      = m.get("name", "Sin nombre")
        attendees = ", ".join(a.get("name", a.get("email", "")) for a in m.get("attendees", []))
        notes     = m.get("notes", "")
        lines.append(f"**{name}** | Participantes: {attendees}\n{notes[:800]}")
    return "\n\n---\n\n".join(lines)


# ── Gmail helpers ─────────────────────────────────────────────────────────────

def build_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


SALES_PATTERN = re.compile(
    r"DaCodes.*Talent That Delivers|Tu equipo ideal en software|Touching base on our previous",
    re.IGNORECASE,
)
DACODES_PATTERN = re.compile(r"@dacodes\.(com|ai|mx)", re.IGNORECASE)


def fetch_gmail_threads() -> str:
    """Fetch relevant Gmail threads from the last 24h."""
    try:
        service = build_gmail_service()
    except Exception as exc:
        return f"Error al conectar Gmail: {exc}"

    query = f"newer_than:1d (dacodes OR cliente) -category:promotions -category:social"
    try:
        result = service.users().threads().list(
            userId="me", q=query, maxResults=25
        ).execute()
    except Exception as exc:
        return f"Error al buscar correos: {exc}"

    threads = result.get("threads", [])
    if not threads:
        return "Sin correos relevantes hoy."

    lines = []
    for t in threads:
        try:
            thread = service.users().threads().get(userId="me", id=t["id"]).execute()
        except Exception:
            continue

        msgs = thread.get("messages", [])
        if not msgs:
            continue

        # Use first message headers for subject/sender
        headers = {h["name"]: h["value"] for h in msgs[0].get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "(sin asunto)")
        sender  = headers.get("From", "")
        snippet = msgs[-1].get("snippet", "")[:200]

        # Skip sales sequences
        if SALES_PATTERN.search(subject) or SALES_PATTERN.search(snippet):
            continue

        lines.append(f"- **{subject}** | De: {sender}\n  _{snippet}_")

    return "\n".join(lines) if lines else "Sin correos relevantes hoy (excluidas secuencias de ventas)."


# ── Claude summary ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
Eres un asistente ejecutivo de DaCodes. Tu tarea es generar un resumen ejecutivo diario \
conciso en español a partir de datos crudos de Slack, Circleback y Gmail. \
Usa encabezados claros (##), bullet points (-) y sé conciso. \
El mensaje se enviará por Slack así que usa formato Markdown de Slack (**negrita**, _cursiva_). \
No incluyas secciones vacías. Máximo 3000 caracteres en total.\
"""


def generate_summary(slack_data: str, circleback_data: str, gmail_data: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    user_message = f"""Genera el resumen ejecutivo diario para {TODAY_DISPLAY}.

=== DATOS SLACK ===
{slack_data}

=== DATOS CIRCLEBACK (llamadas) ===
{circleback_data}

=== DATOS GMAIL ===
{gmail_data}

El resumen debe comenzar con:
## 📋 Resumen Ejecutivo Diario — {TODAY_DISPLAY}

Secciones requeridas: 💬 SLACK, 📞 CIRCLEBACK, 📧 GMAIL.
Para Circleback incluye: participantes, temas clave, acuerdos, próximos pasos.
Para Gmail ignora correos de secuencias de ventas outbound."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


# ── Send to Slack ─────────────────────────────────────────────────────────────

def send_slack_dm(text: str) -> str:
    """Open a DM channel with the target user and post the message."""
    open_resp = slack_post("conversations.open", {"users": SLACK_TARGET_USER})
    if not open_resp.get("ok"):
        raise RuntimeError(f"conversations.open failed: {open_resp}")

    channel_id = open_resp["channel"]["id"]
    post_resp  = slack_post("chat.postMessage", {
        "channel": channel_id,
        "text": text,
        "mrkdwn": True,
    })
    if not post_resp.get("ok"):
        raise RuntimeError(f"chat.postMessage failed: {post_resp}")

    return post_resp.get("ts", "")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"[{TODAY_STR}] Fetching data from Slack, Circleback, Gmail…")

    slack_data      = fetch_slack_messages()
    circleback_data = fetch_circleback_meetings()
    gmail_data      = fetch_gmail_threads()

    print("Generating summary via Claude…")
    summary = generate_summary(slack_data, circleback_data, gmail_data)

    print("Sending to Slack…")
    ts = send_slack_dm(summary)
    print(f"Sent. Message ts: {ts}")


if __name__ == "__main__":
    main()
