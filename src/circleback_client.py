"""Circleback client: obtiene reuniones del día vía REST API."""
import os
import requests


CIRCLEBACK_BASE_URL = "https://api.circleback.ai/v1"


class CirclebackClient:
    def __init__(self):
        self.api_key = os.environ.get("CIRCLEBACK_API_KEY")
        if not self.api_key:
            raise ValueError("Falta CIRCLEBACK_API_KEY en .env")
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        )

    def get_meetings_for_date(self, date_str: str) -> list:
        """Devuelve lista de reuniones para la fecha dada (YYYY-MM-DD)."""
        meetings = []
        page = 0

        while True:
            resp = self.session.get(
                f"{CIRCLEBACK_BASE_URL}/meetings",
                params={
                    "startDate": date_str,
                    "endDate": date_str,
                    "pageIndex": page,
                    "pageSize": 20,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            # Normaliza respuesta: puede ser lista o {"meetings": [...]}
            if isinstance(data, list):
                batch = data
            else:
                batch = data.get("meetings") or data.get("data") or []

            meetings.extend(batch)

            if len(batch) < 20:
                break
            page += 1

        return meetings

    def get_meeting_detail(self, meeting_id) -> dict:
        resp = self.session.get(
            f"{CIRCLEBACK_BASE_URL}/meetings/{meeting_id}", timeout=15
        )
        resp.raise_for_status()
        return resp.json()
