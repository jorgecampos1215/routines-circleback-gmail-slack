# Daily Executive Summary

## Purpose
Generate and send a daily executive summary via Slack DM to jorge.campos@dacodes.com (Slack: `U02G57N1UDP`).

## Data sources
| Source | What to collect |
|--------|----------------|
| **Slack** | Conversations importantes del día |
| **Circleback** | Llamadas del día: participantes, temas clave, acuerdos, próximos pasos |
| **Gmail** | Correos que involucren gente de DaCodes o clientes — **ignorar** newsletters, emails de vendors intentando vender, y emails de outreach que nosotros enviamos en secuencias |

## Running manually (Claude Code with MCP)
Use these MCP tools:
1. `mcp__Slack__slack_search_public_and_private` — query `"on:YYYY-MM-DD"`, sort by timestamp desc
2. `mcp__Circleback__SearchMeetings` — startDate/endDate = today
3. `mcp__Gmail__search_threads` — query: `"newer_than:1d (from:dacodes.com OR to:dacodes.com) -category:promotions"`
4. `mcp__Gmail__get_thread` — for threads needing more detail
5. `mcp__Slack__slack_send_message` — send DM to `U02G57N1UDP`

## Automated delivery (GitHub Actions)
The workflow `.github/workflows/daily_summary.yml` runs `generate_summary.py` every weekday at **23:00 UTC (6:00 PM Mexico City CDT)**.

### GitHub Secrets required
| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SLACK_BOT_TOKEN` | Slack Bot OAuth token (`search:read`, `chat:write` scopes) |
| `GMAIL_TOKEN_JSON` | Gmail OAuth2 token JSON (run `python setup_gmail_token.py` once locally) |
| `CIRCLEBACK_API_TOKEN` | Circleback API bearer token |
| `CIRCLEBACK_BASE_URL` | Circleback API base URL (e.g. `https://api.circleback.ai`) |

### First-time Gmail setup
1. Create OAuth Desktop app credentials in Google Cloud Console
2. Save as `gmail_credentials.json` in repo root
3. Run `python setup_gmail_token.py` locally and complete browser auth
4. Copy the printed JSON into the `GMAIL_TOKEN_JSON` GitHub Secret
5. **Delete** `gmail_credentials.json` — do not commit it

## Summary format
- Language: Spanish
- Start with: `📊 *RESUMEN EJECUTIVO DIARIO — <day>*`
- Sections: SLACK / CIRCLEBACK / GMAIL
- Bullet points, concise
- 🔴 urgent · 🟡 important · 🟢 positive
- Max ~4000 chars (Slack limit)
