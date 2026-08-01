import math
from app.config import settings

def generate_embedding(text: str) -> list[float]:
    """
    Generates a 1536-dimensional embedding vector.
    Supports live OpenAI embedding API call or fallback pseudo-random deterministic vector.
    """
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "mock_key":
        try:
            import requests
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"}
            payload = {"input": text, "model": "text-embedding-3-small"}
            r = requests.post("https://api.openai.com/v1/embeddings", json=payload, headers=headers, timeout=5)
            if r.status_code == 200:
                return r.json()["data"][0]["embedding"]
        except Exception:
            pass
            
    # Deterministic fallback vector based on text hash
    h = hash(text)
    vector = [(math.sin(h + i) + 1) / 2 for i in range(1536)]
    return vector
