#!/usr/bin/env python3
"""
Polls Gmail for Circleback meeting notes and forwards them to Slack.

Usage:
    python main.py [--after YYYY/MM/DD] [--max N] [--dry-run]
"""
import argparse
import sys

from gmail_client import fetch_circleback_emails, get_gmail_service
from slack_client import post_meeting_notes


def parse_args():
    parser = argparse.ArgumentParser(description="Send Circleback notes from Gmail to Slack")
    parser.add_argument("--after", help="Only fetch emails after this date (YYYY/MM/DD)")
    parser.add_argument("--max", type=int, default=10, dest="max_results",
                        help="Maximum number of emails to process (default: 10)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch and print emails without posting to Slack")
    return parser.parse_args()


def main():
    args = parse_args()

    print("Connecting to Gmail…")
    service = get_gmail_service()

    print(f"Fetching up to {args.max_results} Circleback email(s)…")
    emails = fetch_circleback_emails(service, max_results=args.max_results, after_date=args.after)

    if not emails:
        print("No Circleback emails found.")
        return

    print(f"Found {len(emails)} email(s).")

    success_count = 0
    for email in emails:
        subject = email.get("subject", "(no subject)")
        if args.dry_run:
            print(f"\n[DRY RUN] Would post: {subject}")
            print("-" * 60)
            print(email.get("body", "")[:500])
        else:
            try:
                post_meeting_notes(email)
                print(f"  Posted: {subject}")
                success_count += 1
            except Exception as exc:
                print(f"  ERROR posting '{subject}': {exc}", file=sys.stderr)

    if not args.dry_run:
        print(f"\nDone. {success_count}/{len(emails)} message(s) posted to Slack.")


if __name__ == "__main__":
    main()
