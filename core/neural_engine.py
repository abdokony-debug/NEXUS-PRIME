class NeuralEngine:
    def decide_action(self, lead):
        # استراتيجية عسكرية بسيطة قابلة للتطوير
        if "CEO" in lead.title or "Founder" in lead.title:
            return "ENGAGE"
        return "IGNORE"
