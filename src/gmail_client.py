"""Gmail client: obtiene correos del día relevantes (DaCodes + clientes)."""
import os
import base64
from datetime import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

EXCLUDE_SENDERS = (
    "noreply@",
    "no-reply@",
    "notifications@",
    "newsletter",
    "substack.com",
    "beehiiv.com",
    "trovit.com",
    "myvistage.com",
    "bamboohr.com",
    "crunchbase.com",
    "linkedin.com",
    "survey.",
    "openai.com",
)

SEQUENCE_SUBJECTS = (
    "Tu equipo ideal en software",
    "DaCodes- \"Talent That Delivers\"",
    "DaCodes: Tu Socio Estratégico",
    "Top Engineers Ready",
    "Talent That Delivers",
)


class GmailClient:
    def __init__(self):
        creds_path = os.environ.get(
            "GMAIL_CREDENTIALS_PATH", "credentials/gmail_credentials.json"
        )
        token_path = os.environ.get(
            "GMAIL_TOKEN_PATH", "credentials/gmail_token.json"
        )
        self.service = self._build_service(creds_path, token_path)
        raw_domains = os.environ.get("DACODES_DOMAINS", "dacodes.com,dacodes.mx,dacodes.ai")
        self.dacodes_domains = [d.strip() for d in raw_domains.split(",") if d.strip()]

    def get_today_emails(self, date_str: str) -> list:
        """Devuelve threads relevantes del día filtrados (DaCodes + clientes)."""
        dt = datetime.fromisoformat(date_str)
        gdate = dt.strftime("%Y/%m/%d")
        next_day = dt.replace(day=dt.day + 1).strftime("%Y/%m/%d")

        query = (
            f"after:{gdate} before:{next_day} "
            "-category:promotions -category:social -is:spam"
        )
        threads = self._list_threads(query, max_results=50)
        return self._filter_relevant(threads)

    # ── private ──────────────────────────────────────────────────────────────

    def _build_service(self, creds_path: str, token_path: str):
        creds = None
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        return build("gmail", "v1", credentials=creds)

    def _list_threads(self, query: str, max_results: int = 50) -> list:
        threads = []
        page_token = None
        while len(threads) < max_results:
            params = {"userId": "me", "q": query, "maxResults": min(50, max_results)}
            if page_token:
                params["pageToken"] = page_token
            result = self.service.users().threads().list(**params).execute()
            batch = result.get("threads", [])
            if not batch:
                break
            for t in batch:
                detail = (
                    self.service.users()
                    .threads()
                    .get(userId="me", id=t["id"], format="metadata",
                         metadataHeaders=["From", "To", "Cc", "Subject", "Date"])
                    .execute()
                )
                threads.append(detail)
            page_token = result.get("nextPageToken")
            if not page_token:
                break
        return threads

    def _filter_relevant(self, threads: list) -> list:
        relevant = []
        for thread in threads:
            messages = thread.get("messages", [])
            if not messages:
                continue
            msg = messages[-1]
            headers = {
                h["name"].lower(): h["value"]
                for h in msg.get("payload", {}).get("headers", [])
            }
            sender = headers.get("from", "").lower()
            subject = headers.get("subject", "")

            if self._is_excluded(sender, subject):
                continue
            if self._is_dacodes_or_client(sender, headers.get("to", "")):
                relevant.append(
                    {
                        "subject": subject,
                        "from": headers.get("from", ""),
                        "to": headers.get("to", ""),
                        "date": headers.get("date", ""),
                        "snippet": messages[-1].get("snippet", ""),
                        "message_count": len(messages),
                    }
                )
        return relevant

    def _is_excluded(self, sender: str, subject: str) -> bool:
        if any(pat in sender for pat in EXCLUDE_SENDERS):
            return True
        if any(seq.lower() in subject.lower() for seq in SEQUENCE_SUBJECTS):
            return True
        return False

    def _is_dacodes_or_client(self, sender: str, recipients: str) -> bool:
        combined = (sender + " " + recipients).lower()
        if any(domain in combined for domain in self.dacodes_domains):
            return True
        # Incluye si hay conversación bidireccional (reply) con externos
        return False
