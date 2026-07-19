import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createLocalAdminClient, runLocalSql } from "./local-supabase.mjs";
import { DEMO } from "./fixtures.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sourceIntakeFingerprint(row) {
  const normalized = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ro-RO").replace(/\s+/g, " ").trim();
  return createHash("sha256").update([
    normalized(row.source_label), row.source_type || "csv_import", normalized(row.title), normalized(row.company),
    normalized(row.contact), String(row.email ?? "").toLocaleLowerCase("ro-RO"), String(row.phone ?? "").replace(/[^+\d]/g, ""),
    row.estimated_value ?? "", row.currency || "RON", String(row.last_interaction_at ?? "").slice(0, 10),
    String(row.requested_date ?? "").slice(0, 10), normalized(row.context), normalized(row.source_reference)
  ].join("\u001f")).digest("hex");
}

async function verifyTenantIsolation(admin, local) {
  const suffix = randomBytes(8).toString("hex");
  const email = `tenant-${suffix}@revenew-demo.test`;
  const password = randomBytes(24).toString("base64url");
  const profileId = randomUUID();
  const businessId = randomUUID();
  let userId;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? "utilizator temporar invalid");
    userId = created.data.user.id;
    runLocalSql(`begin;
      insert into public.profiles(id,user_id,full_name,email,role) values ('${profileId}','${userId}','Tenant Isolation Test','${email}',null);
      insert into public.businesses(id,owner_profile_id,name) values ('${businessId}','${profileId}','[TEST] Tenant Isolation');
      insert into public.business_members(business_id,profile_id,role,status) values ('${businessId}','${profileId}','owner','active');
      commit;`);
    const userClient = createClient(local.apiUrl, local.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const login = await userClient.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error(`Autentificarea tenantului temporar a eșuat: ${login.error.message}`);
    const foreignBusiness = await userClient.from("businesses").select("id").eq("id", DEMO.businessId);
    const foreignOpportunity = await userClient.from("opportunities").select("id").eq("business_id", DEMO.businessId);
    const foreignSignal = await userClient.from("commercial_signals").select("id").eq("business_id", DEMO.businessId);
    if (foreignBusiness.error || foreignOpportunity.error || foreignSignal.error) {
      throw new Error(`Interogarea RLS temporară a eșuat (${foreignBusiness.error?.code ?? "ok"}/${foreignOpportunity.error?.code ?? "ok"}/${foreignSignal.error?.code ?? "ok"}).`);
    }
    assert(foreignBusiness.data.length === 0, "RLS a expus workspace-ul demo altui tenant.");
    assert(foreignOpportunity.data.length === 0, "RLS a expus oportunități altui tenant.");
    assert(foreignSignal.data.length === 0, "RLS a expus semnale comerciale altui tenant.");
  } finally {
    runLocalSql(`delete from public.businesses where id='${businessId}'; delete from public.profiles where id='${profileId}';`);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
}

