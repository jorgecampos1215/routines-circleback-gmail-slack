"""
One-time setup: obtiene el refresh_token de Gmail para usar en GitHub Secrets.

Pasos:
1. Ve a https://console.cloud.google.com → APIs & Services → Credentials
2. Crea un OAuth 2.0 Client ID (tipo "Desktop app")
3. Descarga el JSON de credenciales
4. Ejecuta: python scripts/setup_gmail_token.py <ruta-al-credentials.json>
5. Copia los valores que imprime como secrets en tu repo de GitHub
"""

import json
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def main():
    if len(sys.argv) < 2:
        print("Uso: python scripts/setup_gmail_token.py <credentials.json>")
        sys.exit(1)

    credentials_file = sys.argv[1]
    flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(credentials_file) as f:
        client_data = json.load(f)

    client_info = client_data.get("installed") or client_data.get("web", {})

    print("\n" + "=" * 60)
    print("Agrega estos valores como GitHub Secrets:")
    print("=" * 60)
    print(f"GMAIL_CLIENT_ID      = {client_info.get('client_id')}")
    print(f"GMAIL_CLIENT_SECRET  = {client_info.get('client_secret')}")
    print(f"GMAIL_REFRESH_TOKEN  = {creds.refresh_token}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
