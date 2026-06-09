#!/usr/bin/env python3
"""
Ejecuta este script UNA VEZ en tu máquina local para generar el token de Gmail.
Luego copia las variables de entorno resultantes como GitHub Secrets.

Prerequisito: descarga credentials.json desde Google Cloud Console
(APIs & Services → Credentials → OAuth 2.0 Client IDs → Download JSON)

Uso:
  pip install google-auth-oauthlib google-api-python-client
  python scripts/setup_gmail_token.py --credentials credentials.json
"""

import argparse
import base64
import json

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--credentials", required=True, help="Ruta a credentials.json de Google Cloud")
    args = parser.parse_args()

    flow = InstalledAppFlow.from_client_secrets_file(args.credentials, SCOPES)
    creds = flow.run_local_server(port=0)

    token_data = {
        "token":         creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri":     creds.token_uri,
        "client_id":     creds.client_id,
        "client_secret": creds.client_secret,
        "scopes":        list(creds.scopes),
    }

    with open(args.credentials) as f:
        creds_data = json.load(f)

    token_b64 = base64.b64encode(json.dumps(token_data).encode()).decode()
    creds_b64 = base64.b64encode(json.dumps(creds_data).encode()).decode()

    print("\n=== GitHub Secrets a configurar ===\n")
    print(f"GMAIL_TOKEN_B64:\n{token_b64}\n")
    print(f"GMAIL_CREDENTIALS_B64:\n{creds_b64}\n")
    print("Copia estos valores en: GitHub repo → Settings → Secrets and variables → Actions")


if __name__ == "__main__":
    main()
