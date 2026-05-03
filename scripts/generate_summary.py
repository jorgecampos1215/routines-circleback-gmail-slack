#!/usr/bin/env python3
"""
Daily Executive Summary Generator
Gathers data from Circleback, Gmail, and Slack, then uses Claude to produce
a summary and sends it to the configured Slack user.
"""

import os
import sys
import json
import datetime
import requests

import anthropic

# ── Configuration ────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY   = os.environ["ANTHROPIC_API_KEY"]
SLACK_BOT_TOKEN     = os.environ["SLACK_BOT_TOKEN"]
SLACK_TARGET_USER   = os.environ.get("SLACK_TARGET_USER", "U02G57N1UDP")  # Jorge's user ID
CIRCLEBACK_API_KEY  = os.environ["CIRCLEBACK_API_KEY"]
GMAIL_ACCESS_TOKEN  = os.environ["GMAIL_ACCESS_TOKEN"]   # OAuth access token

TODAY = datetime.date.today().isoformat()          # e.g. "2026-05-03"
TODAY_DISPLAY = datetime.date.today().strftime("%-d de %B %Y")  # "3 de mayo 2026"

DACODES_DOMAINS = ["dacodes.com"]
IGNORE_SENDERS = [
    "noreply", "no-reply", "automated", "notifications", "airbnb",
    "linkedin", "trovit", "dazn", "fubo", "beehiiv", "crunchbase",
    "bamboohr", "investordelivery", "sectionai", "mastermind",
    "formula1", "openai", "workablemail",
]


# ── Circleback ───────────────────────────────────────────────────────────────
def get_circleback_meetings() -> list[dict]:
    """Fetch today's meetings from Circleback REST API."""
    url = "https://app.circleback.ai/api/v1/meetings"
    headers = {"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"}
    params = {"start_date": TODAY, "end_date": TODAY, "page": 0, "per_page": 50}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("meetings", data) if isinstance(data, dict) else data
    except Exception as exc:
        print(f"[WARN] Circleback API error: {exc}", file=sys.stderr)
        return []


