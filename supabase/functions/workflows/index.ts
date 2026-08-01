/**
 * SynapseAI — Edge Function: /functions/v1/workflows
 * Enterprise playbook listing and triggering.
 */
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const PLAYBOOKS = [
  {
    id: "hr-onboarding-v1",
    title: "HR Employee Onboarding Playbook",
    category: "Human Resources",
    description: "Complete end-to-end employee onboarding workflow",
    steps: [
      "Collect Employee Personal & Tax Information",
      "Provision Enterprise IT Account & Email",
      "Schedule Orientation with Department Manager",
      "Generate & Send AI Welcome Package Email",
    ],
  },
  {
    id: "expense-claim-v1",
    title: "Corporate Expense Reimbursement",
    category: "Finance",
    description: "Automated expense validation and reimbursement workflow",
    steps: [
      "Upload Itemized Receipt Document",
      "Validate Expense against Travel Expense Policy 2026",
      "Submit for Manager Approval",
      "Issue Direct Deposit Reimbursement",
    ],
  },
  {
    id: "it-access-request-v1",
    title: "IT System Access & Hardware Provisioning",
    category: "IT Operations",
    description: "Streamlined IT access and hardware request workflow",
    steps: [
      "Verify Security Clearance & User Role",
      "Check Hardware Availability",
      "Grant System Entitlements",
      "Dispatch Access Confirmation Notification",
    ],
  },
  {
    id: "leave-request-v1",
    title: "Employee Leave Request Workflow",
    category: "Human Resources",
    description: "Policy-aware leave request and approval workflow",
    steps: [
      "Retrieve Applicable Leave Policy",
      "Calculate Leave Balance",
      "Submit Leave Request to Manager",
      "Generate & Send Leave Confirmation Email",
    ],
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/functions\/v1\/workflows/, "");

  // GET /workflows or /workflows/playbooks → list all playbooks
  if (req.method === "GET" && (pathname === "" || pathname === "/" || pathname === "/playbooks")) {
    return jsonResponse({ success: true, data: PLAYBOOKS, error: null });
  }

  // POST /workflows/trigger → trigger a playbook
  if (req.method === "POST" && pathname === "/trigger") {
    try {
      const { playbook_id, input_payload = {} } = await req.json();

      if (!playbook_id) {
        return errorResponse("Missing required field: playbook_id", 400);
      }

      const playbook = PLAYBOOKS.find((p) => p.id === playbook_id) ?? PLAYBOOKS[0];

      return jsonResponse({
        success: true,
        data: {
          workflow_instance_id: `wf-${playbook.id}-${Date.now()}`,
          playbook_id: playbook.id,
          playbook_title: playbook.title,
          category: playbook.category,
          status: "IN_PROGRESS",
          current_step_index: 0,
          current_step: playbook.steps[0],
          total_steps: playbook.steps.length,
          all_steps: playbook.steps,
          input_payload,
          message: `Successfully initiated '${playbook.title}'.`,
          started_at: new Date().toISOString(),
        },
        error: null,
      });
    } catch (err) {
      return errorResponse(`Invalid request: ${(err as Error).message}`, 400);
    }
  }

  return errorResponse("Not found", 404);
});
