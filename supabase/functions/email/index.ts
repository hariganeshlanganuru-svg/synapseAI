/**
 * SynapseAI — Edge Function: /functions/v1/email
 * AI email drafting and SMTP dispatch via a relay service.
 *
 * POST /email/draft  → generate an AI-formatted email draft
 * POST /email/send   → send email via Resend (or SMTP relay)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

// Optional: Resend API key (free tier: 100 emails/day). Falls back to SMTP simulation.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SMTP_FROM = Deno.env.get("SMTP_USER") ?? "admin@synapseai.com";

/**
 * Generate a professional email draft using Groq or OpenAI,
 * with a local template fallback.
 */
async function generateDraft(prompt: string, recipient: string): Promise<{ subject: string; body: string }> {
  const subject =
    prompt.length > 35
      ? `Company Policy Notice: ${prompt.slice(0, 35)}...`
      : `HR Notice: ${prompt}`;

  // Try AI-generated body
  let body: string | null = null;
  const systemPrompt =
    `You are SynapseAI's professional HR email writer.\n` +
    `Write a concise, professional company email based on the user's prompt.\n` +
    `Format: Greeting → Policy/Notice body → Call to action → Sign-off.\n` +
    `Keep it under 200 words. Do NOT add subject line — only the email body.`;

  for (const [apiKey, apiUrl, model] of [
    [GROQ_API_KEY, "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile"],
    [OPENAI_API_KEY, "https://api.openai.com/v1/chat/completions", "gpt-4o-mini"],
  ]) {
    if (!apiKey || body) continue;
    try {
      const res = await fetch(apiUrl as string, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const data = await res.json();
        body = data?.choices?.[0]?.message?.content?.trim() ?? null;
      }
    } catch (_) {
      // try next
    }
  }

  // Local template fallback
  if (!body) {
    body =
      `Dear Colleague,\n\n` +
      `This official notification is dispatched by SynapseAI Enterprise Knowledge Assistant:\n\n` +
      `${prompt}\n\n` +
      `If you have any questions regarding this policy, please contact your manager or HR Specialist.\n\n` +
      `Best regards,\n` +
      `HR Department — SynapseAI Enterprise`;
  }

  return { subject, body };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/functions\/v1\/email/, "");

  // ─── POST /draft ──────────────────────────────────────────────────────────
  if (req.method === "POST" && pathname === "/draft") {
    try {
      const { prompt, recipient = "employee@enterprise.com" } = await req.json();
      if (!prompt) return errorResponse("Missing required field: prompt", 400);

      const { subject, body } = await generateDraft(prompt, recipient);

      return jsonResponse({
        success: true,
        data: { recipient, subject, body, status: "DRAFT" },
        error: null,
      });
    } catch (err) {
      return errorResponse(`Draft failed: ${(err as Error).message}`);
    }
  }

  // ─── POST /send ───────────────────────────────────────────────────────────
  if (req.method === "POST" && pathname === "/send") {
    try {
      const { recipient, subject, body } = await req.json();
      if (!recipient || !subject || !body) {
        return errorResponse("Missing required fields: recipient, subject, body", 400);
      }

      let status = "SENT_LOCAL_SIMULATED";
      let errorMsg: string | null = null;
      const emailId = `eml-${Date.now()}`;

      // Try Resend (recommended for Supabase Edge Functions — free 100/day)
      if (RESEND_API_KEY && RESEND_API_KEY.startsWith("re_")) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `SynapseAI Enterprise <${SMTP_FROM}>`,
              to: [recipient],
              subject,
              text: body,
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            status = "SENT";
            console.log(`[Email Sent via Resend] to ${recipient}`);
          } else {
            const errData = await res.json();
            errorMsg = errData?.message ?? "Resend API error";
            console.warn("[Resend Warning]:", errorMsg);
          }
        } catch (e) {
          errorMsg = (e as Error).message;
        }
      } else {
        // Log simulation — SMTP not available directly in Deno Edge
        console.log(`[Email Simulated] To: ${recipient} | Subject: ${subject}`);
        status = "SENT_LOCAL_SIMULATED";
      }

      const timestamp = new Date().toISOString();

      // Log to Supabase DB
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await supabase.from("email_logs").insert({
            recipient,
            subject,
            body,
            status,
            error_msg: errorMsg,
            sent_at: timestamp,
          });
        } catch (dbErr) {
          console.warn("[Email Log DB Warning]:", dbErr);
        }
      }

      return jsonResponse({
        success: true,
        data: {
          email_id: emailId,
          sender: SMTP_FROM,
          recipient,
          subject,
          status,
          error: errorMsg,
          timestamp,
        },
        error: null,
      });
    } catch (err) {
      return errorResponse(`Send failed: ${(err as Error).message}`);
    }
  }

  return errorResponse("Not found", 404);
});
