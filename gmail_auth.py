"""
One-time Gmail OAuth setup — run locally to generate GMAIL_TOKEN_JSON for GitHub Secrets.
Usage: python gmail_auth.py
"""

import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CREDS_FILE = "credentials.json"  # download from Google Cloud Console


def main():
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    token_data = {
        "token":         creds.token,
        "refresh_token": creds.refresh_token,
        "client_id":     creds.client_id,
        "client_secret": creds.client_secret,
        "token_uri":     creds.token_uri,
    }
    print("\nCopia este JSON como GMAIL_TOKEN_JSON en GitHub Secrets:\n")
    print(json.dumps(token_data))


if __name__ == "__main__":
    main()
