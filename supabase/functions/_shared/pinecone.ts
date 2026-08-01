/**
 * Shared Pinecone helper for SynapseAI Edge Functions.
 * Handles vector query (retrieval) and upsert (indexing).
 * Uses Pinecone REST API directly — no SDK needed in Deno.
 */

const PINECONE_API_KEY = Deno.env.get("PINECONE_API_KEY") ?? "";
const PINECONE_INDEX_NAME = Deno.env.get("PINECONE_INDEX_NAME") ?? "rag-enterprises-index";
const PINECONE_ENVIRONMENT = Deno.env.get("PINECONE_ENVIRONMENT") ?? "us-east-1";

// Host format for Pinecone serverless indexes
const PINECONE_HOST = `https://${PINECONE_INDEX_NAME}-${Deno.env.get("PINECONE_PROJECT_ID") ?? ""}.svc.${PINECONE_ENVIRONMENT}.pinecone.io`;

// Role-Based Access Control tier mapping
const ROLE_TIERS: Record<string, string[]> = {
  Employee: ["Employee"],
  HR: ["Employee", "HR"],
  Manager: ["Employee", "HR", "Manager"],
  Admin: ["Employee", "HR", "Manager", "Admin"],
};

const ROLE_LEVELS: Record<string, number> = {
  Employee: 1,
  HR: 2,
  Manager: 3,
  Admin: 4,
};

// Fallback mock knowledge base (used when Pinecone is empty or unavailable)
const MOCK_KNOWLEDGE = [
  {
    document_title: "2026_Employee_Handbook.pdf",
    page_number: 14,
    min_role: "Employee",
    excerpt:
      "Fathers and secondary caregivers are entitled to 6 weeks of 100% fully paid paternity leave following the birth or adoption of a child. Leave requests must be submitted to HR 30 days prior.",
  },
  {
    document_title: "2026_Employee_Handbook.pdf",
    page_number: 22,
    min_role: "Employee",
    excerpt:
      "Standard working hours are 9:00 AM to 5:00 PM Monday through Friday. Hybrid work permits up to 2 remote workdays per week with manager pre-approval.",
  },
  {
    document_title: "IT_Security_Policy_v4.pdf",
    page_number: 8,
    min_role: "Employee",
    excerpt:
      "All enterprise laptops must have BitLocker disk encryption enabled. Multi-factor authentication (MFA) is strictly mandatory across all corporate accounts.",
  },
  {
    document_title: "Travel_Expense_Policy_2026.docx",
    page_number: 5,
    min_role: "Manager",
    excerpt:
      "Daily meal reimbursement limits are capped at $75 per day for domestic travel and $120 per day for international business trips. Original itemized receipts are required.",
  },
];

/**
 * Generate an embedding for the given text using Pinecone's hosted embedding model.
 * Falls back to a random vector stub if the model endpoint is unavailable.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const modelName = Deno.env.get("PINECONE_MODEL") ?? "llama-text-embed-v2";
  try {
    const res = await fetch("https://api.pinecone.io/embed", {
      method: "POST",
      headers: {
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        inputs: [{ text }],
        parameters: { input_type: "query", truncate: "END" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.data?.[0]?.values ?? randomVector(1024);
    }
  } catch (_) {
    // ignore
  }
  return randomVector(1024);
}

/** Fallback random unit vector when embedding API is unavailable */
function randomVector(dim: number): number[] {
  const vec = Array.from({ length: dim }, () => Math.random() - 0.5);
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}

export interface RetrievedChunk {
  document_title: string;
  page_number: number;
  min_role: string;
  score: number;
  excerpt: string;
}

/**
 * Query Pinecone vector index with RBAC metadata filtering.
 * Falls back to in-memory mock knowledge base if Pinecone is unavailable.
 */
export async function queryVectorStore(
  query: string,
  userRole = "Employee",
  topK = 5
): Promise<RetrievedChunk[]> {
  const allowedRoles = ROLE_TIERS[userRole] ?? ["Employee"];

  if (PINECONE_API_KEY && !PINECONE_API_KEY.includes("your-pinecone")) {
    try {
      const queryVector = await generateEmbedding(query);
      const res = await fetch(`${PINECONE_HOST}/query`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vector: queryVector,
          topK,
          includeMetadata: true,
          filter: { min_role: { $in: allowedRoles } },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const matches = data?.matches ?? [];
        if (matches.length > 0) {
          return matches.map((m: Record<string, unknown>) => {
            const meta = (m.metadata ?? {}) as Record<string, unknown>;
            return {
              document_title: (meta.document_title as string) ?? "Company_Policy.pdf",
              page_number: (meta.page_number as number) ?? 1,
              min_role: (meta.min_role as string) ?? "Employee",
              score: Math.round(((m.score as number) ?? 0.85) * 100) / 100,
              excerpt: (meta.chunk_text as string) ?? "",
            };
          });
        }
      }
    } catch (e) {
      console.error("[Pinecone Query Error]:", e);
    }
  }

  // Local semantic fallback
  const userRank = ROLE_LEVELS[userRole] ?? 1;
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  const results: RetrievedChunk[] = MOCK_KNOWLEDGE.filter(
    (item) => (ROLE_LEVELS[item.min_role] ?? 1) <= userRank
  ).map((item) => {
    const textWords = new Set(item.excerpt.toLowerCase().split(/\s+/));
    const overlap = [...queryWords].filter((w) => textWords.has(w)).length;
    const score = Math.round((0.72 + Math.min(0.25, overlap * 0.05)) * 100) / 100;
    return { ...item, score };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Upsert document chunks into Pinecone index.
 */
export async function upsertChunksToPinecone(
  documentTitle: string,
  chunks: Array<{ chunk_index: number; text: string; page_number?: number }>,
  minRole = "Employee"
): Promise<boolean> {
  if (!PINECONE_API_KEY || PINECONE_API_KEY.includes("your-pinecone")) {
    console.log("[Pinecone Upsert]: Local mode — skipping upsert.");
    return false;
  }
  try {
    const vectors = await Promise.all(
      chunks.map(async (c) => ({
        id: `${documentTitle}_chunk_${c.chunk_index}`,
        values: await generateEmbedding(c.text),
        metadata: {
          document_title: documentTitle,
          chunk_index: c.chunk_index,
          chunk_text: c.text,
          min_role: minRole,
          page_number: c.page_number ?? 1,
        },
      }))
    );
    const res = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
      method: "POST",
      headers: {
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vectors }),
    });
    if (res.ok) {
      console.log(`[Pinecone Upsert]: ${vectors.length} chunks indexed.`);
      return true;
    }
  } catch (e) {
    console.error("[Pinecone Upsert Error]:", e);
  }
  return false;
}
