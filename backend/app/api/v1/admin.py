from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/admin", tags=["Admin & System Configuration"])

class PromptUpdateRequest(BaseModel):
    prompt_name: str
    category: str
    content: str

class ModelChangeRequest(BaseModel):
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 4096

class SMTPTestRequest(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    test_recipient: str

class PlaygroundTestRequest(BaseModel):
    prompt_content: str
    sample_query: str

@router.get("/prompts")
async def get_prompts():
    return {
        "success": True,
        "data": [
            {
                "id": "prompt-1",
                "prompt_name": "RAG Answer Generator",
                "category": "Chat",
                "version": "v2.1",
                "content": "You are SynapseAI, an enterprise knowledge assistant. Answer strictly based on the provided context.",
                "updated_at": "2026-07-28"
            },
            {
                "id": "prompt-2",
                "prompt_name": "SMTP Email Writer",
                "category": "Email",
                "version": "v1.4",
                "content": "Draft a professional corporate email based on the prompt. Keep tone professional and structured.",
                "updated_at": "2026-07-25"
            },
            {
                "id": "prompt-3",
                "prompt_name": "Policy Summarizer",
                "category": "Policy",
                "version": "v1.0",
                "content": "Summarize the given HR/IT policy into key bullet points and compliance rules.",
                "updated_at": "2026-07-20"
            }
        ],
        "error": None
    }

@router.post("/prompts/update")
async def update_prompt(payload: PromptUpdateRequest):
    return {
        "success": True,
        "data": {
            "prompt_name": payload.prompt_name,
            "status": "UPDATED",
            "version": "v2.2"
        },
        "error": None
    }

@router.post("/prompts/test-playground")
async def test_prompt_playground(payload: PlaygroundTestRequest):
    return {
        "success": True,
        "data": {
            "retrieved_chunks": 3,
            "latency_ms": 290,
            "tokens_used": 148,
            "confidence": "96%",
            "generated_output": f"Simulated output using prompt test rules for query: '{payload.sample_query}'."
        },
        "error": None
    }

@router.get("/knowledge-health")
async def get_knowledge_health():
    return {
        "success": True,
        "data": {
            "coverage_pct": 95,
            "missing_topics": ["Travel Insurance Coverage", "Equipment Return SOP"],
            "duplicate_documents": 0,
            "expired_policies": 1,
            "weak_answers_score": "2%",
            "recommended_uploads": ["2026_Travel_Insurance_Policy.pdf", "Offboarding_Equipment_SOP.docx"]
        },
        "error": None
    }

@router.get("/organization-map")
async def get_organization_map():
    return {
        "success": True,
        "data": {
            "name": "SynapseAI Enterprise",
            "departments": [
                {
                    "name": "Executive & Admin",
                    "lead": "Sarah Jenkins (CEO)",
                    "projects": ["Enterprise AI Rollout"],
                    "documents": ["System_Architecture_Core.pdf"]
                },
                {
                    "name": "Human Resources",
                    "lead": "David Miller (VP HR)",
                    "projects": ["2026 Hiring Drive", "Onboarding Revamp"],
                    "documents": ["2026_Employee_Handbook.pdf", "HR_Paternity_Maternity_Policy.pdf"]
                },
                {
                    "name": "Engineering & Technology",
                    "lead": "Haritha Langanuru (Engineering Director)",
                    "projects": ["SynapseAI OS Core", "RAG Pipeline v2"],
                    "documents": ["IT_Security_Policy_v4.pdf"]
                }
            ]
        },
        "error": None
    }

@router.get("/models")
async def get_models():
    return {
        "success": True,
        "data": {
            "current_model": "Llama 3.3 70B Instruct",
            "available_models": [
                {"name": "Llama 3.3 70B Instruct", "provider": "Groq / Meta", "speed": "Very Fast", "latency_ms": 280},
                {"name": "GPT-4o Enterprise", "provider": "OpenAI", "speed": "Fast", "latency_ms": 420},
                {"name": "Claude 3.5 Sonnet", "provider": "Anthropic", "speed": "Fast", "latency_ms": 380},
                {"name": "DeepSeek R1", "provider": "DeepSeek", "speed": "Medium", "latency_ms": 510}
            ],
            "temperature": 0.3,
            "max_tokens": 4096
        },
        "error": None
    }

@router.post("/models/change")
async def change_model(payload: ModelChangeRequest):
    return {
        "success": True,
        "data": {
            "model_name": payload.model_name,
            "temperature": payload.temperature,
            "max_tokens": payload.max_tokens,
            "status": "ACTIVE"
        },
        "error": None
    }

@router.get("/vector-db")
async def get_vector_db_stats():
    return {
        "success": True,
        "data": {
            "index_name": "synapseai-index",
            "total_vectors": 1420,
            "dimension": 1536,
            "namespaces": [
                {"name": "default", "vector_count": 850},
                {"name": "hr-policies", "vector_count": 320},
                {"name": "executive-docs", "vector_count": 250}
            ],
            "health": "HEALTHY",
            "search_latency_ms": 45.2
        },
        "error": None
    }

@router.post("/vector-db/reindex")
async def reindex_vector_db():
    return {
        "success": True,
        "data": {
            "status": "REINDEXING_STARTED",
            "documents_queued": 14,
            "estimated_completion_sec": 12
        },
        "error": None
    }

@router.post("/smtp/test")
async def test_smtp_config(payload: SMTPTestRequest):
    return {
        "success": True,
        "data": {
            "smtp_host": payload.smtp_host,
            "smtp_port": payload.smtp_port,
            "status": "CONNECTED",
            "test_email_sent_to": payload.test_recipient
        },
        "error": None
    }

@router.get("/ai-logs")
async def get_ai_logs():
    return {
        "success": True,
        "data": [
            {
                "timestamp": "2026-07-30 16:20:12",
                "user": "Haritha L. (Employee)",
                "query": "What is our paternity leave policy?",
                "model": "Llama 3.3 70B",
                "tokens": 240,
                "latency_ms": 285,
                "confidence": "98%",
                "status": "SUCCESS",
                "guardrail": "PASSED"
            },
            {
                "timestamp": "2026-07-30 15:45:01",
                "user": "David M. (HR)",
                "query": "Summarize Candidate Alex Rivera Resume",
                "model": "GPT-4o Enterprise",
                "tokens": 512,
                "latency_ms": 410,
                "confidence": "94%",
                "status": "SUCCESS",
                "guardrail": "PASSED"
            },
            {
                "timestamp": "2026-07-30 14:12:33",
                "user": "System Auto-Sync",
                "query": "Pinecone vector index auto-refresh",
                "model": "text-embedding-3-small",
                "tokens": 1280,
                "latency_ms": 120,
                "confidence": "100%",
                "status": "SUCCESS",
                "guardrail": "PASSED"
            },
            {
                "timestamp": "2026-07-30 12:05:19",
                "user": "Unknown User",
                "query": "[REDACTED] Request restricted payroll sheet",
                "model": "Llama 3.3 70B",
                "tokens": 42,
                "latency_ms": 95,
                "confidence": "0%",
                "status": "BLOCKED",
                "guardrail": "RESTRICTED_DOC_TRIGGERED"
            }
        ],
        "error": None
    }

