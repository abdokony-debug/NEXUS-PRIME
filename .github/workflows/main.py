from orchestrator import NexusOrchestrator
from loguru import logger

if __name__ == "__main__":
    try:
        engine = NexusOrchestrator()
        engine.run()
    except Exception as e:
        logger.critical(f"System Crash: {e}")
