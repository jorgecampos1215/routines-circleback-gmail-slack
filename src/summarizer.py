"""Genera el resumen ejecutivo diario usando Claude con prompt caching."""
import anthropic

_SYSTEM_PROMPT = """\
Eres un asistente ejecutivo de DaCodes. Tu trabajo es generar un resumen ejecutivo diario \
conciso y accionable en español, basado en datos reales de Slack, Circleback y Gmail.

REGLAS:
- Usa formato Markdown compatible con Slack (*negrita*, bullet points, >blockquotes).
- Sé directo. Omite detalles triviales. Prioriza lo que requiere acción.
- Para Slack: sintetiza conversaciones importantes; ignora mensajes de bot y ruido.
- Para Circleback: incluye participantes clave, temas, acuerdos y próximos pasos con fecha.
- Para Gmail: solo correos de personas de DaCodes y clientes activos. \
  Ignora secuencias de ventas automatizadas, newsletters, notificaciones de plataformas, \
  correos de marketing y cualquier cosa que no sea comunicación humana relevante.
- Si una sección no tiene datos, escribe "> Sin actividad registrada." y sigue.
- Termina con una sección *Acciones Pendientes* con bullets de los items más urgentes del día.
"""


def generate_summary(
    date_str: str,
    slack_data: str,
    circleback_data: str,
    gmail_data: str,
) -> str:
    client = anthropic.Anthropic()

    user_content = f"""Genera el resumen ejecutivo para *{date_str}*.

---
## SLACK — Conversaciones del día
{slack_data or "> Sin actividad registrada."}

---
## CIRCLEBACK — Reuniones del día
{circleback_data or "> Sin reuniones registradas."}

---
## GMAIL — Correos relevantes
{gmail_data or "> Sin correos relevantes."}
---

Genera el resumen ejecutivo completo siguiendo las reglas del sistema."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_content}],
    )
    return response.content[0].text
