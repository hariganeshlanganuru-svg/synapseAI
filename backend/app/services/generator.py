import time
import requests
from app.config import settings
from app.services.retriever import query_vector_store

async def generate_grounded_answer(query: str, user_role: str = "Employee", top_k: int = 5) -> dict:
    """
    Synthesizes a grounded answer with line citations using OpenAI API or Groq API.
    """
    start_time = time.time()
    chunks = await query_vector_store(query=query, user_role=user_role, top_k=top_k)
    
    if not chunks:
        answer = "I cannot find relevant policy information in the company documents for your access level."
        citations = []
        followups = ["Request document permission", "Contact HR Specialist"]
        latency = round((time.time() - start_time) * 1000, 2)
        return {
            "query": query,
            "answer": answer,
            "citations": citations,
            "suggested_followups": followups,
            "latency_ms": latency
        }
        
    context_text = "\n\n".join([
        f"Document: {c['document_title']} (Page {c['page_number']}):\n{c['excerpt']}"
        for c in chunks
    ])
    
    system_prompt = (
        "You are SynapseAI, an internal company RAG chatbot & Enterprise Knowledge Assistant.\n"
        "INSTRUCTIONS:\n"
        "1. Answer the user's query strictly using ONLY the provided CONTEXT passages below.\n"
        "2. For every statement, include an inline citation tag: [Doc: <document_title>, Page: <page_number>].\n"
        "3. Maintain a professional, concise, enterprise tone.\n\n"
        f"CONTEXT:\n{context_text}"
    )

    answer = None

    # 1. Try Groq API (Ultra-Fast) if GROQ_API_KEY is available
    if settings.GROQ_API_KEY and "gsk_" in settings.GROQ_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                "temperature": 0.2,
                "max_tokens": 400
            }
            r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=6)
            if r.status_code == 200:
                answer = r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[Groq LLM Warning]: {e}")

    # 2. Try OpenAI API if Groq wasn't used or returned error
    if not answer and settings.OPENAI_API_KEY and "sk-proj-" in settings.OPENAI_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                "temperature": 0.2,
                "max_tokens": 400
            }
            r = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=8)
            if r.status_code == 200:
                answer = r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[OpenAI LLM Warning]: {e}")

    # 3. Local Grounded Synthesis Fallback
    if not answer:
        top_chunk = chunks[0]
        answer = f"Based on internal company documents, {top_chunk['excerpt']} [Doc: {top_chunk['document_title']}, Page: {top_chunk['page_number']}]."

    latency = round((time.time() - start_time) * 1000, 2)
    
    return {
        "query": query,
        "answer": answer,
        "citations": chunks,
        "suggested_followups": [
            f"Would you like me to draft an email regarding {chunks[0]['document_title']}?",
            "How do I submit an HR request for this?",
            "View document in Knowledge Base"
        ],
        "latency_ms": latency
    }
