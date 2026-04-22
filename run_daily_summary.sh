#!/bin/bash
# Daily Executive Summary - Runs at 6pm Mexico City time (23:00 UTC)
# Requires Claude CLI with MCP servers configured (Slack, Gmail, Circleback)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/daily_summary_prompt.txt"
LOG_FILE="$SCRIPT_DIR/logs/daily_summary_$(date +%Y-%m-%d).log"

mkdir -p "$SCRIPT_DIR/logs"

echo "[$(date)] Starting daily summary generation..." >> "$LOG_FILE"

claude -p \
  --model claude-sonnet-4-6 \
  --allowedTools "mcp__Slack__slack_search_public_and_private,mcp__Slack__slack_send_message,mcp__Circleback__SearchMeetings,mcp__Circleback__ReadMeetings,mcp__Gmail__search_threads,mcp__Gmail__get_thread" \
  "$(cat "$PROMPT_FILE")" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "[$(date)] Summary generation finished with exit code: $EXIT_CODE" >> "$LOG_FILE"
