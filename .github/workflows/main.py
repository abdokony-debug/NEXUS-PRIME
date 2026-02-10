import time
from core.neural_engine import NeuralEngine

def start_nexus():
    print("NEXUS PRIME ACTIVE")

    engine = NeuralEngine()

    while True:
        try:
            engine.run_cycle()
            print("Cycle completed...")
            time.sleep(300)  # كل 5 دقائق
        except Exception as e:
            print("ERROR:", e)
            time.sleep(60)

if __name__ == "__main__":
    start_nexus()
