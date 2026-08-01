from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(payload: LoginRequest):
    role = "Admin" if "admin" in payload.email.lower() else "Employee"
    return {
        "success": True,
        "data": {
            "access_token": "mock-jwt-token-synapse-ai-2026",
            "token_type": "bearer",
            "user": {
                "id": "usr-1",
                "email": payload.email,
                "full_name": payload.email.split("@")[0].title(),
                "role": role,
                "department": "Engineering"
            }
        },
        "error": None
    }

@router.get("/me")
async def get_current_user_profile():
    return {
        "success": True,
        "data": {
            "id": "usr-1",
            "email": "admin@synapseai.com",
            "full_name": "System Administrator",
            "role": "Admin",
            "department": "Executive"
        },
        "error": None
    }
