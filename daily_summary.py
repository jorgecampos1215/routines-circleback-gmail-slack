#!/usr/bin/env python3
"""
Daily executive summary generator.
Fetches data from Circleback, Gmail, and Slack, then sends a summary via Slack DM.
"""

import os
import json
import base64
import requests
from datetime import date, timedelta
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import anthropic
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ── Config ────────────────────────────────────────────────────────────────────
TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
SLACK_USER_ID = os.environ.get("SLACK_USER_ID", "U02G57N1UDP")

# ── Clients ───────────────────────────────────────────────────────────────────
anthropic_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
slack_client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])


# ── Data fetchers ─────────────────────────────────────────────────────────────

def fetch_circleback_meetings(start_date: str, end_date: str) -> list:
    api_key = os.environ.get("CIRCLEBACK_API_KEY", "")
    if not api_key:
        return []
    try:
        resp = requests.get(
            "https://api.circleback.ai/v1/meetings",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"startDate": start_date, "endDate": end_date},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json() if isinstance(resp.json(), list) else resp.json().get("meetings", [])
    except Exception as e:
        print(f"Circleback fetch error: {e}")
        return []


def _gmail_service():
    creds_b64 = os.environ.get("GMAIL_TOKEN_JSON", "")
    if not creds_b64:
        return None
    token_data = json.loads(base64.b64decode(creds_b64).decode())
    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def fetch_gmail_threads(query: str) -> list:
    service = _gmail_service()
    if not service:
        return []
    try:
        result = service.users().threads().list(
            userId="me", q=query, maxResults=20
        ).execute()
        threads = result.get("threads", [])
        # Fetch snippet + metadata for each thread
        enriched = []
        for t in threads[:15]:
            detail = service.users().threads().get(
                userId="me", id=t["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date"],
            ).execute()
            msgs = detail.get("messages", [])
            if msgs:
                headers = {h["name"]: h["value"] for h in msgs[-1].get("payload", {}).get("headers", [])}
                enriched.append({
                    "subject": headers.get("Subject", ""),
                    "from": headers.get("From", ""),
                    "date": headers.get("Date", ""),
                    "snippet": msgs[-1].get("snippet", ""),
                })
        return enriched
    except Exception as e:
        print(f"Gmail fetch error: {e}")
        return []


def fetch_slack_messages(query: str) -> list:
    try:
        resp = slack_client.search_messages(query=query, sort="timestamp", sort_dir="desc", count=20)
        matches = resp.get("messages", {}).get("matches", [])
        return [
            {"channel": m.get("channel", {}).get("name", ""), "user": m.get("username", ""), "text": m.get("text", ""), "ts": m.get("ts", "")}
            for m in matches
        ]
    except SlackApiError as e:
        print(f"Slack fetch error: {e}")
        return []


# ── Tool definitions for Claude ───────────────────────────────────────────────

TOOLS = [
    {
        "name": "search_circleback_meetings",
        "description": "Busca reuniones/llamadas del día en Circleback. Retorna lista de meetings con notas, participantes y acuerdos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Fecha inicio ISO (yyyy-MM-dd)"},
                "end_date": {"type": "string", "description": "Fecha fin ISO (yyyy-MM-dd)"},
            },
            "required": ["start_date", "end_date"],
        },
    },
    {
        "name": "search_gmail_threads",
        "description": "Busca hilos de correo en Gmail usando sintaxis de búsqueda de Gmail.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Consulta Gmail (ej: 'after:2026/05/24 from:dacodes.com')"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_slack_messages",
        "description": "Busca mensajes en canales de Slack del workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query de búsqueda Slack (ej: 'on:2026-05-24')"},
            },
            "required": ["query"],
        },
    },
]


def execute_tool(name: str, inputs: dict) -> str:
    if name == "search_circleback_meetings":
        data = fetch_circleback_meetings(inputs["start_date"], inputs["end_date"])
        return json.dumps(data, ensure_ascii=False)
    if name == "search_gmail_threads":
        data = fetch_gmail_threads(inputs["query"])
        return json.dumps(data, ensure_ascii=False)
    if name == "search_slack_messages":
        data = fetch_slack_messages(inputs["query"])
        return json.dumps(data, ensure_ascii=False)
    return json.dumps({"error": f"Unknown tool: {name}"})


# ── Summary generation (agentic loop) ────────────────────────────────────────

SYSTEM_PROMPT = """Eres un asistente ejecutivo que genera resúmenes diarios concisos para el CEO de DaCodes, una empresa de software y staffing tecnológico.

Tu tarea al recibir la fecha del día:
1. Usa las herramientas disponibles para obtener datos de Slack, Circleback y Gmail.
2. Genera un resumen ejecutivo estructurado.

Reglas para el resumen:
- **Slack**: Resume las conversaciones más importantes del día. Si no hay actividad, indícalo brevemente.
- **Circleback**: Resume cada llamada del día con: participantes, temas clave, acuerdos y próximos pasos. Si no hay reuniones del día, toma las del último día laboral.
- **Gmail**: Solo incluye correos de personas de DaCodes (dacodes.com) y clientes reales. Ignora: newsletters, notificaciones automáticas, correos de venta/prospecting que nos llegan, alertas de sistemas, redes sociales.
- Usa formato Slack markdown: **negrita**, bullet points con -, encabezados con ##.
- Sé conciso. Máximo 4500 caracteres en total.
- Al final añade siempre: `_Generado automáticamente · DaCodes Executive Daily Briefing_`"""


def generate_summary(target_date: str) -> str:
    messages = [
        {
            "role": "user",
            "content": f"Genera el resumen ejecutivo diario para el {target_date}. Usa las herramientas para obtener los datos actuales.",
        }
    ]

    while True:
        response = anthropic_client.messages.create(
            model="claude-opus-4-7",
            max_tokens=4096,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            return next(
                (b.text for b in response.content if b.type == "text"),
                "Error: no summary generated.",
            )

        # Process tool calls
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  → Calling tool: {block.name} {block.input}")
                result = execute_tool(block.name, block.input)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result}
                )
        messages.append({"role": "user", "content": tool_results})


# ── Slack sender ──────────────────────────────────────────────────────────────

def send_to_slack(text: str, channel: str = SLACK_USER_ID):
    try:
        slack_client.chat_postMessage(channel=channel, text=text, mrkdwn=True)
        print(f"Summary sent to Slack channel/user: {channel}")
    except SlackApiError as e:
        print(f"Failed to send Slack message: {e}")
        raise


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"Generating daily executive summary for {TODAY}...")
    summary = generate_summary(TODAY)
    send_to_slack(summary)
    print("Done.")


if __name__ == "__main__":
    main()
