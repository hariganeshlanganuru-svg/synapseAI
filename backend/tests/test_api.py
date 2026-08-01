from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "SynapseAI" in response.text or "Enterprise Knowledge Assistant" in response.text


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_rag_chat_endpoint():
    payload = {
        "query": "What is our policy on paternity leave?",
        "user_role": "Employee"
    }
    response = client.post("/api/v1/rag/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "paternity" in data["data"]["answer"].lower() or "leave" in data["data"]["answer"].lower()
    assert len(data["data"]["citations"]) > 0

def test_rbac_restriction():
    payload = {
        "query": "What is executive compensation bonus target?",
        "user_role": "Employee"  # Employee role should not retrieve Admin docs
    }
    response = client.post("/api/v1/rag/chat", json=payload)
    assert response.status_code == 200
    citations = response.json()["data"]["citations"]
    for c in citations:
        assert c["min_role"] != "Admin"

def test_admin_prompts_endpoint():
    response = client.get("/api/v1/admin/prompts")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) >= 3

def test_admin_models_endpoint():
    response = client.get("/api/v1/admin/models")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "current_model" in response.json()["data"]

def test_admin_vector_db_endpoint():
    response = client.get("/api/v1/admin/vector-db")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["total_vectors"] > 0

def test_email_draft_and_send():
    draft_res = client.post("/api/v1/email/draft", json={"prompt": "Paternity leave notice", "recipient": "test@company.com"})
    assert draft_res.status_code == 200
    assert draft_res.json()["success"] is True

    send_res = client.post("/api/v1/email/send", json={
        "recipient": "test@company.com",
        "subject": "Test Notice",
        "body": "Test content body"
    })
    assert send_res.status_code == 200
    assert send_res.json()["success"] is True

