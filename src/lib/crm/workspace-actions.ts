"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { isMissingRelationError } from "@/lib/supabase/database-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type CrmActionResult = { ok: true; id?: string; message: string } | { ok: false; error: string; schemaMissing?: boolean };

const SAFE_TEXT_PATTERN = /^[^<>]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, name: string, maxLength = 240) {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > maxLength || !SAFE_TEXT_PATTERN.test(value)) {
    throw new Error("Verifică textul introdus. Unele câmpuri sunt prea lungi sau conțin caractere nepermise.");
  }
  return value;
}

function nullableField(formData: FormData, name: string, maxLength = 240) {
  const value = field(formData, name, maxLength);
  return value || null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function getCrmContext() {
  await requireActivePaidAccess();
  await requirePermission("opportunities.update");

  if (!isSupabaseConfigured) {
    return { ok: false as const, error: "CRM-ul real este disponibil doar când Supabase este configurat.", schemaMissing: true };
  }

  const supabase = createSupabaseServerClient();
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = current?.business;
  if (!supabase || !business) {
    return { ok: false as const, error: "Nu am găsit firma curentă.", schemaMissing: true };
  }

  return { ok: true as const, supabase, businessId: business.id };
}

function crmDatabaseError(error: unknown): CrmActionResult {
  if (
    isMissingRelationError(error, "crm_organizations") ||
    isMissingRelationError(error, "crm_contacts") ||
    isMissingRelationError(error, "opportunity_contacts") ||
    (typeof error === "object" && error !== null && "code" in error && String(error.code) === "42703")
  ) {
    return {
      ok: false,
      schemaMissing: true,
      error: "Schema CRM este incompletă în baza de date. Aplică migrarea 202607060002_crm_workspace_crud.sql și reîncearcă."
    };
  }

  if (error instanceof Error && !("code" in error)) {
    return { ok: false, error: error.message };
  }

  console.error("crm_workspace_action_failed", error);
  return { ok: false, error: "Operațiunea CRM nu a putut fi salvată." };
}

export async function saveCrmOrganization(formData: FormData): Promise<CrmActionResult> {
  const context = await getCrmContext();
  if (!context.ok) return context;

  try {
    const id = field(formData, "id");
    const name = field(formData, "name", 180);
    if (!name) throw new Error("Numele organizației este obligatoriu.");

    const payload = {
      business_id: context.businessId,
      name,
      normalized_name: normalize(name),
      website: nullableField(formData, "website", 300),
      industry: nullableField(formData, "industry", 120),
      phone: nullableField(formData, "phone", 60),
      city: nullableField(formData, "city", 120),
      county: nullableField(formData, "county", 120),
      country: nullableField(formData, "country", 120),
      relationship_status: field(formData, "relationshipStatus") || "prospect",
      notes: nullableField(formData, "notes", 1200)
    };

    const query = id
      ? context.supabase.from("crm_organizations").update(payload).eq("id", id).eq("business_id", context.businessId).select("id").single()
      : context.supabase.from("crm_organizations").insert(payload).select("id").single();
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("Organizația nu a fost salvată.");

    revalidatePath("/crm");
    revalidatePath(`/crm/organizations/${data.id}`);
    return { ok: true, id: data.id, message: id ? "Organizația a fost actualizată." : "Organizația a fost creată." };
  } catch (error) {
    return crmDatabaseError(error);
  }
}

export async function archiveCrmOrganization(id: string): Promise<CrmActionResult> {
  const context = await getCrmContext();
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase
      .from("crm_organizations")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", context.businessId);
    if (error) throw error;

    revalidatePath("/crm");
    return { ok: true, message: "Organizația a fost arhivată." };
  } catch (error) {
    return crmDatabaseError(error);
  }
}

