import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (request) => {
  const { sessionId, habitatFeePercent = 20 } = await request.json();
  if (!sessionId) return new Response(JSON.stringify({ error: "missing_session" }), { status: 400 });

  const { data: rows, error: loadError } = await supabase
    .from("staging_reservations")
    .select("*")
    .eq("session_id", sessionId);

  if (loadError) return new Response(JSON.stringify({ error: loadError.message }), { status: 500 });

  const grouped = new Map<string, Record<string, unknown>>();
  for (const row of rows ?? []) {
    const status = String(row.status ?? "").toLowerCase();
    if (status.includes("cancel")) continue;
    const key = `${row.unit_id}::${row.confirmation_code}::${row.start_date}`;
    const previous = grouped.get(key);
    if (!previous) {
      grouped.set(key, {
        session_id: sessionId,
        unit_id: row.unit_id,
        unit_name: row.unit_raw_name,
        platform: row.platform,
        start_date: row.start_date,
        end_date: row.end_date,
        confirmation_code: row.confirmation_code,
        nights: Number(row.nights ?? 0),
        booking_value: Number(row.booking_value ?? 0),
        status: row.status
      });
      continue;
    }
    previous.nights = Number(previous.nights) + Number(row.nights ?? 0);
    previous.booking_value = Number(previous.booking_value) + Number(row.booking_value ?? 0);
  }

  await supabase.from("consolidated_reservations").delete().eq("session_id", sessionId);
  const rowsToInsert = Array.from(grouped.values());
  if (rowsToInsert.length) {
    const { error: insertError } = await supabase.from("consolidated_reservations").insert(rowsToInsert);
    if (insertError) return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  const subtotal = rowsToInsert.reduce((acc, row) => acc + Number(row.booking_value ?? 0), 0);
  const habitatFeeValue = subtotal * (Number(habitatFeePercent) / 100);
  const netValue = subtotal - habitatFeeValue;
  await supabase.from("session_totals").upsert({
    session_id: sessionId,
    habitat_fee_percent: habitatFeePercent,
    subtotal,
    habitat_fee_value: habitatFeeValue,
    net_value: netValue,
    updated_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({ ok: true, totalRows: rowsToInsert.length, subtotal, netValue }));
});