async function verifySourceIntakeAuthorization(admin, local) {
  const suffix = randomBytes(8).toString("hex");
  const email = `intake-${suffix}@revenew-demo.test`;
  const password = randomBytes(24).toString("base64url");
  const profileId = randomUUID();
  const businessId = randomUUID();
  let userId;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? "utilizator temporar invalid");
    userId = created.data.user.id;
    runLocalSql(`begin;
      insert into public.profiles(id,user_id,full_name,email,role) values ('${profileId}','${userId}','Source Intake Test','${email}',null);
      insert into public.businesses(id,owner_profile_id,name) values ('${businessId}','${profileId}','[TEST] Source Intake');
      insert into public.business_members(business_id,profile_id,role,status) values ('${businessId}','${profileId}','owner','active');
      commit;`);
    const userClient = createClient(local.apiUrl, local.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const login = await userClient.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error(`Autentificarea Source Intake a eșuat: ${login.error.message}`);
    const row = {
      row_number: 2, row_fingerprint: "", source_label: "Email copiat", source_type: "email",
      title: "'=SUM(A1:A2) Semnal importat controlat", company: "[TEST] Companie", contact: "Contact Test",
      email: "", phone: "", estimated_value: "12500", currency: "RON", last_interaction_at: "",
      requested_date: "2026-07-31T00:00:00.000Z", context: "'@Text simplu pentru revizuire umană.",
      status_label: "", owner_label: "", owner_profile_id: profileId, source_reference: `INTAKE-${suffix}`,
      probable_signal_match: false, probable_company_match: false, probable_contact_match: false, probable_opportunity_match: false
    };
    row.row_fingerprint = sourceIntakeFingerprint(row);
    const fingerprint = row.row_fingerprint;
    const imported = await userClient.rpc("import_commercial_signal_batch", {
      target_business_id: businessId,
      source_file_name: `intake-bulk-${suffix}.csv`,
      batch_fingerprint: randomBytes(32).toString("hex"),
      accepted_rows: [row],
      rejected_rows: []
    });
    assert(!imported.error && Number(imported.data?.created) === 1, `Importul autorizat a eșuat: ${imported.error?.message ?? "răspuns invalid"}`);
    const state = runLocalSql(`select json_build_object(
      'pending_count', (select count(*) from public.commercial_signals where business_id='${businessId}' and ingestion_fingerprint='${fingerprint}' and source='email' and status='new' and review_status='new' and analysis_status='not_started' and requested_date='2026-07-31T00:00:00.000Z'::timestamptz and converted_opportunity_id is null),
      'neutralized_count', (select count(*) from public.commercial_signals where business_id='${businessId}' and ingestion_fingerprint='${fingerprint}' and title like '''=%' and raw_message like '''@%'),
      'audit_count', (select count(*) from public.commercial_signal_events e join public.commercial_signals s on s.id=e.signal_id where s.business_id='${businessId}' and s.ingestion_fingerprint='${fingerprint}' and e.event_type='signal_imported'),
      'automatic_event_count', (select count(*) from public.commercial_signal_events e join public.commercial_signals s on s.id=e.signal_id where s.business_id='${businessId}' and s.ingestion_fingerprint='${fingerprint}' and e.event_type in ('analysis_completed','signal_approved','signal_converted'))
    );`, { json: true });
    assert(Number(state.pending_count) === 1 && Number(state.audit_count) === 1, "Importul nu a păstrat starea pending, sursa, termenul și auditul.");
    assert(Number(state.neutralized_count) === 1, "Conținutul de tip formulă nu a rămas neutralizat la limita bazei de date.");
    assert(Number(state.automatic_event_count) === 0, "Importul a pornit automat analiza, aprobarea sau conversia.");
    const unsafeRow = { ...row, row_number: 3, title: "=Formula neprotejata", row_fingerprint: randomBytes(32).toString("hex") };
    const unsafeImport = await userClient.rpc("import_commercial_signal_batch", {
      target_business_id: businessId,
      source_file_name: `intake-unsafe-${suffix}.csv`,
      batch_fingerprint: randomBytes(32).toString("hex"),
      accepted_rows: [unsafeRow],
      rejected_rows: []
    });
    assert(Boolean(unsafeImport.error), "RPC-ul a acceptat text de tip formulă nenormalizat sau un fingerprint falsificat.");
    const unsafeWrites = runLocalSql(`select count(*) from public.data_import_batches where business_id='${businessId}' and file_name='intake-unsafe-${suffix}.csv';`);
    assert(Number(unsafeWrites) === 0, "Validarea RPC eșuată a lăsat o scriere parțială.");
    const demoBefore = runLocalSql(`select count(*) from public.commercial_signals where business_id='${DEMO.businessId}';`);
    const crossTenant = await userClient.rpc("import_commercial_signal_batch", {
      target_business_id: DEMO.businessId,
      source_file_name: `intake-cross-${suffix}.csv`,
      batch_fingerprint: randomBytes(32).toString("hex"),
      accepted_rows: [{ ...row, row_fingerprint: randomBytes(32).toString("hex") }],
      rejected_rows: []
    });
    assert(Boolean(crossTenant.error), "Source Intake a permis scrierea într-un alt workspace.");
    const demoAfter = runLocalSql(`select count(*) from public.commercial_signals where business_id='${DEMO.businessId}';`);
    assert(demoAfter === demoBefore, "Încercarea Source Intake cross-tenant a modificat workspace-ul demo.");
  } finally {
    runLocalSql(`delete from public.businesses where id='${businessId}'; delete from public.profiles where id='${profileId}';`);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
}

