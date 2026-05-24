#!/usr/bin/env python3
"""
Helper to generate Gmail OAuth2 token for use as GMAIL_TOKEN_JSON secret.
Run once locally, then store the output as a GitHub Actions secret.

Usage:
  1. Download OAuth2 credentials JSON from Google Cloud Console
     (APIs & Services → Credentials → OAuth 2.0 Client ID → Desktop App)
  2. Run: python scripts/generate_gmail_token.py --credentials path/to/credentials.json
  3. Authenticate in browser when prompted
  4. Copy the printed base64 value and add it as GMAIL_TOKEN_JSON in GitHub Secrets
"""

import argparse
import base64
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def main():
    parser = argparse.ArgumentParser(description="Generate Gmail OAuth2 token")
    parser.add_argument("--credentials", required=True, help="Path to credentials.json")
    args = parser.parse_args()

    flow = InstalledAppFlow.from_client_secrets_file(args.credentials, SCOPES)
    creds = flow.run_local_server(port=0)

    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "token_uri": creds.token_uri,
    }

    encoded = base64.b64encode(json.dumps(token_data).encode()).decode()
    print("\n✅ Add this as GMAIL_TOKEN_JSON in GitHub Secrets:\n")
    print(encoded)


if __name__ == "__main__":
    main()
