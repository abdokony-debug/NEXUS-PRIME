import subprocess
import time

while True:
    try:
        print("🔥 NEXUS WATCHDOG ACTIVE")
        subprocess.run(["python", "orchestrator.py"])
    except Exception as e:
        print("CRASH DETECTED, RESTARTING:", e)
        time.sleep(5)
