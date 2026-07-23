import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createLocalAdminClient, requireDemoPassword, runLocalSql } from "./local-supabase.mjs";
import { buildFixtures, DEMO } from "./fixtures.mjs";

async function findUser(admin, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Autentificarea locală nu poate fi verificată: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  throw new Error("Căutarea contului demo a depășit limita sigură.");
}

async function main() {
  const password = await requireDemoPassword();
  const { client: admin, local } = createLocalAdminClient();

  let user = await findUser(admin, DEMO.email);
  if (user) {
    const credentialProbe = createClient(local.apiUrl, local.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const probe = await credentialProbe.auth.signInWithPassword({ email: DEMO.email, password });
    if (probe.error) {
      const { data, error } = await admin.auth.admin.updateUserById(user.id, {
        password, email_confirm: true, user_metadata: { full_name: "Operator Demo ReveNew", demo_marker: DEMO.marker }
      });
      if (error) throw new Error(`Contul demo local nu a putut fi actualizat: ${error.message}`);
      user = data.user;
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO.email, password, email_confirm: true,
      user_metadata: { full_name: "Operator Demo ReveNew", demo_marker: DEMO.marker }
    });
    if (error || !data.user) throw new Error(`Contul demo local nu a putut fi creat: ${error?.message ?? "răspuns invalid"}`);
    user = data.user;
  }

  const existingProfileId = runLocalSql(`select coalesce((select id::text from public.profiles where user_id = '${user.id}' limit 1), '');`);
  const profileId = existingProfileId || randomUUID();

  const fixtures = buildFixtures(profileId);
  const json = (value) => `$demo$${JSON.stringify(value)}$demo$::jsonb`;
  runLocalSql(`
    begin;
    do $guard$
    declare relation_name text;
    begin
      foreach relation_name in array array[
        'profiles','businesses','business_members','business_services','business_targets','opportunities','opportunity_actions','opportunity_documents','opportunity_events',
        'crm_organizations','crm_contacts','opportunity_contacts','commercial_signals','commercial_signal_events','commercial_responses','data_import_batches',
        'onboarding_drafts','saved_views','product_events','business_governance_policies','business_invitations','business_approval_requests','business_audit_events'
      ] loop
        if not (select relrowsecurity from pg_class where oid = format('public.%I', relation_name)::regclass) then
          raise exception 'Demo grant refused: RLS disabled on public.%', relation_name;
        end if;
      end loop;
    end $guard$;
    grant usage on schema public to authenticated;
    grant select on
      public.profiles,public.businesses,public.business_members,public.business_services,public.business_targets,
      public.opportunities,public.opportunity_actions,public.opportunity_documents,public.opportunity_events,
      public.crm_organizations,public.crm_contacts,public.opportunity_contacts,
      public.commercial_signals,public.commercial_signal_events,public.commercial_responses,public.data_import_batches,
      public.onboarding_drafts,public.saved_views,public.product_events,
      public.business_governance_policies,public.business_invitations,public.business_approval_requests,public.business_audit_events
      to authenticated;
    grant insert, update on public.commercial_signals to authenticated;
    grant insert on public.commercial_signal_events to authenticated;
    delete from public.businesses where id = '${DEMO.businessId}';
    insert into public.profiles (id,user_id,full_name,email,role)
    values ('${profileId}','${user.id}','Operator Demo ReveNew','${DEMO.email}','business_owner')
    on conflict (id) do update set user_id=excluded.user_id,full_name=excluded.full_name,email=excluded.email,role=excluded.role,updated_at=now();
    insert into public.businesses (id,owner_profile_id,name,legal_name,industry,city,county,country_code,notification_email,current_sales_process)
    values ('${DEMO.businessId}','${profileId}','${DEMO.businessName}','Meridian Commercial Operations SRL [FICTIV]','Servicii B2B și management operațional','București','București','RO','${DEMO.email}','${DEMO.marker}: demonstrație locală, control uman obligatoriu.');
    insert into public.business_members (business_id,profile_id,role,status) values ('${DEMO.businessId}','${profileId}','owner','active');
    insert into public.business_services (business_id,name,description) values
      ('${DEMO.businessId}','Revenue Recovery','Identificare și urmărire disciplinată a oportunităților subutilizate.'),
      ('${DEMO.businessId}','Control comercial','Ownership, next action și auditabilitate pentru echipe B2B.');
    insert into public.business_targets (business_id,target_type,value) values
      ('${DEMO.businessId}','industry','Servicii B2B'),('${DEMO.businessId}','city','București'),('${DEMO.businessId}','customer','Companii cu procese comerciale recurente');
    insert into public.business_governance_policies (business_id,live_email_approval_policy,outcome_approval_policy,assignment_policy,updated_by_profile_id)
    values ('${DEMO.businessId}','manager_required','member_confirmation','members_self_assign','${profileId}')
    on conflict (business_id) do update set live_email_approval_policy=excluded.live_email_approval_policy,outcome_approval_policy=excluded.outcome_approval_policy,assignment_policy=excluded.assignment_policy,updated_by_profile_id=excluded.updated_by_profile_id;

    insert into public.crm_organizations (id,business_id,name,normalized_name,industry,city,country,relationship_status,notes)
    select id,business_id,name,normalized_name,industry,city,country,relationship_status,notes
    from jsonb_to_recordset(${json(fixtures.organizations)}) as x(id uuid,business_id uuid,name text,normalized_name text,industry text,city text,country text,relationship_status text,notes text);

    insert into public.crm_contacts (id,business_id,organization_id,full_name,normalized_name,job_title,decision_role,email,normalized_email,is_active,is_primary_for_organization,notes)
    select id,business_id,organization_id,full_name,normalized_name,job_title,decision_role,email,normalized_email,is_active,is_primary_for_organization,notes
    from jsonb_to_recordset(${json(fixtures.contacts)}) as x(id uuid,business_id uuid,organization_id uuid,full_name text,normalized_name text,job_title text,decision_role text,email text,normalized_email text,is_active boolean,is_primary_for_organization boolean,notes text);

    insert into public.opportunities (id,business_id,organization_id,title,type,status,lifecycle_status,commercial_type,owner_profile_id,currency,estimated_value_low,estimated_value_high,deadline,fit_score,urgency_score,money_score,confidence_score,summary,relevance,risks,recommended_action,created_at,updated_at,actual_outcome_amount,outcome_date,outcome_reason,outcome_note,outcome_recorded_by_profile_id,outcome_recorded_at)
    select id,business_id,organization_id,title,type,status,lifecycle_status,commercial_type,owner_profile_id,currency,estimated_value_low,estimated_value_high,deadline,fit_score,urgency_score,money_score,confidence_score,summary,relevance,risks,recommended_action,created_at,updated_at,actual_outcome_amount,outcome_date,outcome_reason,outcome_note,outcome_recorded_by_profile_id,outcome_recorded_at
    from jsonb_to_recordset(${json(fixtures.opportunities)}) as x(id uuid,business_id uuid,organization_id uuid,title text,type text,status text,lifecycle_status text,commercial_type text,owner_profile_id uuid,currency text,estimated_value_low numeric,estimated_value_high numeric,deadline date,fit_score int,urgency_score int,money_score int,confidence_score int,summary text,relevance jsonb,risks jsonb,recommended_action text,created_at timestamptz,updated_at timestamptz,actual_outcome_amount numeric,outcome_date date,outcome_reason text,outcome_note text,outcome_recorded_by_profile_id uuid,outcome_recorded_at timestamptz);

    insert into public.opportunity_contacts (id,business_id,opportunity_id,contact_id,role,is_primary)
    select id,business_id,opportunity_id,contact_id,role,is_primary
    from jsonb_to_recordset(${json(fixtures.opportunityContacts)}) as x(id uuid,business_id uuid,opportunity_id uuid,contact_id uuid,role text,is_primary boolean);

    insert into public.opportunity_actions (id,business_id,opportunity_id,title,type,priority,status,description,due_at,assigned_to_profile_id,completed_at,cancelled_at,created_at)
    select id,business_id,opportunity_id,title,type,priority,status,description,due_at,assigned_to_profile_id,completed_at,cancelled_at,created_at
    from jsonb_to_recordset(${json(fixtures.actions)}) as x(id uuid,business_id uuid,opportunity_id uuid,title text,type text,priority text,status text,description text,due_at timestamptz,assigned_to_profile_id uuid,completed_at timestamptz,cancelled_at timestamptz,created_at timestamptz);

    insert into public.opportunity_events (id,business_id,opportunity_id,actor_profile_id,event_type,label,description,occurred_at,metadata)
    select id,business_id,opportunity_id,actor_profile_id,event_type,label,description,occurred_at,metadata
    from jsonb_to_recordset(${json(fixtures.events)}) as x(id uuid,business_id uuid,opportunity_id uuid,actor_profile_id uuid,event_type text,label text,description text,occurred_at timestamptz,metadata jsonb);

    insert into public.opportunity_documents (id,business_id,opportunity_id,document_type,title,body,status,generation_mode)
    select id,business_id,opportunity_id,document_type,title,body,status,generation_mode
    from jsonb_to_recordset(${json(fixtures.documents)}) as x(id uuid,business_id uuid,opportunity_id uuid,document_type text,title text,body text,status text,generation_mode text);

    insert into public.commercial_signals (
      id,business_id,title,source,source_label,status,review_status,priority,analysis_status,analysis_mode,
      contact_company,contact_name,contact_email,raw_message,extracted_summary,currency,urgency_score,fit_score,confidence_score,
      recommended_action,created_by_profile_id,assigned_to_profile_id,occurred_at,created_at,matched_organization_id,matched_contact_id,
      detected_from_opportunity_id,converted_opportunity_id,estimated_value_min,estimated_value_max,estimated_recoverable_value,
      recoverability_score,confidence_level,urgency_level,primary_recovery_reason,analysis_explanation,missing_information,
      uncertainty_notes,suggested_due_date,analyzed_at,reviewed_at,dismissal_reason,ingestion_origin,review_due_at
    )
    select id,business_id,title,source,source_label,status,review_status,priority,analysis_status,analysis_mode,
      contact_company,contact_name,contact_email,raw_message,extracted_summary,currency,urgency_score,fit_score,confidence_score,
      recommended_action,created_by_profile_id,assigned_to_profile_id,occurred_at,created_at,matched_organization_id,matched_contact_id,
      detected_from_opportunity_id,converted_opportunity_id,estimated_value_min,estimated_value_max,estimated_recoverable_value,
      recoverability_score,confidence_level,urgency_level,primary_recovery_reason,analysis_explanation,missing_information,
      uncertainty_notes,suggested_due_date,analyzed_at,reviewed_at,dismissal_reason,ingestion_origin,review_due_at
    from jsonb_to_recordset(${json(fixtures.signals)}) as x(
      id uuid,business_id uuid,title text,source text,source_label text,status text,review_status text,priority text,analysis_status text,analysis_mode text,
      contact_company text,contact_name text,contact_email text,raw_message text,extracted_summary text,currency text,urgency_score int,fit_score int,confidence_score int,
      recommended_action text,created_by_profile_id uuid,assigned_to_profile_id uuid,occurred_at timestamptz,created_at timestamptz,matched_organization_id uuid,matched_contact_id uuid,
      detected_from_opportunity_id uuid,converted_opportunity_id uuid,estimated_value_min numeric,estimated_value_max numeric,estimated_recoverable_value numeric,
      recoverability_score int,confidence_level text,urgency_level text,primary_recovery_reason text,analysis_explanation text,missing_information jsonb,
      uncertainty_notes jsonb,suggested_due_date date,analyzed_at timestamptz,reviewed_at timestamptz,dismissal_reason text,ingestion_origin text,review_due_at timestamptz
    );

    insert into public.commercial_signal_events (id,business_id,signal_id,event_type,description,metadata,created_by_profile_id,created_at)
    select id,business_id,signal_id,event_type,description,metadata,created_by_profile_id,created_at
    from jsonb_to_recordset(${json(fixtures.signalEvents)}) as x(id uuid,business_id uuid,signal_id uuid,event_type text,description text,metadata jsonb,created_by_profile_id uuid,created_at timestamptz);
    commit;
  `);

  console.log("Demo local ReveNew pregătit: 1 workspace, 8 companii, 8 contacte, 11 oportunități, 12 acțiuni și 10 semnale comerciale.");
  console.log("Nicio acțiune externă, trimitere de email sau apel AI nu a fost executată.");
}

main().catch((error) => {
  console.error(`Seed demo eșuat: ${error.message}`);
  process.exitCode = 1;
});
