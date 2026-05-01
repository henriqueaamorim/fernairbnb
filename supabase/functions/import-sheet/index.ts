import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (request) => {
  const { sessionId, rows } = await request.json();
  if (!sessionId || !Array.isArray(rows)) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400 });
  }

  const { error } = await supabase.from("staging_reservations").insert(
    rows.map((row: Record<string, unknown>) => ({
      session_id: sessionId,
      platform: row.platform,
      unit_raw_name: row.unitRawName,
      unit_id: row.unitId,
      start_date: row.startDate,
      end_date: row.endDate,
      confirmation_code: row.confirmationCode,
      nights: row.nights,
      booking_value: row.bookingValue,
      status: row.status,
      payload: row
    }))
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }));
});
