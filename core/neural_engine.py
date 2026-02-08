import os
from groq import Groq
from loguru import logger
import json

class NeuralEngine:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("CRITICAL: GROQ_API_KEY missing.")
        self.client = Groq(api_key=self.api_key)

    def cognitive_process(self, context_data: dict, task_type: str = "intent_analysis"):
        """
        Uses Llama 3 (via Groq) to analyze leads with near-human precision.
        """
        system_prompts = {
            "intent_analysis": """
                You are NEXUS-PRIME, an autonomous acquisition agent.
                Analyze the provided web content. 
                Determine 'Buying Intent Score' (0-100).
                Logic: High score ONLY if user specifically asks for a recommendation or solution.
                Output JSON: {"score": int, "reason": str, "suggested_hook": str}
            """,
            "draft_msg": """
                You are a master copywriter. Write a hyper-personalized message based on the user's pain points.
                Tone: Helpful, non-intrusive, peer-to-peer.
                No fluff. Direct value proposition.
            """
        }

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompts.get(task_type, "")},
                    {"role": "user", "content": json.dumps(context_data)}
                ],
                model="llama3-70b-8192", # The Beast Model
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return json.loads(chat_completion.choices[0].message.content)
        except Exception as e:
            logger.error(f"Neural Misfire: {e}")
            return None
