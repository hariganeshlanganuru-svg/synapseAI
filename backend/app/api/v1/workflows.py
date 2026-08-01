from fastapi import APIRouter
from pydantic import BaseModel
from app.services.workflow_engine import list_playbooks, trigger_playbook

router = APIRouter(prefix="/workflows", tags=["Workflow Center"])

class TriggerWorkflowRequest(BaseModel):
    playbook_id: str
    input_payload: dict = {}

@router.get("/playbooks")
async def get_playbooks():
    playbooks = await list_playbooks()
    return {"success": True, "data": playbooks, "error": None}

@router.post("/trigger")
async def trigger_workflow(payload: TriggerWorkflowRequest):
    result = await trigger_playbook(payload.playbook_id, payload.input_payload)
    return {"success": True, "data": result, "error": None}
