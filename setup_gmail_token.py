#!/usr/bin/env python3
"""One-time script to generate the Gmail OAuth2 token.

Run this locally once, then copy the printed JSON into the
GMAIL_TOKEN_JSON GitHub Secret.

Usage:
  1. Download OAuth2 Desktop credentials from Google Cloud Console
     (APIs & Services → Credentials → Create Credentials → OAuth client ID → Desktop app)
  2. Save the downloaded file as 'gmail_credentials.json' in this directory
  3. Run:  python setup_gmail_token.py
  4. Complete the browser auth flow
  5. Copy the printed token JSON into the GitHub Secret GMAIL_TOKEN_JSON
"""

import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CREDS_FILE = "gmail_credentials.json"

def main():
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)
    token_dict = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
    }
    print("\n✅ Token generated. Copy the following JSON into the GMAIL_TOKEN_JSON GitHub Secret:\n")
    print(json.dumps(token_dict, indent=2))

if __name__ == "__main__":
    main()
