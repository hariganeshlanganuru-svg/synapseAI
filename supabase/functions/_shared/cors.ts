/**
 * Shared CORS headers for all SynapseAI Edge Functions.
 * Required so that requests from Vercel can reach Supabase.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Return a standard preflight OPTIONS response.
 */
export function handleCors(): Response {
  return new Response("ok", { headers: corsHeaders, status: 200 });
}

/**
 * Wrap a Response with CORS headers.
 */
export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, val] of Object.entries(corsHeaders)) {
    headers.set(key, val);
  }
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Return a JSON response with CORS headers.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Return an error JSON response with CORS headers.
 */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, data: null, error: message }, status);
}
