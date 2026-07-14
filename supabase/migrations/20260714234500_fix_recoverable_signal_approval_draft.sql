-- Disambiguate the reviewed_draft RPC argument from the signal column.
-- This is a function-body-only correction; no tables, policies, or grants are widened.

begin;

do $migration$
declare
  v_signature regprocedure := 'public.approve_recoverable_signal(uuid,uuid,uuid,text,text,text,text,uuid,timestamptz,text,text)'::regprocedure;
  v_definition text;
  v_ambiguous text := $needle$nullif(btrim(reviewed_draft), '')$needle$;
  v_qualified text := $replacement$nullif(btrim($11), '')$replacement$;
begin
  select pg_get_functiondef(v_signature) into v_definition;

  if v_definition is null or position(v_ambiguous in v_definition) = 0 then
    raise exception 'Expected approve_recoverable_signal definition was not found.';
  end if;

  v_definition := replace(v_definition, v_ambiguous, v_qualified);

  if position(v_ambiguous in v_definition) > 0 then
    raise exception 'reviewed_draft remains ambiguous after function correction.';
  end if;

  execute v_definition;
end
$migration$;

revoke all on function public.approve_recoverable_signal(uuid, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text) from public, anon;
grant execute on function public.approve_recoverable_signal(uuid, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text) to authenticated;

commit;

