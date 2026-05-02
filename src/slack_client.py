"""Slack client: lee mensajes del día y envía el resumen ejecutivo."""
import os
from datetime import datetime, timezone
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


class SlackClient:
    def __init__(self):
        token = os.environ.get("SLACK_USER_TOKEN") or os.environ.get("SLACK_BOT_TOKEN")
        if not token:
            raise ValueError("Falta SLACK_USER_TOKEN o SLACK_BOT_TOKEN en .env")
        self.client = WebClient(token=token)
        self._channel_filter = [
            c.strip()
            for c in os.environ.get("SLACK_CHANNELS", "").split(",")
            if c.strip()
        ]

    def get_today_messages(self, date_str: str) -> dict:
        """Devuelve {channel_name: [messages]} de hoy."""
        date = datetime.fromisoformat(date_str)
        start_ts = date.replace(tzinfo=timezone.utc).timestamp()
        end_ts = start_ts + 86400

        messages_by_channel = {}
        channels = self._list_channels()

        for ch in channels:
            name = ch.get("name") or ch["id"]
            if self._channel_filter and name not in self._channel_filter:
                continue
            msgs = self._fetch_channel_messages(ch["id"], start_ts, end_ts)
            if msgs:
                messages_by_channel[name] = msgs

        return messages_by_channel

    def send_message(self, channel_id: str, text: str) -> str:
        resp = self.client.chat_postMessage(channel=channel_id, text=text)
        return resp["ts"]

    # ── private ──────────────────────────────────────────────────────────────

    def _list_channels(self) -> list:
        channels = []
        cursor = None
        while True:
            result = self.client.conversations_list(
                types="public_channel,private_channel,im,mpim",
                exclude_archived=True,
                cursor=cursor,
                limit=200,
            )
            channels.extend(result["channels"])
            cursor = result["response_metadata"].get("next_cursor")
            if not cursor:
                break
        return channels

    def _fetch_channel_messages(
        self, channel_id: str, oldest: float, latest: float
    ) -> list:
        try:
            result = self.client.conversations_history(
                channel=channel_id,
                oldest=str(oldest),
                latest=str(latest),
                limit=100,
            )
            return [
                m
                for m in result.get("messages", [])
                if m.get("type") == "message" and not m.get("bot_id")
            ]
        except SlackApiError as e:
            if e.response["error"] in ("not_in_channel", "channel_not_found"):
                return []
            raise
