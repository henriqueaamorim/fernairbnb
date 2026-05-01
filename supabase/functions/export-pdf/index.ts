import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (request) => {
  const { sessionId, unitId } = await request.json();
  if (!sessionId || !unitId) {
    return new Response(JSON.stringify({ error: "missing_params" }), { status: 400 });
  }

  const { data, error } = await supabase
    .from("consolidated_reservations")
    .select("*")
    .eq("session_id", sessionId)
    .eq("unit_id", unitId)
    .order("start_date", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Renderizacao final do PDF ocorre no frontend para manter simplicidade do MVP.
  return new Response(JSON.stringify({ ok: true, rows: data ?? [] }));
});
