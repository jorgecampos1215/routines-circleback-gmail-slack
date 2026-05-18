"""
Daily executive summary: Slack + Circleback + Gmail → Slack DM at 6pm CST.
Requires env vars: SLACK_BOT_TOKEN, GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID,
GMAIL_CLIENT_SECRET, CIRCLEBACK_API_KEY, ANTHROPIC_API_KEY, SLACK_DM_CHANNEL_ID
"""

import os
import json
import datetime
import requests
import anthropic
from zoneinfo import ZoneInfo

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SLACK_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_DM_CHANNEL = os.environ.get("SLACK_DM_CHANNEL_ID", "D02FSJQ1R7U")
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CIRCLEBACK_API_KEY = os.environ.get("CIRCLEBACK_API_KEY", "")
GMAIL_REFRESH_TOKEN = os.environ.get("GMAIL_REFRESH_TOKEN", "")
GMAIL_CLIENT_ID = os.environ.get("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET", "")

CST = ZoneInfo("America/Mexico_City")
today = datetime.datetime.now(CST).date()
today_str = today.strftime("%Y-%m-%d")
today_display = today.strftime("%A, %d de %B %Y")


# ---------------------------------------------------------------------------
# Gmail helpers
# ---------------------------------------------------------------------------
def get_gmail_access_token() -> str:
    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": GMAIL_CLIENT_ID,
            "client_secret": GMAIL_CLIENT_SECRET,
            "refresh_token": GMAIL_REFRESH_TOKEN,
            "grant_type": "refresh_token",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def fetch_gmail_threads(access_token: str) -> list[dict]:
    """Fetch today's threads involving dacodes people or clients."""
    query = (
        f"newer_than:1d "
        f"(from:dacodes OR to:dacodes OR @dacodes.com OR @dacodes.ai) "
        f"-category:promotions -from:noreply -from:no-reply -from:automated@"
    )
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(
        "https://gmail.googleapis.com/gmail/v1/users/me/threads",
        headers=headers,
        params={"q": query, "maxResults": 20},
    )
    resp.raise_for_status()
    threads_raw = resp.json().get("threads", [])

    threads = []
    for t in threads_raw:
        detail = requests.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/threads/{t['id']}",
            headers=headers,
            params={"format": "metadata", "metadataHeaders": ["From", "To", "Subject", "Date"]},
        )
        if detail.ok:
            threads.append(detail.json())
    return threads


# ---------------------------------------------------------------------------
# Slack helpers
# ---------------------------------------------------------------------------
def fetch_slack_messages() -> list[dict]:
    """Search all Slack channels for today's messages."""
    resp = requests.get(
        "https://slack.com/api/search.messages",
        headers={"Authorization": f"Bearer {SLACK_TOKEN}"},
        params={
            "query": f"after:{today_str}",
            "sort": "timestamp",
            "sort_dir": "desc",
            "count": 30,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        return []
    return data.get("messages", {}).get("matches", [])


# ---------------------------------------------------------------------------
# Circleback helpers
# ---------------------------------------------------------------------------
def fetch_circleback_meetings() -> list[dict]:
    """Fetch today's meetings from Circleback."""
    if not CIRCLEBACK_API_KEY:
        return []
    resp = requests.get(
        "https://api.circleback.ai/v1/meetings",
        headers={"Authorization": f"Bearer {CIRCLEBACK_API_KEY}"},
        params={"start_date": today_str, "end_date": today_str},
    )
    if not resp.ok:
        return []
    return resp.json().get("meetings", [])


# ---------------------------------------------------------------------------
# Claude summary generation
# ---------------------------------------------------------------------------
def generate_summary(slack_msgs: list, meetings: list, gmail_threads: list) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    data_payload = json.dumps(
        {
            "date": today_display,
            "slack_messages": slack_msgs[:20],
            "circleback_meetings": meetings,
            "gmail_threads": gmail_threads,
        },
        ensure_ascii=False,
        indent=2,
    )

    prompt = f"""Eres un asistente ejecutivo. Con los datos del día, genera un resumen ejecutivo en español
para Jorge Campos (DaCodes). Usa el formato Slack markdown (**bold**, _italic_, bullet points).

Reglas:
- Slack: resume las conversaciones más importantes; si no hay, indícalo brevemente.
- Circleback: para cada llamada incluye participantes, temas clave, acuerdos y próximos pasos; si no hay, indícalo.
- Gmail: solo correos que involucren gente de DaCodes o clientes reales. Ignora newsletters,
  secuencias de ventas salientes y correos automatizados. Para cada correo relevante: remitente,
  asunto, resumen en 1-2 líneas y si requiere acción.
- Sé conciso. No incluyas secciones vacías con texto largo, solo "Sin actividad registrada."

Datos del día:
{data_payload}

Devuelve SOLO el mensaje de Slack con este encabezado exacto:
🗓 *Resumen Ejecutivo Diario — {today_display}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(luego las tres secciones con sus emojis)
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Generado automáticamente por Claude Code · DaCodes_"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ---------------------------------------------------------------------------
# Post to Slack
# ---------------------------------------------------------------------------
def post_to_slack(text: str) -> None:
    resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={
            "Authorization": f"Bearer {SLACK_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"channel": SLACK_DM_CHANNEL, "text": text, "mrkdwn": True},
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack error: {data.get('error')}")
    print(f"Sent to Slack: {data['ts']}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"Generating daily summary for {today_str}...")

    slack_msgs = fetch_slack_messages()
    print(f"  Slack messages: {len(slack_msgs)}")

    meetings = fetch_circleback_meetings()
    print(f"  Circleback meetings: {len(meetings)}")

    gmail_threads: list[dict] = []
    if GMAIL_REFRESH_TOKEN:
        access_token = get_gmail_access_token()
        gmail_threads = fetch_gmail_threads(access_token)
    print(f"  Gmail threads: {len(gmail_threads)}")

    summary = generate_summary(slack_msgs, meetings, gmail_threads)
    post_to_slack(summary)
    print("Done.")


if __name__ == "__main__":
    main()
