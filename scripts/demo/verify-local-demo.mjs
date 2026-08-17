import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createLocalAdminClient, runLocalSql } from "./local-supabase.mjs";
import { buildFixtures, DEMO } from "./fixtures.mjs";
import { assertDemoStoryInvariants } from "./story-contracts.mjs";

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
  const opportunityId = randomUUID();
  const actionIds = [randomUUID(), randomUUID(), randomUUID()];
  let userId;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? "utilizator temporar invalid");
    userId = created.data.user.id;
    runLocalSql(`begin;
      insert into public.profiles(id,user_id,full_name,email,role) values ('${profileId}','${userId}','Tenant Isolation Test','${email}',null);
      insert into public.businesses(id,owner_profile_id,name) values ('${businessId}','${profileId}','[TEST] Tenant Isolation');
      insert into public.business_members(business_id,profile_id,role,status) values ('${businessId}','${profileId}','owner','active');
      insert into public.opportunities(id,business_id,title,type,status,owner_profile_id)
      values ('${opportunityId}','${businessId}','[TEST] Acțiuni interne','manual','reviewed','${profileId}');
      insert into public.opportunity_actions(id,business_id,opportunity_id,title,status,assigned_to_profile_id)
      values
        ('${actionIds[0]}','${businessId}','${opportunityId}','[TEST] Finalizare','pending','${profileId}'),
        ('${actionIds[1]}','${businessId}','${opportunityId}','[TEST] Amânare','pending','${profileId}'),
        ('${actionIds[2]}','${businessId}','${opportunityId}','[TEST] Anulare','pending','${profileId}');
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

    const completedAt = new Date().toISOString();
    const postponedUntil = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const cancelledAt = new Date().toISOString();
    const completed = await userClient.from("opportunity_actions")
      .update({ status: "done", completed_at: completedAt })
      .eq("id", actionIds[0]).eq("business_id", businessId).eq("opportunity_id", opportunityId)
      .select("id,status").single();
    const postponed = await userClient.from("opportunity_actions")
      .update({ due_at: postponedUntil })
      .eq("id", actionIds[1]).eq("business_id", businessId).eq("opportunity_id", opportunityId)
      .select("id,status,due_at").single();
    const cancelled = await userClient.from("opportunity_actions")
      .update({ status: "cancelled", cancelled_at: cancelledAt })
      .eq("id", actionIds[2]).eq("business_id", businessId).eq("opportunity_id", opportunityId)
      .select("id,status").single();
    assert(!completed.error && completed.data.status === "done", `Finalizarea acțiunii interne autorizate a eșuat: ${completed.error?.message ?? "stare invalidă"}`);
    assert(!postponed.error && postponed.data.status === "pending" && postponed.data.due_at, `Amânarea acțiunii interne autorizate a eșuat: ${postponed.error?.message ?? "stare invalidă"}`);
    assert(!cancelled.error && cancelled.data.status === "cancelled", `Anularea acțiunii interne autorizate a eșuat: ${cancelled.error?.message ?? "stare invalidă"}`);

    const audit = await userClient.from("opportunity_events").insert({
      business_id: businessId,
      opportunity_id: opportunityId,
      actor_profile_id: profileId,
      event_type: "action_completed",
      label: "Acțiune internă finalizată",
      description: "Verificare locală fără efect extern.",
      metadata: { action_id: actionIds[0], external_action: false }
    }).select("id").single();
    assert(!audit.error && audit.data.id, `Auditul acțiunii interne autorizate a eșuat: ${audit.error?.message ?? "răspuns invalid"}`);

    const demoAction = runLocalSql(`select json_build_object(
      'id', id,
      'due_at', due_at
    ) from public.opportunity_actions where business_id='${DEMO.businessId}' order by created_at limit 1;`, { json: true });
    assert(demoAction?.id, "Acțiunea demo necesară verificării cross-tenant lipsește.");
    const crossTenantUpdate = await userClient.from("opportunity_actions")
      .update({ due_at: postponedUntil })
      .eq("id", demoAction.id)
      .select("id");
    assert(!crossTenantUpdate.error && crossTenantUpdate.data.length === 0, "RLS a permis actualizarea unei acțiuni din alt workspace.");
    const demoActionAfter = runLocalSql(`select json_build_object(
      'id', id,
      'due_at', due_at
    ) from public.opportunity_actions where id='${demoAction.id}';`, { json: true });
    assert(demoActionAfter.due_at === demoAction.due_at, "Încercarea cross-tenant a modificat acțiunea demo.");
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
  const verificationNow = new Date();
  assertDemoStoryInvariants(buildFixtures("de900000-0000-4000-8000-000000000001", verificationNow), verificationNow);
  const baseStats = runLocalSql(`
    select json_build_object(
      'business_count', (select count(*) from public.businesses where id = '${DEMO.businessId}' and name = '${DEMO.businessName.replaceAll("'", "''")}'),
      'identity_count', (select count(*) from public.profiles p join auth.users u on u.id=p.user_id where p.email='${DEMO.email}' and u.email='${DEMO.email}'),
      'organization_count', (select count(*) from public.crm_organizations where business_id = '${DEMO.businessId}'),
      'marked_organization_count', (select count(*) from public.crm_organizations where business_id = '${DEMO.businessId}' and id::text like 'de10%'),
      'contact_count', (select count(*) from public.crm_contacts where business_id = '${DEMO.businessId}'),
      'reserved_domain_contact_count', (select count(*) from public.crm_contacts where business_id = '${DEMO.businessId}' and email ~* '@([a-z0-9-]+\\.)*(demo|example|revenew-demo)\\.invalid$'),
      'multi_contact_organization_count', (select count(*) from (select organization_id from public.crm_contacts where business_id='${DEMO.businessId}' group by organization_id having count(*) > 1) grouped),
      'opportunity_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}'),
      'ron_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and currency = 'RON'),
      'eur_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and currency = 'EUR'),
      'unsupported_currency_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and currency not in ('RON','EUR')),
      'won_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and lifecycle_status = 'won' and actual_outcome_amount > 0),
      'lost_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and lifecycle_status = 'lost' and actual_outcome_amount is null),
      'action_count', (select count(*) from public.opportunity_actions where business_id = '${DEMO.businessId}'),
      'overdue_count', (select count(*) from public.opportunity_actions where business_id = '${DEMO.businessId}' and status = 'pending' and due_at < now()),
      'missing_next_action_count', (select count(*) from public.opportunities o where o.business_id='${DEMO.businessId}' and o.lifecycle_status='open' and not exists (select 1 from public.opportunity_actions a where a.opportunity_id=o.id and a.status='pending')),
      'unassigned_count', (select count(*) from public.opportunities where business_id='${DEMO.businessId}' and lifecycle_status='open' and owner_profile_id is null),
      'event_count', (select count(*) from public.opportunity_events where business_id = '${DEMO.businessId}' and actor_profile_id is not null),
      'document_count', (select count(*) from public.opportunity_documents where business_id = '${DEMO.businessId}' and generation_mode = 'local_fallback'),
      'unsent_document_count', (select count(*) from public.opportunity_documents where business_id = '${DEMO.businessId}' and status <> 'sent'),
      'owner_count', (select count(*) from public.business_members where business_id = '${DEMO.businessId}' and role = 'owner' and status = 'active')
      ,'internal_demo_access_count', (select count(*) from public.platform_user_roles where profile_id = (select id from public.profiles where email = '${DEMO.email}' limit 1) and role = 'platform_operator' and is_active = true and revoked_at is null and expires_at is null)
      ,'featured_opportunity_count', (select count(*) from public.opportunities where id = '${DEMO.featuredOpportunityId}' and business_id = '${DEMO.businessId}' and estimated_value_high > 0 and actual_outcome_amount is null)
      ,'evidence_backed_opportunity_count', (select count(distinct o.id) from public.opportunities o join public.commercial_signals s on s.detected_from_opportunity_id = o.id and s.business_id = o.business_id where o.business_id = '${DEMO.businessId}' and nullif(btrim(s.raw_message), '') is not null and nullif(btrim(s.primary_recovery_reason), '') is not null)
      ,'safe_next_action_count', (select count(*) from public.opportunities where business_id = '${DEMO.businessId}' and nullif(btrim(recommended_action), '') is not null)
      ,'unsafe_visible_label_count', (
        select count(*) from (
          select name as value from public.businesses where id = '${DEMO.businessId}'
          union all select full_name from public.profiles where email = '${DEMO.email}'
          union all select name from public.crm_organizations where business_id = '${DEMO.businessId}'
          union all select full_name from public.crm_contacts where business_id = '${DEMO.businessId}'
          union all select title from public.opportunities where business_id = '${DEMO.businessId}'
          union all select title from public.commercial_signals where business_id = '${DEMO.businessId}'
        ) visible where value ~* '(test[[:space:]_-]*data|e2e|testdavid|davidtest|grigore|gmail\\.com)'
      )
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
  const storyStats = runLocalSql(`select json_build_object(
    'featured_story_action_count', (select count(*) from public.opportunity_actions where business_id='${DEMO.businessId}' and opportunity_id='${DEMO.featuredOpportunityId}' and status='pending' and due_at < now()),
    'featured_story_event_count', (select count(*) from public.opportunity_events where business_id='${DEMO.businessId}' and opportunity_id='${DEMO.featuredOpportunityId}' and occurred_at <= now()),
    'featured_story_document_count', (select count(*) from public.opportunity_documents where business_id='${DEMO.businessId}' and opportunity_id='${DEMO.featuredOpportunityId}' and status='ready_to_send'),
    'featured_story_signal_count', (select count(*) from public.commercial_signals where business_id='${DEMO.businessId}' and id='${DEMO.featuredSignalId}' and detected_from_opportunity_id='${DEMO.featuredOpportunityId}' and review_status='ready_for_review' and nullif(btrim(raw_message),'') is not null),
    'atlas_discovery_count', (select count(*) from public.commercial_signals where business_id='${DEMO.businessId}' and id='${DEMO.discoverySignalId}' and matched_organization_id is not null and detected_from_opportunity_id is null and converted_opportunity_id is null and currency='EUR' and estimated_value_min=20000 and estimated_value_max=20000 and raw_message like '%20.000 EUR%'),
    'rich_company_contact_count', (select count(*) from public.crm_contacts where business_id='${DEMO.businessId}' and organization_id='${DEMO.richCompanyId}'),
    'rich_company_opportunity_count', (select count(*) from public.opportunities where business_id='${DEMO.businessId}' and organization_id='${DEMO.richCompanyId}'),
    'rich_company_document_count', (select count(*) from public.opportunity_documents d join public.opportunities o on o.id=d.opportunity_id and o.business_id=d.business_id where d.business_id='${DEMO.businessId}' and o.organization_id='${DEMO.richCompanyId}'),
    'rich_company_event_count', (select count(*) from public.opportunity_events e join public.opportunities o on o.id=e.opportunity_id and o.business_id=e.business_id where e.business_id='${DEMO.businessId}' and o.organization_id='${DEMO.richCompanyId}'),
    'future_fact_count', ((select count(*) from public.opportunity_events where business_id='${DEMO.businessId}' and occurred_at > now()) + (select count(*) from public.commercial_signals where business_id='${DEMO.businessId}' and occurred_at > now()) + (select count(*) from public.opportunity_actions where business_id='${DEMO.businessId}' and created_at > now())),
    'recent_story_change_count', (select count(*) from public.opportunity_events where business_id='${DEMO.businessId}' and occurred_at between now() - interval '24 hours' and now())
  );`, { json: true });
  const stats = { ...baseStats, ...storyStats };
  assert(Number(stats.business_count) === 1, "Workspace-ul demo lipsește sau nu este unic.");
  assert(Number(stats.identity_count) === 1, "Lanțul Auth → profil demo este invalid.");
  assert(Number(stats.organization_count) >= 5 && Number(stats.marked_organization_count) === Number(stats.organization_count), "Companiile canonice fictive lipsesc sau nu sunt marcate intern.");
  assert(Number(stats.contact_count) >= 5 && Number(stats.reserved_domain_contact_count) === Number(stats.contact_count) && Number(stats.multi_contact_organization_count) >= 1, "Contactele demo nu respectă domeniile rezervate și relațiile locale.");
  assert(Number(stats.opportunity_count) >= 8 && Number(stats.ron_count) > 0 && Number(stats.eur_count) > 0 && Number(stats.unsupported_currency_count) === 0, "Oportunitățile sau monedele demo sunt invalide.");
  assert(Number(stats.won_count) === 1 && Number(stats.lost_count) === 1, "Rezultatele terminale demo sunt invalide.");
  assert(Number(stats.action_count) >= 8 && Number(stats.action_count) <= 20, `Lumea demo nu are o coadă de lucru credibilă (acțiuni: ${stats.action_count}).`);
  assert(Number(stats.overdue_count) > 0, `Coada de lucru nu conține acțiuni restante (acțiuni: ${stats.action_count}, restante: ${stats.overdue_count}). Rulează din nou seed-ul local buyer-ready.`);
  assert(Number(stats.missing_next_action_count) > 0 && Number(stats.unassigned_count) > 0, "Lipsesc scenariile Recovery Queue obligatorii.");
  assert(Number(stats.event_count) >= 10, "Evenimentele nu sunt complet auditabile.");
  assert(Number(stats.document_count) >= 3 && Number(stats.unsent_document_count) === Number(stats.document_count), "Documentele demo trebuie să fie locale și netrimise.");
  assert(Number(stats.owner_count) === 1, "Ownership-ul demo este invalid.");
  assert(Number(stats.internal_demo_access_count) === 1, "Contul local nu poate accesa traseul intern /demo.");
  assert(Number(stats.featured_opportunity_count) === 1, "Oportunitatea principală a traseului demo lipsește.");
  assert(Number(stats.featured_story_action_count) >= 1 && Number(stats.featured_story_event_count) >= 4 && Number(stats.featured_story_document_count) >= 1 && Number(stats.featured_story_signal_count) === 1, "Povestea Vector nu leagă coerent riscul, acțiunea, istoricul, documentul și dovada.");
  assert(Number(stats.atlas_discovery_count) === 1, "Povestea Atlas nu păstrează semnalul neasociat și valoarea explicită de 20.000 EUR.");
  assert(Number(stats.rich_company_contact_count) >= 2 && Number(stats.rich_company_opportunity_count) >= 2 && Number(stats.rich_company_document_count) >= 2 && Number(stats.rich_company_event_count) >= 2, "Company 360 nu are o relație canonică suficient de bogată.");
  assert(Number(stats.future_fact_count) === 0 && Number(stats.recent_story_change_count) >= 1, "Cronologia demo conține fapte viitoare sau nu oferă nicio schimbare recentă.");
  assert(Number(stats.evidence_backed_opportunity_count) > 0, "Demo-ul nu conține o oportunitate susținută de o dovadă verificabilă.");
  assert(Number(stats.safe_next_action_count) > 0, "Demo-ul nu conține o acțiune următoare sigură.");
  assert(Number(stats.unsafe_visible_label_count) === 0, "Fixturele vizibile conțin identitate personală sau etichete TEST/E2E.");
  assert(Number(stats.signal_count) >= 3 && Number(stats.signal_count) <= 15, "Demo-ul nu are un set restrâns și util de semnale comerciale.");
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
  console.log("Verificare demo reușită: poveștile Vector, Atlas și Meridian, cronologia, semnalele, controlul uman și izolarea RLS sunt coerente.");
}

main().catch((error) => {
  console.error(`Verificare demo eșuată: ${error.message}`);
  process.exitCode = 1;
});
