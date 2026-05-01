import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (request) => {
  const { sessionId } = await request.json();
  if (!sessionId) return new Response(JSON.stringify({ error: "missing_session" }), { status: 400 });

  const { data, error } = await supabase
    .from("consolidated_reservations")
    .select("*")
    .eq("session_id", sessionId);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, rows: data ?? [] }));
});
