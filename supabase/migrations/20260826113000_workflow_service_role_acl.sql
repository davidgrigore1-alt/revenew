-- Server-only workflow operations need explicit table privileges; authenticated access and existing RLS policies remain unchanged.
grant select, insert, update
on table public.commercial_workflows
to service_role;

grant select, insert, update
on table public.commercial_workflow_runs
to service_role;