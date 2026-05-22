"""
Daily Executive Summary — Slack + Circleback + Gmail
Runs at 6pm CST, sends a DM via Slack.
"""

import os
import json
import base64
import datetime
import requests
from zoneinfo import ZoneInfo

import anthropic
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


# ── Config ────────────────────────────────────────────────────────────────────

SLACK_BOT_TOKEN   = os.environ["SLACK_BOT_TOKEN"]
SLACK_USER_ID     = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")
CIRCLEBACK_TOKEN  = os.environ["CIRCLEBACK_TOKEN"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

GMAIL_CLIENT_ID       = os.environ["GMAIL_CLIENT_ID"]
GMAIL_CLIENT_SECRET   = os.environ["GMAIL_CLIENT_SECRET"]
GMAIL_REFRESH_TOKEN   = os.environ["GMAIL_REFRESH_TOKEN"]

TZ = ZoneInfo("America/Mexico_City")


# ── Helpers ───────────────────────────────────────────────────────────────────

def today_range_utc() -> tuple[str, str]:
    """Return (start_iso, end_iso) for today in Mexico City time, in UTC."""
    now = datetime.datetime.now(TZ)
    start = datetime.datetime(now.year, now.month, now.day, tzinfo=TZ)
    end   = start + datetime.timedelta(days=1)
    return start.isoformat(), end.isoformat()


def today_str() -> str:
    return datetime.datetime.now(TZ).strftime("%Y-%m-%d")


# ── Slack ─────────────────────────────────────────────────────────────────────

def fetch_slack_messages() -> list[dict]:
    client = WebClient(token=SLACK_BOT_TOKEN)
    date = today_str()
    results = []
    try:
        resp = client.search_messages(
            query=f"after:{date} before:{date}",
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
    except SlackApiError:
        pass
    return results


# ── Circleback ────────────────────────────────────────────────────────────────

def fetch_circleback_meetings() -> list[dict]:
    date = today_str()
    url = "https://api.circleback.ai/v1/meetings/search"
    headers = {
        "Authorization": f"Bearer {CIRCLEBACK_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "startDate": date,
        "endDate":   date,
        "pageIndex": 0,
        "intent":    "Daily executive summary",
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=15)
        r.raise_for_status()
        return r.json() if isinstance(r.json(), list) else []
    except Exception:
        return []


# ── Gmail ─────────────────────────────────────────────────────────────────────

def _gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def fetch_gmail_threads() -> list[dict]:
    svc = _gmail_service()
    date = today_str().replace("-", "/")
    query = (
        f"after:{date} before:{date} "
        f"-from:mailer-daemon -from:noreply -from:no-reply "
        f"-category:promotions -from:airbnb -from:booking "
        f"-subject:'AI-driven software development' "
        f"-subject:'Tu equipo ideal en software'"
    )
    threads = []
    try:
        resp = svc.users().threads().list(userId="me", q=query, maxResults=30).execute()
        for t in resp.get("threads", []):
            detail = svc.users().threads().get(
                userId="me", id=t["id"], format="metadata",
                metadataHeaders=["Subject", "From", "To", "Date"],
            ).execute()
            messages = []
            for msg in detail.get("messages", []):
                headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                messages.append({
                    "subject": headers.get("Subject", ""),
                    "from":    headers.get("From", ""),
                    "to":      headers.get("To", ""),
                    "date":    headers.get("Date", ""),
                    "snippet": msg.get("snippet", ""),
                })
            threads.append({"id": t["id"], "messages": messages})
    except Exception:
        pass
    return threads


# ── Summarize with Claude ─────────────────────────────────────────────────────

SYSTEM_PROMPT = """
Eres un asistente ejecutivo que genera resúmenes diarios concisos en español.
Organiza la información en secciones claras con bullet points.
Filtra cualquier correo que parezca una secuencia de ventas outbound (asunto: 'AI-driven software development', 'Tu equipo ideal', follow-ups masivos).
Destaca acuerdos, próximos pasos y temas que requieren atención.
"""

def build_user_prompt(date: str, slack: list, circleback: list, gmail: list) -> str:
    return f"""
Genera el resumen ejecutivo diario para el {date}.

## DATOS SLACK (mensajes del día)
{json.dumps(slack, ensure_ascii=False, indent=2) if slack else "Sin actividad registrada."}

## DATOS CIRCLEBACK (llamadas del día)
{json.dumps(circleback, ensure_ascii=False, indent=2) if circleback else "Sin reuniones registradas."}

## DATOS GMAIL (correos relevantes del día — dacodes y clientes)
{json.dumps(gmail, ensure_ascii=False, indent=2) if gmail else "Sin correos relevantes."}

Formato de salida esperado (markdown de Slack con *negrita*, _cursiva_, bullet points •):

📊 *Resumen Ejecutivo Diario — {date}*

---
## 💬 Slack
[resumen]

---
## 📞 Circleback — Llamadas del Día
[para cada reunión: nombre, participantes, temas clave, acuerdos, próximos pasos]

---
## 📧 Gmail — DaCodes & Clientes
[correos relevantes con indicadores de acción si aplica ⚠️]

---
_Generado automáticamente por Claude Code_
"""


def generate_summary(slack: list, circleback: list, gmail: list) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    date = datetime.datetime.now(TZ).strftime("%A %d %B %Y")
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(date, slack, circleback, gmail)}],
    )
    return msg.content[0].text


# ── Send to Slack ─────────────────────────────────────────────────────────────

def send_slack_dm(text: str) -> None:
    client = WebClient(token=SLACK_BOT_TOKEN)
    client.chat_postMessage(channel=SLACK_USER_ID, text=text)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Fetching data...")
    slack_data      = fetch_slack_messages()
    circleback_data = fetch_circleback_meetings()
    gmail_data      = fetch_gmail_threads()

    print(f"  Slack:      {len(slack_data)} messages")
    print(f"  Circleback: {len(circleback_data)} meetings")
    print(f"  Gmail:      {len(gmail_data)} threads")

    print("Generating summary with Claude...")
    summary = generate_summary(slack_data, circleback_data, gmail_data)

    print("Sending to Slack...")
    send_slack_dm(summary)
    print("Done.")


if __name__ == "__main__":
    main()
