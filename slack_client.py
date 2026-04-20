import os
import requests

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
SLACK_MAX_BODY_CHARS = 2900  # Slack block text limit is 3000


def post_meeting_notes(email: dict) -> bool:
    """Post a Circleback meeting summary to Slack. Returns True on success."""
    if not SLACK_WEBHOOK_URL:
        raise ValueError("SLACK_WEBHOOK_URL environment variable is not set")

    payload = _build_payload(email)
    response = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
    response.raise_for_status()
    return True


def _build_payload(email: dict) -> dict:
    subject = email.get("subject", "Meeting Notes")
    date = email.get("date", "")
    body = email.get("body", "").strip()

    if len(body) > SLACK_MAX_BODY_CHARS:
        body = body[:SLACK_MAX_BODY_CHARS] + "…"

    header = f"*{subject}*"
    if date:
        header += f"  |  {date}"

    return {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "Circleback Meeting Notes", "emoji": False},
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": header},
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": body or "_No content found._"},
            },
        ]
    }