async function verifySignalConversionAuthorization(admin, local) {
  const suffix = randomBytes(8).toString("hex");
  const email = `conversion-${suffix}@revenew-demo.test`;
  const password = randomBytes(24).toString("base64url");
  const profileId = randomUUID();
  const businessId = randomUUID();
  const newSignalId = randomUUID();
  const detectedSignalId = randomUUID();
  const foreignOrganizationSignalId = randomUUID();
  const foreignContactSignalId = randomUUID();
  const foreignOpportunitySignalId = randomUUID();
  let userId;

  const foreign = runLocalSql(`select json_build_object(
    'signal_id', (select id from public.commercial_signals where business_id='${DEMO.businessId}' and analysis_status='completed' and review_status='ready_for_review' limit 1),
    'organization_id', (select id from public.crm_organizations where business_id='${DEMO.businessId}' limit 1),
    'contact_id', (select id from public.crm_contacts where business_id='${DEMO.businessId}' limit 1),
    'opportunity_id', (select id from public.opportunities where business_id='${DEMO.businessId}' and lifecycle_status='open' limit 1)
  );`, { json: true });
  assert(foreign.signal_id && foreign.organization_id && foreign.contact_id && foreign.opportunity_id, "Fixturele cross-tenant pentru conversie lipsesc.");

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? "utilizator temporar invalid");
    userId = created.data.user.id;

    runLocalSql(`begin;
      insert into public.profiles(id,user_id,full_name,email,role)
      values ('${profileId}','${userId}','Signal Conversion Test','${email}',null);
      insert into public.businesses(id,owner_profile_id,name)
      values ('${businessId}','${profileId}','[TEST] Signal Conversion');
      insert into public.business_members(business_id,profile_id,role,status)
      values ('${businessId}','${profileId}','owner','active');
      insert into public.commercial_signals(
        id,business_id,title,source,status,review_status,analysis_status,analysis_mode,
        raw_message,recommended_action,currency,recoverability_score,urgency_level,
        created_by_profile_id,assigned_to_profile_id
      ) values
        ('${newSignalId}','${businessId}','Semnal pentru oportunitate nouă','manual','ready_for_review','ready_for_review','completed','deterministic_fallback','Context verificabil pentru conversie.','Confirmă următorul pas.','RON',72,'medium','${profileId}','${profileId}'),
        ('${foreignOrganizationSignalId}','${businessId}','Companie din alt workspace','manual','ready_for_review','ready_for_review','completed','deterministic_fallback','Test izolare companie.','Verifică asocierea.','RON',60,'low','${profileId}','${profileId}'),
        ('${foreignContactSignalId}','${businessId}','Contact din alt workspace','manual','ready_for_review','ready_for_review','completed','deterministic_fallback','Test izolare contact.','Verifică asocierea.','RON',60,'low','${profileId}','${profileId}'),
        ('${foreignOpportunitySignalId}','${businessId}','Oportunitate din alt workspace','manual','ready_for_review','ready_for_review','completed','deterministic_fallback','Test izolare oportunitate.','Verifică asocierea.','RON',60,'low','${profileId}','${profileId}');
      update public.commercial_signals
      set detected_from_opportunity_id='${foreign.opportunity_id}'
      where id='${foreignOpportunitySignalId}';
      commit;`);

    const userClient = createClient(local.apiUrl, local.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const login = await userClient.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error(`Autentificarea verificării de conversie a eșuat: ${login.error.message}`);

    const approveNew = await userClient.rpc("approve_recoverable_signal", {
      target_signal_id: newSignalId,
      selected_organization_id: null,
      selected_contact_id: null,
      new_organization_name: "[TEST] Companie conversie",
      new_contact_name: "Contact Conversie",
      new_contact_email: `contact-${suffix}@revenew-demo.test`,
      new_contact_phone: null,
      selected_owner_profile_id: profileId,
      selected_due_at: new Date(Date.now() + 86_400_000).toISOString(),
      reviewed_action: "Confirmă următorul pas comercial.",
      reviewed_draft: null
    });
    assert(!approveNew.error && approveNew.data?.opportunity_id, `Membrul autorizat nu a putut crea oportunitatea: ${approveNew.error?.message ?? "răspuns invalid"}`);
    const opportunityId = approveNew.data.opportunity_id;
    const successfulNew = runLocalSql(`select json_build_object(
      'opportunity_count', (select count(*) from public.opportunities where id='${opportunityId}' and business_id='${businessId}'),
      'action_count', (select count(*) from public.opportunity_actions where opportunity_id='${opportunityId}' and business_id='${businessId}'),
      'signal_converted', (select count(*) from public.commercial_signals where id='${newSignalId}' and business_id='${businessId}' and status='converted' and converted_opportunity_id='${opportunityId}'),
      'audit_count', (select count(*) from public.commercial_signal_events where signal_id='${newSignalId}' and business_id='${businessId}' and event_type in ('signal_approved','signal_converted'))
    );`, { json: true });
    assert(Number(successfulNew.opportunity_count) === 1 && Number(successfulNew.action_count) === 1, "Conversia autorizată nu a creat oportunitatea și acțiunea în același workspace.");
    assert(Number(successfulNew.signal_converted) === 1 && Number(successfulNew.audit_count) === 2, "Starea și auditul conversiei autorizate sunt incomplete.");

    runLocalSql(`insert into public.commercial_signals(
      id,business_id,title,source,status,review_status,analysis_status,analysis_mode,
      raw_message,recommended_action,currency,recoverability_score,urgency_level,
      created_by_profile_id,assigned_to_profile_id,detected_from_opportunity_id
    ) values (
      '${detectedSignalId}','${businessId}','Semnal pentru acțiune nouă','manual','ready_for_review','ready_for_review','completed','deterministic_fallback',
      'Context pentru oportunitatea existentă.','Continuă follow-up-ul.','RON',68,'medium','${profileId}','${profileId}','${opportunityId}'
    );`);
    const approveDetected = await userClient.rpc("approve_detected_recoverable_signal", {
      target_signal_id: detectedSignalId,
      selected_owner_profile_id: profileId,
      selected_due_at: new Date(Date.now() + 172_800_000).toISOString(),
      reviewed_action: "Continuă follow-up-ul verificat.",
      reviewed_draft: null
    });
    assert(!approveDetected.error && approveDetected.data?.opportunity_id === opportunityId, `Membrul autorizat nu a putut crea acțiunea: ${approveDetected.error?.message ?? "răspuns invalid"}`);
    const successfulDetected = runLocalSql(`select json_build_object(
      'action_count', (select count(*) from public.opportunity_actions where opportunity_id='${opportunityId}' and business_id='${businessId}'),
      'signal_converted', (select count(*) from public.commercial_signals where id='${detectedSignalId}' and status='converted' and converted_opportunity_id='${opportunityId}'),
      'audit_count', (select count(*) from public.commercial_signal_events where signal_id='${detectedSignalId}' and event_type in ('signal_approved','signal_converted'))
    );`, { json: true });
    assert(Number(successfulDetected.action_count) === 2, "Conversia pe oportunitatea existentă nu a creat exact o acțiune nouă.");
    assert(Number(successfulDetected.signal_converted) === 1 && Number(successfulDetected.audit_count) === 2, "Conversia acțiunii nu a actualizat tranzacțional starea și auditul.");

    const demoBefore = runLocalSql(`select json_build_object(
      'status', (select status from public.commercial_signals where id='${foreign.signal_id}'),
      'event_count', (select count(*) from public.commercial_signal_events where signal_id='${foreign.signal_id}')
    );`, { json: true });
    const crossTenantSignal = await userClient.rpc("approve_recoverable_signal", { target_signal_id: foreign.signal_id });
    assert(Boolean(crossTenantSignal.error), "Un utilizator neautorizat a convertit semnalul altui tenant.");

    const crossOrganization = await userClient.rpc("approve_recoverable_signal", {
      target_signal_id: foreignOrganizationSignalId,
      selected_organization_id: foreign.organization_id
    });
    const crossContact = await userClient.rpc("approve_recoverable_signal", {
      target_signal_id: foreignContactSignalId,
      selected_contact_id: foreign.contact_id
    });
    const crossOpportunity = await userClient.rpc("approve_detected_recoverable_signal", {
      target_signal_id: foreignOpportunitySignalId
    });
    assert(Boolean(crossOrganization.error), "RPC-ul a acceptat o companie din alt workspace.");
    assert(Boolean(crossContact.error), "RPC-ul a acceptat un contact din alt workspace.");
    assert(Boolean(crossOpportunity.error), "RPC-ul a acceptat o oportunitate din alt workspace.");

    const failedState = runLocalSql(`select json_build_object(
      'unchanged_signals', (select count(*) from public.commercial_signals where id in ('${foreignOrganizationSignalId}','${foreignContactSignalId}','${foreignOpportunitySignalId}') and business_id='${businessId}' and status='ready_for_review' and review_status='ready_for_review' and converted_opportunity_id is null),
      'failed_event_count', (select count(*) from public.commercial_signal_events where signal_id in ('${foreignOrganizationSignalId}','${foreignContactSignalId}','${foreignOpportunitySignalId}')),
      'demo_status', (select status from public.commercial_signals where id='${foreign.signal_id}'),
      'demo_event_count', (select count(*) from public.commercial_signal_events where signal_id='${foreign.signal_id}')
    );`, { json: true });
    assert(Number(failedState.unchanged_signals) === 3 && Number(failedState.failed_event_count) === 0, "O conversie eșuată a modificat starea sau auditul semnalului.");
    assert(failedState.demo_status === demoBefore.status && Number(failedState.demo_event_count) === Number(demoBefore.event_count), "Încercarea cross-tenant a modificat semnalul sau auditul workspace-ului demo.");
  } finally {
    runLocalSql(`delete from public.businesses where id='${businessId}'; delete from public.profiles where id='${profileId}';`);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  const { client: admin, local } = createLocalAdminClient();
  const stats = runLocalSql(`
    select json_build_object(
      'business_count', (select count(*) from public.businesses where id = '${DEMO.businessId}' and name = '${DEMO.businessName.replaceAll("'", "''")}'),
      'identity_count', (select count(*) from public.profiles p join auth.users u on u.id=p.user_id where p.email='${DEMO.email}' and u.email='${DEMO.email}'),
      'organization_count', (select count(*) from public.crm_organizations where business_id = '${DEMO.businessId}'),
      'marked_organization_count', (select count(*) from public.crm_organizations where business_id = '${DEMO.businessId}' and name like '[DEMO]%'),
      'contact_count', (select count(*) from public.crm_contacts where business_id = '${DEMO.businessId}'),
      'test_contact_count', (select count(*) from public.crm_contacts where business_id = '${DEMO.businessId}' and email like '%.test'),
      'multi_contact_organization_count', (select count(*) from (select organization_id from public.crm_contacts where business_id='${DEMO.businessId}' group by organization_id having count(*) > 1) grouped),
      'opportunity_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}'),
      'ron_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and currency = 'RON'),
      'won_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and lifecycle_status = 'won' and actual_outcome_amount > 0),
      'lost_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and lifecycle_status = 'lost' and actual_outcome_amount is null),
      'action_count', (select count(*) from public.opportunity_actions where business_id = '${DEMO.businessId}'),
      'overdue_count', (select count(*) from public.opportunity_actions where business_id = '${DEMO.businessId}' and status = 'pending' and due_at < now()),
      'missing_next_action_count', (select count(*) from public.opportunities o where o.business_id='${DEMO.businessId}' and o.lifecycle_status='open' and not exists (select 1 from public.opportunity_actions a where a.opportunity_id=o.id and a.status='pending')),
      'unassigned_count', (select count(*) from public.opportunities where business_id='${DEMO.businessId}' and lifecycle_status='open' and owner_profile_id is null),
      'event_count', (select count(*) from public.opportunity_events where business_id = '${DEMO.businessId}' and actor_profile_id is not null),
      'document_count', (select count(*) from public.opportunity_documents where business_id = '${DEMO.businessId}' and generation_mode = 'local_fallback'),
      'owner_count', (select count(*) from public.business_members where business_id = '${DEMO.businessId}' and role = 'owner' and status = 'active')
      ,'signal_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}')
      ,'signal_review_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and review_status in ('new','ready_for_review','postponed'))
      ,'signal_linked_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and (matched_organization_id is not null or detected_from_opportunity_id is not null))
      ,'signal_converted_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and status = 'converted' and converted_opportunity_id is not null)
      ,'signal_event_count', (select count(*) from public.commercial_signal_events where business_id = '${DEMO.businessId}')
      ,'external_signal_source_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and source in ('ai_receptionist','instagram','website_form','missed_call'))
      ,'signal_intent_type_count', (select count(distinct note) from public.commercial_signals s cross join lateral jsonb_array_elements_text(coalesce(s.uncertainty_notes, '[]'::jsonb)) note where s.business_id = '${DEMO.businessId}' and note like 'SIGNAL_TYPE: %')
      ,'signal_deadline_clue_count', (select count(*) from public.commercial_signals s cross join lateral jsonb_array_elements_text(coalesce(s.uncertainty_notes, '[]'::jsonb)) note where s.business_id = '${DEMO.businessId}' and note like 'DEADLINE_CLUE: %')
      ,'signal_value_clue_count', (select count(*) from public.commercial_signals s cross join lateral jsonb_array_elements_text(coalesce(s.uncertainty_notes, '[]'::jsonb)) note where s.business_id = '${DEMO.businessId}' and note like 'VALUE_CLUE: %')
      ,'signal_gap_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and jsonb_array_length(coalesce(missing_information, '[]'::jsonb)) > 0)
      ,'approval_pending_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and review_status in ('ready_for_review','postponed'))
      ,'approval_applied_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and (review_status = 'converted' or status = 'converted'))
      ,'approval_rejected_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and (review_status in ('dismissed','duplicate') or status in ('dismissed','duplicate','ignored','archived')))
      ,'ai_preparation_fallback_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and analysis_status = 'completed' and analysis_mode = 'deterministic_fallback')
      ,'ai_preparation_provider_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and analysis_mode = 'ai')
      ,'ai_preparation_pending_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and analysis_status = 'completed' and review_status in ('ready_for_review','postponed'))
      ,'recommendation_feedback_pending_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and analysis_status = 'completed' and review_status in ('ready_for_review','postponed'))
      ,'recommendation_feedback_applied_count', (select count(*) from public.commercial_signal_events where business_id = '${DEMO.businessId}' and event_type = 'recommendation_feedback_recorded' and metadata->>'feedback_state' = 'accepted_as_is')
      ,'recommendation_feedback_edited_count', (select count(*) from public.commercial_signal_events where business_id = '${DEMO.businessId}' and event_type = 'analysis_review_edited')
      ,'recommendation_feedback_rejected_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and analysis_status = 'completed' and review_status in ('dismissed','duplicate') and nullif(btrim(dismissal_reason), '') is not null)
      ,'recommendation_feedback_external_action_count', (select count(*) from public.commercial_signal_events where business_id = '${DEMO.businessId}' and event_type in ('recommendation_feedback_recorded','analysis_review_edited') and coalesce((metadata->>'external_action')::boolean, false) = true)
      ,'source_intake_pending_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and ingestion_origin = 'csv_import' and source_label = 'Import controlat · text în bloc' and status = 'new' and review_status = 'new' and analysis_status = 'not_started' and converted_opportunity_id is null)
      ,'source_intake_automatic_decision_count', (select count(*) from public.commercial_signals where business_id = '${DEMO.businessId}' and ingestion_origin = 'csv_import' and (analysis_status <> 'not_started' or review_status not in ('new','ready_for_review','postponed') or converted_opportunity_id is not null))
    );
  `, { json: true });
  assert(Number(stats.business_count) === 1, "Workspace-ul demo lipsește sau nu este unic.");
  assert(Number(stats.identity_count) === 1, "Lanțul Auth → profil demo este invalid.");
  assert(Number(stats.organization_count) === 8 && Number(stats.marked_organization_count) === 8, "Sunt necesare exact 8 companii marcate demo.");
  assert(Number(stats.contact_count) === 8 && Number(stats.test_contact_count) === 8 && Number(stats.multi_contact_organization_count) === 1, "Contactele demo nu respectă contractul local.");
  assert(Number(stats.opportunity_count) === 11 && Number(stats.ron_count) === 11, "Oportunitățile sau moneda demo sunt invalide.");
  assert(Number(stats.won_count) === 1 && Number(stats.lost_count) === 1, "Rezultatele terminale demo sunt invalide.");
  assert(Number(stats.action_count) === 12 && Number(stats.overdue_count) > 0, "Coada de lucru nu conține acțiuni restante.");
  assert(Number(stats.missing_next_action_count) > 0 && Number(stats.unassigned_count) > 0, "Lipsesc scenariile Recovery Queue obligatorii.");
  assert(Number(stats.event_count) >= 10, "Evenimentele nu sunt complet auditabile.");
  assert(Number(stats.document_count) === 4, "Documentele demo nu sunt exclusiv locale.");
  assert(Number(stats.owner_count) === 1, "Ownership-ul demo este invalid.");
  assert(Number(stats.signal_count) === 10, "Demo-ul trebuie să conțină exact 10 semnale comerciale.");
  assert(Number(stats.signal_review_count) > 0 && Number(stats.signal_linked_count) > 0, "Semnalele demo nu acoperă revizuirea și legarea.");
  assert(Number(stats.signal_converted_count) > 0 && Number(stats.signal_event_count) >= 10, "Conversia și auditul semnalelor demo sunt incomplete.");
  assert(Number(stats.external_signal_source_count) === 0, "Demo-ul nu trebuie să sugereze conectori externi activi.");
  assert(Number(stats.signal_intent_type_count) >= 4, "Demo-ul nu acoperă suficiente tipuri de semnale determinate prin reguli.");
  assert(Number(stats.signal_deadline_clue_count) > 0 && Number(stats.signal_value_clue_count) > 0, "Demo-ul nu acoperă indicii verificabile de termen și valoare.");
  assert(Number(stats.signal_gap_count) > 0, "Demo-ul nu acoperă informații comerciale lipsă.");
  assert(Number(stats.approval_pending_count) > 0, "Approval Center nu are recomandări demo în așteptare.");
  assert(Number(stats.approval_applied_count) > 0, "Approval Center nu are o decizie demo aplicată.");
  assert(Number(stats.approval_rejected_count) > 0, "Approval Center nu are o decizie demo respinsă.");
  assert(Number(stats.ai_preparation_fallback_count) > 0, "Demo-ul local nu acoperă pregătirea structurată prin fallback local.");
  assert(Number(stats.ai_preparation_provider_count) === 0, "Demo-ul local nu trebuie să pretindă utilizarea unui provider AI.");
  assert(Number(stats.ai_preparation_pending_count) > 0, "Pregătirea demo trebuie să rămână în așteptarea aprobării umane.");
  assert(Number(stats.recommendation_feedback_pending_count) > 0, "Feedback-ul demo nu acoperă recomandările în așteptare.");
  assert(Number(stats.recommendation_feedback_applied_count) > 0, "Feedback-ul demo nu acoperă o recomandare acceptată și aplicată.");
  assert(Number(stats.recommendation_feedback_edited_count) > 0, "Feedback-ul demo nu acoperă o recomandare editată înainte de aprobare.");
  assert(Number(stats.recommendation_feedback_rejected_count) > 0, "Feedback-ul demo nu păstrează motivul unei respingeri.");
  assert(Number(stats.recommendation_feedback_external_action_count) === 0, "Feedback-ul demo nu poate reprezenta o acțiune externă automată.");
  assert(Number(stats.source_intake_pending_count) > 0, "Demo-ul local nu acoperă un semnal importat controlat și rămas în așteptarea revizuirii.");
  assert(Number(stats.source_intake_automatic_decision_count) === 0, "Source Intake nu poate porni automat analiza, aprobarea sau conversia.");
  await verifyTenantIsolation(admin, local);
  await verifySourceIntakeAuthorization(admin, local);
  await verifySignalConversionAuthorization(admin, local);
  console.log("Verificare demo reușită: structură, semnale comerciale, relații, rezultate, coadă operațională și izolare RLS validate.");
}

main().catch((error) => {
  console.error(`Verificare demo eșuată: ${error.message}`);
  process.exitCode = 1;
});