# ── Gmail ────────────────────────────────────────────────────────────────────
def _gmail_get(path: str, params: dict | None = None) -> dict:
    base = "https://gmail.googleapis.com/gmail/v1/users/me"
    headers = {"Authorization": f"Bearer {GMAIL_ACCESS_TOKEN}"}
    resp = requests.get(f"{base}{path}", headers=headers, params=params or {}, timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_gmail_threads() -> list[dict]:
    """Return threads from the past day that involve DaCodes people or clients."""
    query = "newer_than:1d -from:noreply -from:no-reply"
    for s in IGNORE_SENDERS:
        query += f" -from:{s}"

    try:
        result = _gmail_get("/threads", {"q": query, "maxResults": 30})
        threads = result.get("threads", [])
        detailed = []
        for t in threads:
            try:
                thread_data = _gmail_get(f"/threads/{t['id']}", {"format": "metadata",
                    "metadataHeaders": ["From", "To", "Cc", "Subject", "Date"]})
                msgs = thread_data.get("messages", [])
                if not msgs:
                    continue

                # Filter: keep only threads involving dacodes.com addresses or
                # where Jorge sent to an external address (client outreach)
                senders = [
                    h["value"] for m in msgs
                    for h in m.get("payload", {}).get("headers", [])
                    if h["name"] == "From"
                ]
                tos = [
                    h["value"] for m in msgs
                    for h in m.get("payload", {}).get("headers", [])
                    if h["name"] in ("To", "Cc")
                ]
                all_addresses = " ".join(senders + tos).lower()

                is_relevant = (
                    "dacodes.com" in all_addresses
                    or any(
                        domain in all_addresses
                        for domain in DACODES_DOMAINS
                    )
                )
                if is_relevant:
                    detailed.append(thread_data)
            except Exception as exc:
                print(f"[WARN] Gmail thread {t['id']} error: {exc}", file=sys.stderr)
        return detailed
    except Exception as exc:
        print(f"[WARN] Gmail API error: {exc}", file=sys.stderr)
        return []


def _extract_thread_summary(thread: dict) -> dict:
    """Pull key fields from a Gmail thread for the prompt."""
    msgs = thread.get("messages", [])
    subjects, senders, snippets = [], [], []
    for m in msgs:
        headers = {h["name"]: h["value"] for h in m.get("payload", {}).get("headers", [])}
        subjects.append(headers.get("Subject", ""))
        senders.append(headers.get("From", ""))
        snippets.append(m.get("snippet", ""))
    return {
        "subject": subjects[0] if subjects else "",
        "participants": list(dict.fromkeys(senders)),
        "messages": len(msgs),
        "snippets": snippets[:3],  # keep first 3 to limit tokens
    }


# ── Slack ────────────────────────────────────────────────────────────────────
def get_slack_messages() -> list[dict]:
    """Fetch today's messages from all accessible Slack channels."""
    headers = {"Authorization": f"Bearer {SLACK_BOT_TOKEN}"}

    # Get list of channels the bot is in
    try:
        resp = requests.get(
            "https://slack.com/api/conversations.list",
            headers=headers,
            params={"types": "public_channel,private_channel", "limit": 100},
            timeout=15,
        )
        resp.raise_for_status()
        channels = [c for c in resp.json().get("channels", []) if c.get("is_member")]
    except Exception as exc:
        print(f"[WARN] Slack channels error: {exc}", file=sys.stderr)
        return []

    # Calculate today's start timestamp (midnight UTC)
    import time
    today_midnight = datetime.datetime.combine(
        datetime.date.today(), datetime.time.min
    ).timestamp()

    messages = []
    for ch in channels:
        try:
            resp = requests.get(
                "https://slack.com/api/conversations.history",
                headers=headers,
                params={
                    "channel": ch["id"],
                    "oldest": str(today_midnight),
                    "limit": 50,
                    "inclusive": True,
                },
                timeout=15,
            )
            data = resp.json()
            for msg in data.get("messages", []):
                if msg.get("subtype") or msg.get("bot_id"):
                    continue
                messages.append({
                    "channel": ch.get("name", ch["id"]),
                    "user": msg.get("user", ""),
                    "text": msg.get("text", "")[:500],
                    "ts": msg.get("ts", ""),
                })
        except Exception as exc:
            print(f"[WARN] Slack channel {ch.get('name')} error: {exc}", file=sys.stderr)

    return messages


# ── Claude summarization ──────────────────────────────────────────────────────
def generate_summary(meetings: list, gmail_threads: list, slack_msgs: list) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    gmail_summaries = [_extract_thread_summary(t) for t in gmail_threads]

    prompt = f"""Genera un resumen ejecutivo diario en español para el {TODAY_DISPLAY}.
Usa encabezados claros, bullet points y sé conciso.

El resumen debe cubrir tres secciones:

1. **Slack** — Resume las conversaciones más importantes del día.
2. **Circleback** — Resume las llamadas del día: participantes, temas clave, acuerdos y próximos pasos.
3. **Gmail** — Solo correos que involucren a gente de DaCodes y clientes. Ignora newsletters, ventas y automatizaciones.

Datos de hoy:

### SLACK MESSAGES ({len(slack_msgs)} mensajes):
{json.dumps(slack_msgs, ensure_ascii=False, indent=2)[:6000]}

### CIRCLEBACK MEETINGS ({len(meetings)} reuniones):
{json.dumps(meetings, ensure_ascii=False, indent=2)[:6000]}

### GMAIL THREADS ({len(gmail_summaries)} hilos relevantes):
{json.dumps(gmail_summaries, ensure_ascii=False, indent=2)[:6000]}

Al final añade: "_Resumen generado automáticamente por Claude · DaCodes_"
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


# ── Slack send ────────────────────────────────────────────────────────────────
def send_to_slack(text: str) -> None:
    headers = {
        "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"channel": SLACK_TARGET_USER, "text": text}
    resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers=headers,
        json=payload,
        timeout=15,
    )
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack send failed: {data.get('error')}")
    print(f"[OK] Summary sent to Slack (channel: {data.get('channel')})")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    print(f"[INFO] Generating daily summary for {TODAY}...")

    meetings      = get_circleback_meetings()
    gmail_threads = get_gmail_threads()
    slack_msgs    = get_slack_messages()

    print(f"[INFO] Circleback: {len(meetings)} meetings | "
          f"Gmail: {len(gmail_threads)} threads | Slack: {len(slack_msgs)} msgs")

    summary = generate_summary(meetings, gmail_threads, slack_msgs)
    print("[INFO] Summary generated. Sending to Slack...")
    send_to_slack(summary)


if __name__ == "__main__":
    main()