export async function saveCrmContact(formData: FormData): Promise<CrmActionResult> {
  const context = await getCrmContext();
  if (!context.ok) return context;

  try {
    const id = field(formData, "id");
    const organizationId = field(formData, "organizationId");
    const fullName = field(formData, "fullName", 180);
    const email = nullableField(formData, "email", 254)?.toLowerCase() ?? null;
    if (!fullName) throw new Error("Numele contactului este obligatoriu.");
    if (email && !EMAIL_PATTERN.test(email)) throw new Error("Adresa de email nu pare validă.");

    if (organizationId) {
      const { data: organization, error } = await context.supabase
        .from("crm_organizations")
        .select("id")
        .eq("id", organizationId)
        .eq("business_id", context.businessId)
        .eq("is_archived", false)
        .single();
      if (error || !organization) throw new Error("Organizația selectată nu este disponibilă în workspace.");
    }

    const isPrimary = formData.get("isPrimaryForOrganization") === "on";
    if (isPrimary && organizationId) {
      const { error } = await context.supabase
        .from("crm_contacts")
        .update({ is_primary_for_organization: false })
        .eq("business_id", context.businessId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    }

    const payload = {
      business_id: context.businessId,
      organization_id: organizationId || null,
      first_name: nullableField(formData, "firstName", 100),
      last_name: nullableField(formData, "lastName", 100),
      full_name: fullName,
      normalized_name: normalize(fullName),
      job_title: nullableField(formData, "jobTitle", 140),
      department: nullableField(formData, "department", 120),
      decision_role: nullableField(formData, "decisionRole", 80),
      email,
      normalized_email: email,
      phone: nullableField(formData, "phone", 60),
      professional_url: nullableField(formData, "professionalUrl", 300),
      notes: nullableField(formData, "notes", 1200),
      is_active: true,
      is_primary_for_organization: Boolean(isPrimary && organizationId)
    };

    const query = id
      ? context.supabase.from("crm_contacts").update(payload).eq("id", id).eq("business_id", context.businessId).select("id,organization_id").single()
      : context.supabase.from("crm_contacts").insert(payload).select("id,organization_id").single();
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("Contactul nu a fost salvat.");

    revalidatePath("/crm");
    if (data.organization_id) revalidatePath(`/crm/organizations/${data.organization_id}`);
    return { ok: true, id: data.id, message: id ? "Contactul a fost actualizat." : "Contactul a fost creat." };
  } catch (error) {
    return crmDatabaseError(error);
  }
}

export async function archiveCrmContact(id: string): Promise<CrmActionResult> {
  const context = await getCrmContext();
  if (!context.ok) return context;

  try {
    const { data, error } = await context.supabase
      .from("crm_contacts")
      .update({ is_active: false, is_primary_for_organization: false, archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", context.businessId)
      .select("organization_id")
      .single();
    if (error) throw error;

    revalidatePath("/crm");
    if (data?.organization_id) revalidatePath(`/crm/organizations/${data.organization_id}`);
    return { ok: true, message: "Contactul a fost arhivat." };
  } catch (error) {
    return crmDatabaseError(error);
  }
}

export async function createCrmOpportunity(formData: FormData): Promise<CrmActionResult> {
  await requireActivePaidAccess();
  await requirePermission("opportunities.create");

  if (!isSupabaseConfigured) {
    return { ok: false, error: "Oportunitățile reale sunt disponibile doar când Supabase este configurat." };
  }

  const supabase = createSupabaseServerClient();
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = current?.business;
  if (!supabase || !business) return { ok: false, error: "Nu am găsit workspace-ul curent." };

  try {
    const organizationId = field(formData, "organizationId", 64);
    const title = field(formData, "title", 180);
    const summary = field(formData, "summary", 1200);
    const estimatedValue = field(formData, "estimatedValue", 24).replace(",", ".");
    const deadline = field(formData, "deadline", 10) || null;
    if (!organizationId || !title || !summary) throw new Error("Compania, titlul și contextul comercial sunt obligatorii.");
    if (estimatedValue && !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(estimatedValue)) {
      throw new Error("Valoarea estimată trebuie să fie un număr pozitiv valid.");
    }
    if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(`${deadline}T00:00:00Z`)))) {
      throw new Error("Termenul oportunității nu este valid.");
    }

    const { data: organization, error: organizationError } = await supabase
      .from("crm_organizations")
      .select("id,name")
      .eq("id", organizationId)
      .eq("business_id", business.id)
      .eq("is_archived", false)
      .single();
    if (organizationError || !organization) throw new Error("Compania selectată nu este disponibilă în workspace.");

    const value = estimatedValue ? Number(estimatedValue) : 0;
    const { data, error } = await supabase.from("opportunities").insert({
      business_id: business.id,
      organization_id: organization.id,
      title,
      type: "manual",
      status: "reviewed",
      lifecycle_status: "open",
      commercial_type: "new_business",
      estimated_value_low: value,
      estimated_value_high: value,
      deadline,
      city: business.city || null,
      county: business.county || null,
      fit_score: 0,
      urgency_score: 0,
      money_score: 0,
      confidence_score: 0,
      summary,
      relevance: ["Oportunitate creată manual și asociată unei companii CRM."],
      risks: ["Contextul și contactele trebuie validate de echipa comercială."],
      recommended_action: "Asociază contactul principal și stabilește următoarea acțiune.",
      raw_source_text: summary,
      currency: "RON"
    }).select("id").single();
    if (error || !data) throw error ?? new Error("Oportunitatea nu a fost creată.");

    revalidatePath("/opportunities");
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    revalidatePath(`/crm/organizations/${organization.id}`);
    return { ok: true, id: data.id, message: "Oportunitatea a fost creată. Adaugă contactul principal și următoarea acțiune." };
  } catch (error) {
    return crmDatabaseError(error);
  }
}
