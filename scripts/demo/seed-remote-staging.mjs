import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildFixtures, DEMO } from "./fixtures.mjs";

const EXPECTED_PROJECT_REF = "udkynjivynrekjqnpkhr";
const EXPECTED_HOST = `${EXPECTED_PROJECT_REF}.supabase.co`;
const url = process.env.STAGING_SUPABASE_URL;
const serviceRoleKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const replace = process.argv.includes("--replace");

function fail(message) {
  throw new Error(message);
}

function requireTarget() {
  if (!url) fail("Lipsește STAGING_SUPABASE_URL.");
  if (!serviceRoleKey) fail("Lipsește STAGING_SUPABASE_SERVICE_ROLE_KEY.");

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail("STAGING_SUPABASE_URL nu este un URL valid.");
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== EXPECTED_HOST || parsed.pathname !== "/") {
    fail(`Seed refuzat: targetul trebuie să fie exact https://${EXPECTED_HOST}.`);
  }
  if (!serviceRoleKey.trim()) fail("Service-role key goală.");
}

function adminClient() {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

async function requireOk(label, promise) {
  const { data, error } = await promise;
  if (error) fail(`${label}: ${error.message}`);
  return data;
}

async function findDemoUser(admin) {
  for (let page = 1; page <= 10; page += 1) {
    const data = await requireOk(
      "Nu pot lista utilizatorii Auth",
      admin.auth.admin.listUsers({ page, perPage: 100 })
    );
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === DEMO.email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) break;
  }
  fail(`Utilizatorul demo ${DEMO.email} nu există în staging.`);
}

async function insertMany(admin, table, rows) {
  if (!rows?.length) return;
  await requireOk(`Insert ${table}`, admin.from(table).insert(rows));
}

async function main() {
  requireTarget();
  const admin = adminClient();
  const user = await findDemoUser(admin);
  if (!user.email_confirmed_at) fail("Utilizatorul demo nu are emailul confirmat.");

  const existingProfile = await requireOk(
    "Verificare profil demo",
    admin.from("profiles").select("id,user_id").eq("user_id", user.id).maybeSingle()
  );
  const profileId = existingProfile?.id ?? randomUUID();

  const existingBusiness = await requireOk(
    "Verificare workspace demo",
    admin.from("businesses").select("id,name").eq("id", DEMO.businessId).maybeSingle()
  );

  if (existingBusiness && !replace) {
    fail(`Workspace-ul demo există deja (${existingBusiness.name}). Re-rulează numai dacă intenționezi explicit cu --replace.`);
  }
  if (existingBusiness && replace) {
    await requireOk("Ștergere controlată workspace demo existent", admin.from("businesses").delete().eq("id", DEMO.businessId));
  }

  if (existingProfile) {
    await requireOk(
      "Actualizare profil demo",
      admin.from("profiles").update({
        full_name: DEMO.operatorName,
        email: DEMO.email,
        role: "business_owner"
      }).eq("id", profileId)
    );
  } else {
    await requireOk(
      "Creare profil demo",
      admin.from("profiles").insert({
        id: profileId,
        user_id: user.id,
        full_name: DEMO.operatorName,
        email: DEMO.email,
        role: "business_owner"
      })
    );
  }

  await requireOk(
    "Rol operator demo",
    admin.from("platform_user_roles").upsert({
      profile_id: profileId,
      role: "platform_operator",
      is_active: true,
      granted_by_profile_id: profileId,
      expires_at: null,
      revoked_at: null
    }, { onConflict: "profile_id,role" })
  );

  await requireOk(
    "Creare workspace demo",
    admin.from("businesses").insert({
      id: DEMO.businessId,
      owner_profile_id: profileId,
      name: DEMO.businessName,
      legal_name: "Meridian Commercial Operations SRL",
      industry: "Servicii B2B și management operațional",
      city: "București",
      county: "București",
      country_code: "RO",
      notification_email: DEMO.email,
      current_sales_process: "Revizuire săptămânală a riscurilor, responsabililor, dovezilor și acțiunilor următoare."
    })
  );

  await requireOk(
    "Membru owner demo",
    admin.from("business_members").insert({ business_id: DEMO.businessId, profile_id: profileId, role: "owner", status: "active" })
  );
  await insertMany(admin, "business_services", [
    { business_id: DEMO.businessId, name: "Revenue Recovery", description: "Identificare și urmărire disciplinată a oportunităților subutilizate." },
    { business_id: DEMO.businessId, name: "Control comercial", description: "Responsabil, acțiune următoare și auditabilitate pentru echipe B2B." }
  ]);
  await insertMany(admin, "business_targets", [
    { business_id: DEMO.businessId, target_type: "industry", value: "Servicii B2B" },
    { business_id: DEMO.businessId, target_type: "city", value: "București" },
    { business_id: DEMO.businessId, target_type: "customer", value: "Companii cu procese comerciale recurente" }
  ]);
  await requireOk(
    "Politică governance demo",
    admin.from("business_governance_policies").upsert({
      business_id: DEMO.businessId,
      live_email_approval_policy: "manager_required",
      outcome_approval_policy: "member_confirmation",
      assignment_policy: "members_self_assign",
      updated_by_profile_id: profileId
    }, { onConflict: "business_id" })
  );

  const fixtures = buildFixtures(profileId);
  await insertMany(admin, "crm_organizations", fixtures.organizations);
  await insertMany(admin, "crm_contacts", fixtures.contacts);
  await insertMany(admin, "opportunities", fixtures.opportunities);
  await insertMany(admin, "opportunity_contacts", fixtures.opportunityContacts);
  await insertMany(admin, "opportunity_actions", fixtures.actions);
  await insertMany(admin, "opportunity_events", fixtures.events);
  await insertMany(admin, "opportunity_documents", fixtures.documents);
  await insertMany(admin, "commercial_signals", fixtures.signals);
  await insertMany(admin, "commercial_signal_events", fixtures.signalEvents);

  const periodEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const access = await requireOk(
    "Activare acces staging",
    admin.rpc("set_manual_subscription_access", {
      target_business_id: DEMO.businessId,
      target_plan: "growth",
      target_status: "active",
      target_current_period_end: periodEnd,
      operator_reference: "staging-visual-audit"
    })
  );

  const counts = {};
  for (const [label, table] of [
    ["companies", "crm_organizations"],
    ["contacts", "crm_contacts"],
    ["opportunities", "opportunities"],
    ["actions", "opportunity_actions"],
    ["signals", "commercial_signals"]
  ]) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq("business_id", DEMO.businessId);
    if (error) fail(`Verificare ${table}: ${error.message}`);
    counts[label] = count ?? 0;
  }

  console.log("STAGING_SEED_OK");
  console.log(`project_ref=${EXPECTED_PROJECT_REF}`);
  console.log(`workspace=${DEMO.businessName}`);
  console.log(`user=${DEMO.email}`);
  console.log(`companies=${counts.companies}`);
  console.log(`contacts=${counts.contacts}`);
  console.log(`opportunities=${counts.opportunities}`);
  console.log(`actions=${counts.actions}`);
  console.log(`signals=${counts.signals}`);
  console.log(`paid_access=${Array.isArray(access) ? access.length : 1}`);
  console.log("external_actions=0");
}

main().catch((error) => {
  console.error(`STAGING_SEED_FAILED: ${error.message}`);
  process.exitCode = 1;
});
