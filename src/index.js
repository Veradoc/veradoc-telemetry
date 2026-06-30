export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json().catch(() => ({}));

    const key = `install_${Date.now()}_${crypto.randomUUID()}`;
    await env.TELEMETRY.put(key, JSON.stringify({
      ...body,
      ip_country: request.cf?.country ?? "unknown",
      ts: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
