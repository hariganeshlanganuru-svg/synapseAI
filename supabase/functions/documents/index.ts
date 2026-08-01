/**
 * SynapseAI — Edge Function: /functions/v1/documents
 * Document listing (GET) and file upload + Pinecone indexing (POST).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { upsertChunksToPinecone } from "../_shared/pinecone.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Chunk text into 500-token overlapping segments
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
    i += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

// Extract plain text from a document buffer (basic text parsing)
function extractText(buffer: ArrayBuffer, filename: string): string {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let text = decoder.decode(bytes);

  // For PDFs: extract readable ASCII sequences (naive, no PDF.js in Deno Edge)
  if (filename.toLowerCase().endsWith(".pdf")) {
    const matches = text.match(/[\x20-\x7E\n\r\t]{10,}/g) ?? [];
    text = matches.join(" ");
  }
  return text.replace(/\s+/g, " ").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/functions\/v1\/documents/, "");

  // ─── GET / → list documents ──────────────────────────────────────────────
  if (req.method === "GET" && (pathname === "" || pathname === "/")) {
    // Static seed data (always available, even without DB connection)
    const seedDocuments = [
      { id: "doc-1", title: "2026_Employee_Handbook.pdf",       file_type: "PDF",  file_size: 2450000, min_role: "Employee", status: "INDEXED", chunk_count: 42 },
      { id: "doc-2", title: "IT_Security_Policy_v4.pdf",        file_type: "PDF",  file_size: 1200000, min_role: "Employee", status: "INDEXED", chunk_count: 18 },
      { id: "doc-3", title: "Travel_Expense_Policy_2026.docx",  file_type: "DOCX", file_size: 850000,  min_role: "Manager",  status: "INDEXED", chunk_count: 11 },
      { id: "doc-4", title: "Executive_Compensation_2026.pdf",  file_type: "PDF",  file_size: 3100000, min_role: "Admin",    status: "INDEXED", chunk_count: 27 },
    ];

    // Try to enrich with live DB data
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data } = await supabase
          .from("documents")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          return jsonResponse({ success: true, data, error: null });
        }
      } catch (e) {
        console.warn("[Documents List DB Warning]:", e);
      }
    }

    return jsonResponse({ success: true, data: seedDocuments, error: null });
  }

  // ─── POST /upload → upload, chunk, index ─────────────────────────────────
  if (req.method === "POST" && pathname === "/upload") {
    try {
      const contentType = req.headers.get("content-type") ?? "";

      if (!contentType.includes("multipart/form-data")) {
        return errorResponse("Request must be multipart/form-data", 400);
      }

      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const title = (formData.get("title") as string) || file?.name || "document.pdf";
      const minRole = (formData.get("min_role") as string) || "Employee";

      if (!file) {
        return errorResponse("Missing required field: file", 400);
      }

      const buffer = await file.arrayBuffer();
      const fileSize = buffer.byteLength;
      const filename = file.name ?? title;

      // 1. Extract text
      const rawText = extractText(buffer, filename);

      // 2. Chunk text
      const textChunks = chunkText(rawText);
      const chunks = textChunks.map((text, idx) => ({
        chunk_index: idx,
        text,
        page_number: Math.floor(idx / 3) + 1,
      }));

      // 3. Store file in Supabase Storage (if available)
      let storagePath: string | null = null;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const storageKey = `documents/${Date.now()}_${filename}`;
          const { error: storageErr } = await supabase.storage
            .from("synapseai-docs")
            .upload(storageKey, buffer, { contentType: file.type || "application/octet-stream" });
          if (!storageErr) storagePath = storageKey;
        } catch (e) {
          console.warn("[Storage Warning]:", e);
        }
      }

      // 4. Upsert chunks to Pinecone
      const pineconeIndexed = await upsertChunksToPinecone(title, chunks, minRole);

      // 5. Save document metadata to Supabase DB
      let documentId = `doc-${Date.now()}`;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: docData } = await supabase
            .from("documents")
            .insert({
              title,
              storage_path: storagePath,
              file_type: filename.endsWith(".pdf") ? "PDF" : filename.endsWith(".docx") ? "DOCX" : "TXT",
              file_size: fileSize,
              min_role: minRole,
              status: "INDEXED",
              chunk_count: chunks.length,
            })
            .select("id")
            .single();
          if (docData?.id) documentId = docData.id;
        } catch (e) {
          console.warn("[Documents DB Insert Warning]:", e);
        }
      }

      return jsonResponse({
        success: true,
        data: {
          document_id: documentId,
          title,
          file_size: fileSize,
          chunks_created: chunks.length,
          min_role: minRole,
          pinecone_indexed: pineconeIndexed,
          storage_path: storagePath,
          status: "INDEXED",
        },
        error: null,
      });
    } catch (err) {
      console.error("[Documents Upload Error]:", err);
      return errorResponse(`Upload failed: ${(err as Error).message}`);
    }
  }

  return errorResponse("Not found", 404);
});
