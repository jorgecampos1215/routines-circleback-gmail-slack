# Routines: Circleback + Gmail + Slack

Automatización del resumen ejecutivo diario para DaCodes.

## ¿Qué hace?

Cada día a las 6pm (hora México), genera y envía por DM en Slack un resumen ejecutivo con:

1. **Slack** — Conversaciones más importantes del día
2. **Circleback** — Llamadas del día (participantes, temas, acuerdos, próximos pasos)
3. **Gmail** — Correos relevantes de gente de DaCodes y clientes activos (filtra outreach y spam)

## Archivos

| Archivo | Descripción |
|---|---|
| `daily_summary.md` | Prompt con instrucciones para Claude Code |
| `run_daily_summary.sh` | Script bash que ejecuta Claude Code con el prompt |

## Setup del cron job

```bash
# Abrir crontab
crontab -e

# Agregar esta línea (6pm México de lunes a viernes)
TZ=America/Mexico_City
0 18 * * 1-5 /ruta/completa/routines-circleback-gmail-slack/run_daily_summary.sh
```

## Requisitos

- [Claude Code CLI](https://claude.ai/code) instalado y autenticado
- MCP servers configurados: Slack, Gmail, Circleback
- Permisos de Slack: DM a U02G57N1UDP (Jorge Campos)

## Logs

Los logs de cada ejecución se guardan en `logs/summary_YYYYMMDD.log`.
