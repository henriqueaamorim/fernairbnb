create or replace function public.cleanup_expired_import_sessions()
returns void
language plpgsql
as $$
begin
  delete from public.import_sessions
  where expires_at < now();
end;
$$;
