#!/usr/bin/env python3
"""
Daemon que genera y envía el resumen ejecutivo diario a las 6pm CST (23:00 UTC).
Uso: python3 scheduler.py &
     python3 scheduler.py --run-now   # ejecutar inmediatamente (para pruebas)
"""

import subprocess
import time
import datetime
import sys
import os
import logging

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(SCRIPT_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s UTC | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "scheduler.log")),
        logging.StreamHandler(sys.stdout),
    ],
)

PROMPT = """Genera un resumen diario ejecutivo con la siguiente información:

1. **Slack**: Resume las conversaciones más importantes del día.

2. **Circleback**: Resume las llamadas del día.
   Incluye: participantes, temas clave, acuerdos y próximos pasos.

3. **Gmail**: Revisa correos del dia, mandame resumen de correos de todo lo que involucre gente de dacodes y clientes con los que interactuamos. Ignora gente que nos manda correos para vender o correos que mandamos en secuencias.

Formato: usa encabezados claros, bullet points y sé conciso.

Cuando tengas el resumen listo, envíalo INMEDIATAMENTE como mensaje de Slack DM al usuario U02G57N1UDP usando slack_send_message. No lo programes, envíalo directo."""


def next_run_at() -> datetime.datetime:
    """Retorna el próximo datetime en UTC cuando debe correr (23:00 UTC = 6pm CST/CDT)."""
    now = datetime.datetime.utcnow()
    target = now.replace(hour=23, minute=0, second=0, microsecond=0)
    if now >= target:
        target += datetime.timedelta(days=1)
    return target


def run_summary():
    logging.info("Generando resumen ejecutivo diario...")
    result = subprocess.run(
        ["claude", "--print", PROMPT],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode == 0:
        logging.info("Resumen generado y enviado exitosamente.")
    else:
        logging.error(f"Error al generar resumen (código {result.returncode}):\n{result.stderr}")


def main():
    if "--run-now" in sys.argv:
        run_summary()
        return

    logging.info("Scheduler iniciado. Enviará resumen diario a las 23:00 UTC (6pm CST).")

    while True:
        target = next_run_at()
        wait_secs = (target - datetime.datetime.utcnow()).total_seconds()
        logging.info(f"Próxima ejecución: {target.strftime('%Y-%m-%d %H:%M:%S')} UTC (en {wait_secs/3600:.1f}h)")
        time.sleep(max(wait_secs, 0))
        run_summary()
        time.sleep(60)  # evitar doble ejecución en el mismo minuto


if __name__ == "__main__":
    main()
