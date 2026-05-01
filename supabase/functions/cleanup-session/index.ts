import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (request) => {
  const { sessionId, afterExport } = await request.json();
  if (sessionId) {
    const { error } = await supabase.from("import_sessions").delete().eq("id", sessionId);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ ok: true, deletedSession: sessionId, afterExport: Boolean(afterExport) }));
  }

  const { error } = await supabase.rpc("cleanup_expired_import_sessions");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }));
});
