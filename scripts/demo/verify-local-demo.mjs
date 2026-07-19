import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createLocalAdminClient, runLocalSql } from "./local-supabase.mjs";
import { DEMO } from "./fixtures.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    if (foreignBusiness.error || foreignOpportunity.error) {
      throw new Error(`Interogarea RLS temporară a eșuat (${foreignBusiness.error?.code ?? "ok"}/${foreignOpportunity.error?.code ?? "ok"}).`);
    }
    assert(foreignBusiness.data.length === 0, "RLS a expus workspace-ul demo altui tenant.");
    assert(foreignOpportunity.data.length === 0, "RLS a expus oportunități altui tenant.");
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
  await verifyTenantIsolation(admin, local);
  console.log("Verificare demo reușită: structură, relații, rezultate, coadă operațională și izolare RLS validate.");
}

main().catch((error) => {
  console.error(`Verificare demo eșuată: ${error.message}`);
  process.exitCode = 1;
});
