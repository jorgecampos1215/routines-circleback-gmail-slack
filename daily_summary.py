"""
Daily Executive Summary — DaCodes
Runs at 6pm daily. Pulls Slack, Circleback (via Gmail), and Gmail threads,
then sends a formatted summary to the configured Slack user DM.

Usage:
    python daily_summary.py

Schedule (cron example — 6pm CST = midnight UTC):
    0 0 * * * /usr/bin/python3 /path/to/daily_summary.py
"""

import os
import json
import re
from datetime import date, timedelta, datetime
from anthropic import Anthropic

# ── Configuration ─────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
GMAIL_CREDENTIALS_PATH = os.environ.get("GMAIL_CREDENTIALS_PATH", "credentials.json")
GMAIL_TOKEN_PATH = os.environ.get("GMAIL_TOKEN_PATH", "token.json")
SLACK_TARGET_USER_ID = os.environ.get("SLACK_TARGET_USER_ID", "U02G57N1UDP")
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

DACODES_DOMAINS = ["dacodes.com", "dacodes.ai"]
SALES_SEQUENCE_PATTERNS = [
    "unsubscribe", "click here to unsubscribe", "you're receiving this",
    "noreply@notifications", "mailer-daemon", "notifications-noreply",
    "invitations@linkedin", "myvistage@", "membership@", "apollo.io",
    "crunchbase", "beehiiv", "futureaiunfiltered",
]

# ── Slack helpers ──────────────────────────────────────────────────────────────

def slack_search(query: str, oldest_ts: str) -> list[dict]:
    """Return list of messages matching `query` since `oldest_ts`."""
    import urllib.request
    import urllib.parse

    params = urllib.parse.urlencode({
        "query": query,
        "sort": "timestamp",
        "sort_dir": "desc",
        "count": 50,
    })
    req = urllib.request.Request(
        f"https://slack.com/api/search.messages?{params}",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    messages = data.get("messages", {}).get("matches", [])
    return [m for m in messages if float(m.get("ts", 0)) >= float(oldest_ts)]


def slack_post_dm(user_id: str, text: str) -> str:
    """Open a DM and post a message. Returns the message permalink."""
    import urllib.request

    # Open DM channel
    req = urllib.request.Request(
        "https://slack.com/api/conversations.open",
        data=json.dumps({"users": user_id}).encode(),
        headers={
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        channel_id = json.loads(resp.read())["channel"]["id"]

    # Post message
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": channel_id, "text": text, "mrkdwn": True}).encode(),
        headers={
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
    return result.get("message", {}).get("permalink", "")


# ── Gmail helpers ──────────────────────────────────────────────────────────────

def get_gmail_service():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
    creds = None
    if os.path.exists(GMAIL_TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(GMAIL_CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(GMAIL_TOKEN_PATH, "w") as token:
            token.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def fetch_gmail_threads(service, days_back: int = 1) -> list[dict]:
    """Fetch threads from the last `days_back` days, excluding obvious noise."""
    since = (date.today() - timedelta(days=days_back)).strftime("%Y/%m/%d")
    query = f"newer_than:{days_back}d -category:promotions -in:sent"

    results = service.users().threads().list(userId="me", q=query, maxResults=50).execute()
    threads = results.get("threads", [])
    detailed = []
    for t in threads:
        thread_data = service.users().threads().get(userId="me", threadId=t["id"]).execute()
        detailed.append(thread_data)
    return detailed


def is_relevant_email(thread: dict) -> bool:
    """Return True if thread involves DaCodes people or known clients (not sales/sequences)."""
    for msg in thread.get("messages", []):
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        sender = headers.get("from", "").lower()
        subject = headers.get("subject", "").lower()
        snippet = msg.get("snippet", "").lower()

        # Keep Circleback
        if "circleback.ai" in sender:
            return True

        # Keep DaCodes internal / client threads
        for domain in DACODES_DOMAINS:
            if domain in sender:
                return True

        # Drop obvious sales / sequence / automated noise
        for pattern in SALES_SEQUENCE_PATTERNS:
            if pattern in sender or pattern in subject or pattern in snippet:
                return False

        # Keep if a known client domain appears in sender (heuristic: has a dot-com and is not a bot)
        if re.search(r"@[a-z0-9-]+\.[a-z]{2,}$", sender) and "noreply" not in sender:
            return True

    return False


def extract_thread_text(thread: dict) -> str:
    """Return a plain-text representation of the most recent messages in a thread."""
    lines = []
    for msg in thread.get("messages", [])[-3:]:  # last 3 messages
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        snippet = msg.get("snippet", "")
        lines.append(
            f"From: {headers.get('from', '')} | Subject: {headers.get('subject', '')} | {snippet}"
        )
    return "\n".join(lines)


# ── Summarizer (Claude) ────────────────────────────────────────────────────────

def summarize_with_claude(slack_messages: list[str], gmail_threads: list[str]) -> str:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    today = date.today().strftime("%-d de %B %Y")
    slack_block = "\n\n".join(slack_messages) if slack_messages else "Sin actividad registrada."
    gmail_block = "\n\n".join(gmail_threads) if gmail_threads else "Sin correos relevantes."

    prompt = f"""Eres un asistente ejecutivo de DaCodes. Genera un resumen ejecutivo diario en español con la siguiente información del {today}.

DATOS DE SLACK:
{slack_block}

DATOS DE GMAIL (DaCodes + clientes, excluyendo ventas y secuencias):
{gmail_block}

Formato requerido:
1. Encabezado con fecha y emoji :clipboard:
2. Sección SLACK con sub-secciones por tema (reclutamiento, ventas, operaciones, etc.)
3. Sección CIRCLEBACK si hay notas de llamadas en el gmail
4. Sección GMAIL con correos agrupados por categoría
5. Bullet points concisos. Negrita en puntos de acción o urgentes.
6. Pie de página: "Generado automáticamente · DaCodes Executive Summary Bot"

Sé conciso. Omite trivialidades. Destaca próximos pasos y alertas importantes."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    today_str = date.today().strftime("%-d de %B %Y")
    print(f"[{datetime.now().isoformat()}] Generating daily summary for {today_str}...")

    # 1. Fetch Slack messages (last 24h)
    yesterday_ts = str((datetime.utcnow() - timedelta(days=1)).timestamp())
    raw_slack = slack_search("in:general OR in:talentaugmentation OR in:ventas", yesterday_ts)
    slack_texts = [
        f"[{m.get('channel', {}).get('name', 'DM')}] {m.get('username', '')}: {m.get('text', '')}"
        for m in raw_slack
    ]

    # 2. Fetch Gmail threads (last 24h)
    gmail_service = get_gmail_service()
    threads = fetch_gmail_threads(gmail_service, days_back=1)
    relevant_threads = [t for t in threads if is_relevant_email(t)]
    gmail_texts = [extract_thread_text(t) for t in relevant_threads]

    # 3. Summarize with Claude
    summary = summarize_with_claude(slack_texts, gmail_texts)

    # 4. Post to Slack DM
    permalink = slack_post_dm(SLACK_TARGET_USER_ID, summary)
    print(f"[{datetime.now().isoformat()}] Summary posted: {permalink}")


if __name__ == "__main__":
    main()
