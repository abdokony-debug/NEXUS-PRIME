import os
import json
from groq import Groq
from loguru import logger

class NeuralEngine:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def analyze(self, content: str, usp: str, product_link: str):
        prompt = f"""
        Analyze content for high buying intent (>97%).
        Product USP: {usp}
        Link: {product_link}
        
        If intent is found, return JSON:
        {{
            "is_confirmed": true,
            "score": 98,
            "analysis": "reason",
            "message": "personalized message with link"
        }}
        Else return {{ "is_confirmed": false }}
        """
        
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": f"{prompt}\n\nContent: {content}"}],
                model="llama3-70b-8192",
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Neural Error: {e}")
            return {"is_confirmed": False}
