#!/usr/bin/env python3
"""
One-time Gmail OAuth2 setup — run this locally to generate the credentials
JSON needed for the GMAIL_CREDENTIALS GitHub secret.

Prerequisites:
  1. Go to console.cloud.google.com
  2. Create a project → enable Gmail API
  3. Create OAuth 2.0 credentials (Desktop app) → download client_secret.json
  4. Place client_secret.json in this directory

Run:
  pip install google-auth-oauthlib google-api-python-client
  python setup_gmail_credentials.py
"""

import json
import os

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CLIENT_SECRETS = "client_secret.json"
OUTPUT = "gmail_credentials.json"


def main():
    if not os.path.exists(CLIENT_SECRETS):
        print(f"Error: {CLIENT_SECRETS} not found.")
        print("Download it from Google Cloud Console → APIs & Services → Credentials")
        return

    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
    creds = flow.run_local_server(port=0)

    payload = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
    }

    with open(OUTPUT, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\n✅ Credentials saved to {OUTPUT}")
    print("Copy the content below as the GMAIL_CREDENTIALS GitHub secret:\n")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
