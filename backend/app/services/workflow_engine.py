PLAYBOOKS = [
    {
        "id": "hr-onboarding-v1",
        "title": "HR Employee Onboarding Playbook",
        "category": "Human Resources",
        "steps": [
            "Collect Employee Personal & Tax Information",
            "Provision Enterprise IT Account & Email",
            "Schedule Orientation with Department Manager",
            "Generate & Send AI Welcome Package Email"
        ]
    },
    {
        "id": "expense-claim-v1",
        "title": "Corporate Expense Reimbursement",
        "category": "Finance",
        "steps": [
            "Upload Itemized Receipt Document",
            "Validate Expense against Travel Expense Policy 2026",
            "Submit for Manager Approval",
            "Issue Direct Deposit Reimbursement"
        ]
    },
    {
        "id": "it-access-request-v1",
        "title": "IT System Access & Hardware Provisioning",
        "category": "IT Operations",
        "steps": [
            "Verify Security Clearance & User Role",
            "Check Hardware Availability",
            "Grant System Entitlements",
            "Dispatch Access Confirmation Notification"
        ]
    }
]

async def list_playbooks() -> list[dict]:
    return PLAYBOOKS

async def trigger_playbook(playbook_id: str, input_payload: dict) -> dict:
    playbook = next((p for p in PLAYBOOKS if p["id"] == playbook_id), PLAYBOOKS[0])
    return {
        "workflow_instance_id": f"wf-{playbook_id}-1001",
        "playbook_title": playbook["title"],
        "status": "IN_PROGRESS",
        "current_step_index": 1,
        "current_step": playbook["steps"][0],
        "total_steps": len(playbook["steps"]),
        "input_payload": input_payload,
        "message": f"Successfully initiated '{playbook['title']}'."
    }
