# DaCodes Daily Briefing

Este repositorio ejecuta un resumen ejecutivo diario enviado por Slack a Jorge Campos.

## Qué hace

Cada día entre semana a las 6pm CST, un workflow de GitHub Actions dispara una sesión de Claude Code que:
1. Lee conversaciones relevantes de Slack del día
2. Extrae notas de reuniones de Circleback (vía Gmail)
3. Resume correos importantes de DaCodes y clientes en Gmail
4. Envía todo como un DM de Slack al usuario

## MCP Servers requeridos

Los siguientes MCP servers deben estar autenticados en el proyecto de Claude Code on the web:
- **Slack** — para leer conversaciones y enviar el resumen
- **Gmail** — para leer correos y notas de Circleback
- **Circleback** — para acceso directo a notas de llamadas (opcional si Gmail ya tiene las notificaciones)

## Setup para GitHub Actions

1. Agrega `ANTHROPIC_API_KEY` como secret en el repositorio (Settings → Secrets → Actions)
2. Asegúrate de que el workflow `.github/workflows/daily-summary.yml` esté activo
3. Verifica que los MCP servers estén conectados en code.claude.com para este proyecto

## Prompt

El prompt para el resumen diario está en `prompts/daily-summary.md`.
