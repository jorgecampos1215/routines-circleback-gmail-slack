#!/usr/bin/env python3
"""
Configura la autenticación OAuth2 de Gmail (solo necesitas ejecutar esto UNA vez).

Pasos previos:
  1. Ve a https://console.cloud.google.com
  2. Crea un proyecto → habilita Gmail API
  3. Credenciales → OAuth 2.0 Client ID → Desktop App
  4. Descarga el JSON y guárdalo como credentials/gmail_credentials.json
  5. Ejecuta: python setup_gmail_auth.py
"""
import os
from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CREDS_PATH = os.getenv("GMAIL_CREDENTIALS_PATH", "credentials/gmail_credentials.json")
TOKEN_PATH = os.getenv("GMAIL_TOKEN_PATH", "credentials/gmail_token.json")


def main():
    if not os.path.exists(CREDS_PATH):
        print(f"Error: No encontré {CREDS_PATH}")
        print("Descarga el archivo desde Google Cloud Console y colócalo ahí.")
        return

    flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
    creds = flow.run_local_server(port=0)

    os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())

    print(f"Token guardado en {TOKEN_PATH}")
    print("Listo. Ahora puedes correr daily_summary.py")


if __name__ == "__main__":
    main()
