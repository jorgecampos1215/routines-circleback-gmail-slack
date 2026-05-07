#!/bin/bash
# Daily Executive Summary Script
# Runs at 6pm every day via cron

set -euo pipefail

LOG_FILE="/var/log/daily_summary.log"
PROMPT_FILE="/home/user/routines-circleback-gmail-slack/daily_summary_prompt.txt"
CLAUDE_BIN="/opt/node22/bin/claude"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Starting daily summary ==="

# Find the most recent active MCP config in /tmp/
MCP_CONFIG=$(ls -t /tmp/mcp-config-cse_*.json 2>/dev/null | head -1)

if [ -z "$MCP_CONFIG" ]; then
    log "ERROR: No active MCP config found in /tmp/. Ensure a Claude Code web session is active."
    exit 1
fi

log "Using MCP config: $MCP_CONFIG"

# Read the prompt
if [ ! -f "$PROMPT_FILE" ]; then
    log "ERROR: Prompt file not found at $PROMPT_FILE"
    exit 1
fi

PROMPT=$(cat "$PROMPT_FILE")

# Run Claude non-interactively with the MCP config
log "Running Claude with daily summary prompt..."

"$CLAUDE_BIN" \
    --print \
    --mcp-config "$MCP_CONFIG" \
    --dangerously-skip-permissions \
    --no-verbose \
    "$PROMPT" >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log "Daily summary completed successfully."
else
    log "ERROR: Claude exited with code $EXIT_CODE"
fi

exit $EXIT_CODE
