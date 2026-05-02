#!/usr/bin/env python3
"""
Resumen Ejecutivo Diario — DaCodes
Fetches Slack, Circleback, Gmail → genera resumen con Claude → envía a Slack.

Uso:
  python daily_summary.py          # ejecuta ahora
  python daily_summary.py --date 2026-05-02   # fecha específica
"""
import os
import sys
import argparse
from datetime import datetime
import pytz
from dotenv import load_dotenv

load_dotenv()

from src.slack_client import SlackClient
from src.circleback_client import CirclebackClient
from src.gmail_client import GmailClient
from src.summarizer import generate_summary
from src.formatters import format_slack_messages, format_meetings, format_emails


def run(date_str: str | None = None):
    tz = pytz.timezone(os.getenv("TIMEZONE", "America/Mexico_City"))
    now = datetime.now(tz)
    date_str = date_str or now.strftime("%Y-%m-%d")
    date_label = datetime.fromisoformat(date_str).strftime("%-d de %B de %Y")

    print(f"[{now.strftime('%H:%M')}] Generando resumen para {date_str}…")

    slack_text = _fetch("Slack", _get_slack_data, date_str)
    circleback_text = _fetch("Circleback", _get_circleback_data, date_str)
    gmail_text = _fetch("Gmail", _get_gmail_data, date_str)

    print("Generando resumen con Claude…")
    summary = generate_summary(
        date_str=date_label,
        slack_data=slack_text,
        circleback_data=circleback_text,
        gmail_data=gmail_text,
    )

    recipient = os.getenv("SLACK_SUMMARY_RECIPIENT")
    if not recipient:
        print("SLACK_SUMMARY_RECIPIENT no configurado. Imprimiendo resumen:\n")
        print(summary)
        return summary

    print(f"Enviando a Slack ({recipient})…")
    slack = SlackClient()
    slack.send_message(recipient, summary)
    print("Resumen enviado.")
    return summary


# ── data fetchers ─────────────────────────────────────────────────────────────

def _get_slack_data(date_str: str) -> str:
    slack = SlackClient()
    msgs = slack.get_today_messages(date_str)
    return format_slack_messages(msgs)


def _get_circleback_data(date_str: str) -> str:
    cb = CirclebackClient()
    meetings = cb.get_meetings_for_date(date_str)
    return format_meetings(meetings)


def _get_gmail_data(date_str: str) -> str:
    gmail = GmailClient()
    threads = gmail.get_today_emails(date_str)
    return format_emails(threads)


def _fetch(name: str, fn, *args) -> str:
    try:
        result = fn(*args)
        status = f"✓ ({len(result.splitlines())} líneas)" if result else "✓ (sin datos)"
        print(f"  {name}: {status}")
        return result
    except Exception as e:
        print(f"  {name}: ✗ {e}")
        return f"Error al obtener datos de {name}: {e}"


# ── scheduler (APScheduler) ───────────────────────────────────────────────────

def start_scheduler():
    from apscheduler.schedulers.blocking import BlockingScheduler

    tz = pytz.timezone(os.getenv("TIMEZONE", "America/Mexico_City"))
    scheduler = BlockingScheduler(timezone=tz)
    scheduler.add_job(run, "cron", hour=18, minute=0, day_of_week="mon-fri")
    print(f"Scheduler iniciado — resumen a las 6pm ({tz}) de lunes a viernes.")
    print("Ctrl+C para detener.")
    try:
        scheduler.start()
    except KeyboardInterrupt:
        print("\nScheduler detenido.")


# ── entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Resumen Ejecutivo Diario DaCodes")
    parser.add_argument("--date", help="Fecha YYYY-MM-DD (default: hoy)")
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="Inicia el scheduler (corre el resumen a las 6pm diario)",
    )
    args = parser.parse_args()

    if args.schedule:
        start_scheduler()
    else:
        run(args.date)
