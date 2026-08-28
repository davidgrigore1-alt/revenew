grant insert, update on table public.opportunities to authenticated;
-- safety-justification: workflow runtime requires server-side opportunity reads.
grant select on table public.opportunities to service_role;
-- safety-justification: approved plans are persisted by the server runtime only.
grant select, insert, update on table public.ask_action_plans to service_role;
