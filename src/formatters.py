"""Convierte datos crudos de cada fuente a texto legible para Claude."""
from datetime import datetime


def format_slack_messages(messages_by_channel: dict) -> str:
    if not messages_by_channel:
        return ""
    lines = []
    for channel, msgs in messages_by_channel.items():
        lines.append(f"### #{channel} ({len(msgs)} mensajes)")
        for m in msgs[:30]:  # máximo 30 por canal
            ts = datetime.fromtimestamp(float(m.get("ts", 0))).strftime("%H:%M")
            user = m.get("user", "?")
            text = (m.get("text") or "")[:300].replace("\n", " ")
            lines.append(f"  [{ts}] {user}: {text}")
    return "\n".join(lines)


def format_meetings(meetings: list) -> str:
    if not meetings:
        return ""
    lines = []
    for m in meetings:
        name = m.get("name", "Sin título")
        created = m.get("createdAt", "")[:10]
        attendees = ", ".join(
            a.get("name") or a.get("email", "?")
            for a in m.get("attendees", [])
            if a.get("name") or a.get("email")
        )
        notes = (m.get("notes") or "").strip()
        lines.append(f"### {name} ({created})")
        if attendees:
            lines.append(f"Participantes: {attendees}")
        if notes:
            lines.append(f"Notas:\n{notes[:1500]}")
        lines.append("")
    return "\n".join(lines)


def format_emails(threads: list) -> str:
    if not threads:
        return ""
    lines = []
    for t in threads:
        subject = t.get("subject", "(sin asunto)")
        sender = t.get("from", "?")
        date = t.get("date", "")[:16]
        snippet = (t.get("snippet") or "")[:200]
        lines.append(f"- [{date}] De: {sender} | Asunto: {subject}")
        if snippet:
            lines.append(f"  {snippet}")
    return "\n".join(lines)
