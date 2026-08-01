/**
 * SynapseAI — Edge Function: /functions/v1/chat
 * RAG Chat: Pinecone retrieval → Groq/OpenAI LLM → grounded answer with citations.
 */
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { queryVectorStore, RetrievedChunk } from "../_shared/pinecone.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { query, user_role = "Employee", top_k = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return errorResponse("Missing required field: query", 400);
    }

    const startTime = Date.now();

    // Step 1: Retrieve relevant document chunks from Pinecone (RBAC filtered)
    const chunks: RetrievedChunk[] = await queryVectorStore(query, user_role, top_k);

    if (chunks.length === 0) {
      return jsonResponse({
        success: true,
        data: {
          query,
          answer: "I cannot find relevant policy information in the company documents for your access level.",
          citations: [],
          suggested_followups: ["Request document permission", "Contact HR Specialist"],
          latency_ms: Date.now() - startTime,
        },
        error: null,
      });
    }

    // Step 2: Build system prompt with retrieved context
    const contextText = chunks
      .map((c) => `Document: ${c.document_title} (Page ${c.page_number}):\n${c.excerpt}`)
      .join("\n\n");

    const systemPrompt =
      `You are SynapseAI, an internal company RAG chatbot & Enterprise Knowledge Assistant.\n` +
      `INSTRUCTIONS:\n` +
      `1. Answer the user's query strictly using ONLY the provided CONTEXT passages below.\n` +
      `2. For every statement, include an inline citation tag: [Doc: <document_title>, Page: <page_number>].\n` +
      `3. Maintain a professional, concise, enterprise tone.\n\n` +
      `CONTEXT:\n${contextText}`;

    let answer: string | null = null;

    // Step 3a: Try Groq (ultra-fast LLM)
    if (GROQ_API_KEY && GROQ_API_KEY.startsWith("gsk_")) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
            temperature: 0.2,
            max_tokens: 400,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          answer = data?.choices?.[0]?.message?.content ?? null;
        }
      } catch (e) {
        console.warn("[Groq Warning]:", e);
      }
    }

    // Step 3b: Try OpenAI (fallback)
    if (!answer && OPENAI_API_KEY && OPENAI_API_KEY.startsWith("sk-")) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
            temperature: 0.2,
            max_tokens: 400,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          answer = data?.choices?.[0]?.message?.content ?? null;
        }
      } catch (e) {
        console.warn("[OpenAI Warning]:", e);
      }
    }

    // Step 3c: Local grounded synthesis fallback
    if (!answer) {
      const top = chunks[0];
      answer = `Based on internal company documents, ${top.excerpt} [Doc: ${top.document_title}, Page: ${top.page_number}].`;
    }

    const latencyMs = Date.now() - startTime;

    return jsonResponse({
      success: true,
      data: {
        query,
        answer,
        citations: chunks,
        suggested_followups: [
          `Would you like me to draft an email regarding ${chunks[0].document_title}?`,
          "How do I submit an HR request for this?",
          "View document in Knowledge Base",
        ],
        latency_ms: latencyMs,
      },
      error: null,
    });
  } catch (err) {
    console.error("[Chat Function Error]:", err);
    return errorResponse(`Internal server error: ${(err as Error).message}`);
  }
});
