"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { isMissingRelationError } from "@/lib/supabase/database-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type ContactActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string; crmReady?: boolean };

type ContactMutationContext = {
  ok: true;
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>;
  businessId: string;
};

type ValidatedContactInput = {
  contactId: string;
  associationId: string;
  fullName: string;
  normalizedName: string;
  jobTitle: string | null;
  organizationName: string | null;
  normalizedOrganizationName: string | null;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  professionalUrl: string | null;
  role: string | null;
  notes: string | null;
  isPrimary: boolean;
};

type ExistingContactRow = {
  id: string;
};

type ExistingAssociationRow = {
  id: string;
  contact_id: string;
};

const MAX_NOTE_LENGTH = 1200;
const SAFE_TEXT_PATTERN = /^[^<>]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 .()/-]{5,39}$/;

function fieldValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string, maxLength: number) {
  const value = fieldValue(formData, name);
  if (!value) return null;
  if (value.length > maxLength || !SAFE_TEXT_PATTERN.test(value)) {
    throw new Error("Verifică textul introdus. Unele câmpuri sunt prea lungi sau conțin caractere nepermise.");
  }
  return value;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function validateContactForm(formData: FormData): ValidatedContactInput {
  const fullName = optionalText(formData, "fullName", 160);
  if (!fullName || fullName.length < 2) {
    throw new Error("Numele contactului este obligatoriu.");
  }

  const rawEmail = fieldValue(formData, "email").toLowerCase();
  const email = rawEmail || null;
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
    throw new Error("Adresa de email nu pare validă.");
  }

  const phone = optionalText(formData, "phone", 40);
  if (phone && !PHONE_PATTERN.test(phone)) {
    throw new Error("Telefonul trebuie să fie un număr valid, preferabil în format internațional.");
  }

  const professionalUrl = optionalText(formData, "professionalUrl", 300);
  if (professionalUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(professionalUrl);
    } catch {
      throw new Error("Linkul profesional trebuie să fie un URL valid.");
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("Linkul profesional trebuie să înceapă cu http:// sau https://.");
    }
  }

  const organizationName = optionalText(formData, "organizationName", 160);
  const notes = optionalText(formData, "notes", MAX_NOTE_LENGTH);

  return {
    contactId: fieldValue(formData, "contactId"),
    associationId: fieldValue(formData, "associationId"),
    fullName,
    normalizedName: normalize(fullName),
    jobTitle: optionalText(formData, "jobTitle", 120),
    organizationName,
    normalizedOrganizationName: organizationName ? normalize(organizationName) : null,
    email,
    normalizedEmail: email,
    phone,
    professionalUrl,
    role: optionalText(formData, "role", 120),
    notes,
    isPrimary: formData.get("isPrimary") === "on"
  };
}

async function getMutationContext(opportunityId: string): Promise<ContactMutationContext | Extract<ContactActionResult, { ok: false }>> {
  await requireActivePaidAccess();
  await requirePermission("opportunities.update");

  if (!isSupabaseConfigured) {
    return { ok: false, error: "Contactele CRM sunt disponibile doar când Supabase este configurat.", crmReady: false };
  }

  const supabase = createSupabaseServerClient();
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = current?.business;

  if (!supabase || !business) {
    return { ok: false, error: "Nu am găsit firma curentă.", crmReady: false };
  }

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select("business_id")
    .eq("id", opportunityId)
    .eq("business_id", business.id)
    .single();

  if (error || !opportunity) {
    return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };
  }

  return {
    ok: true,
    supabase,
    businessId: business.id
  };
}

async function ensureOrganization(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
  input: ValidatedContactInput
) {
  if (!input.organizationName || !input.normalizedOrganizationName) return null;

  const { data: existing, error: existingError } = await supabase
    .from("crm_organizations")
    .select("id")
    .eq("business_id", businessId)
    .eq("normalized_name", input.normalizedOrganizationName)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("crm_organizations")
    .insert({
      business_id: businessId,
      name: input.organizationName,
      normalized_name: input.normalizedOrganizationName
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function findContactByEmail(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
  normalizedEmail: string | null
) {
  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from("crm_contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("normalized_email", normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  return (data as ExistingContactRow | null)?.id ?? null;
}

async function ensureContact(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
  input: ValidatedContactInput,
  organizationId: string | null
) {
  const payload = {
    business_id: businessId,
    organization_id: organizationId,
    full_name: input.fullName,
    normalized_name: input.normalizedName,
    job_title: input.jobTitle,
    email: input.email,
    normalized_email: input.normalizedEmail,
    phone: input.phone,
    professional_url: input.professionalUrl,
    notes: input.notes
  };

  if (input.contactId) {
    const duplicateId = await findContactByEmail(supabase, businessId, input.normalizedEmail);
    if (duplicateId && duplicateId !== input.contactId) {
      throw new Error("Există deja un contact cu acest email în workspace.");
    }

    const { data, error } = await supabase
      .from("crm_contacts")
      .update(payload)
      .eq("id", input.contactId)
      .eq("business_id", businessId)
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  }

  const existingId = await findContactByEmail(supabase, businessId, input.normalizedEmail);
  if (existingId) {
    const { data, error } = await supabase
      .from("crm_contacts")
      .update(payload)
      .eq("id", existingId)
      .eq("business_id", businessId)
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase.from("crm_contacts").insert(payload).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function existingOpportunityContact(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
  opportunityId: string,
  contactId: string
) {
  const { data, error } = await supabase
    .from("opportunity_contacts")
    .select("id,contact_id")
    .eq("business_id", businessId)
    .eq("opportunity_id", opportunityId)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (error) throw error;
  return data as ExistingAssociationRow | null;
}

async function insertTimelineEvent(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  opportunityId: string,
  eventType: string,
  label: string,
  description: string
) {
  const { error } = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    event_type: eventType,
    label,
    description
  });

  if (error) {
    console.error("CRM opportunity event insert failed", { code: error.code });
  }
}

function contactDatabaseError(error: unknown): ContactActionResult {
  if (
    isMissingRelationError(error, "crm_contacts") ||
    isMissingRelationError(error, "crm_organizations") ||
    isMissingRelationError(error, "opportunity_contacts")
  ) {
    return {
      ok: false,
      crmReady: false,
      error: "Structura CRM nu este încă aplicată în baza de date. Aplică migrarea CRM înainte de a salva contacte."
    };
  }

  if (error instanceof Error && !("code" in error)) {
    return { ok: false, error: error.message };
  }

  console.error("CRM contact action failed", error);
  return { ok: false, error: "Contactul nu a putut fi salvat. Încearcă din nou." };
}

export async function saveOpportunityContact(opportunityId: string, formData: FormData): Promise<ContactActionResult> {
  const context = await getMutationContext(opportunityId);
  if (!context.ok) return context;

  try {
    const input = validateContactForm(formData);
    const organizationId = await ensureOrganization(context.supabase, context.businessId, input);
    const contactId = await ensureContact(context.supabase, context.businessId, input, organizationId);
    const existing = input.associationId
      ? ({ id: input.associationId, contact_id: contactId } satisfies ExistingAssociationRow)
      : await existingOpportunityContact(context.supabase, context.businessId, opportunityId, contactId);

    if (input.isPrimary) {
      const { error } = await context.supabase
        .from("opportunity_contacts")
        .update({ is_primary: false })
        .eq("business_id", context.businessId)
        .eq("opportunity_id", opportunityId);
      if (error) throw error;
    }

    if (existing?.id) {
      const { error } = await context.supabase
        .from("opportunity_contacts")
        .update({
          contact_id: contactId,
          role: input.role,
          notes: input.notes,
          is_primary: input.isPrimary
        })
        .eq("id", existing.id)
        .eq("business_id", context.businessId)
        .eq("opportunity_id", opportunityId);

      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("opportunity_contacts").insert({
        business_id: context.businessId,
        opportunity_id: opportunityId,
        contact_id: contactId,
        role: input.role,
        notes: input.notes,
        is_primary: input.isPrimary
      });

      if (error) throw error;
    }

    await insertTimelineEvent(
      context.supabase,
      opportunityId,
      input.isPrimary ? "primary_contact_changed" : existing ? "contact_updated" : "contact_assigned",
      input.isPrimary ? "Contact principal actualizat" : existing ? "Contact actualizat" : "Contact asociat",
      input.isPrimary ? "Contactul principal al oportunității a fost actualizat." : "Contactele oportunității au fost actualizate."
    );

    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/opportunities");
    return { ok: true, message: input.isPrimary ? "Contact principal salvat." : "Contact salvat." };
  } catch (error) {
    return contactDatabaseError(error);
  }
}

export async function setPrimaryOpportunityContact(opportunityId: string, associationId: string): Promise<ContactActionResult> {
  const context = await getMutationContext(opportunityId);
  if (!context.ok) return context;

  try {
    const { data: association, error: loadError } = await context.supabase
      .from("opportunity_contacts")
      .select("id")
      .eq("id", associationId)
      .eq("business_id", context.businessId)
      .eq("opportunity_id", opportunityId)
      .single();

    if (loadError || !association) {
      return { ok: false, error: "Contactul nu a fost găsit pentru această oportunitate." };
    }

    const { error: clearError } = await context.supabase
      .from("opportunity_contacts")
      .update({ is_primary: false })
      .eq("business_id", context.businessId)
      .eq("opportunity_id", opportunityId);
    if (clearError) throw clearError;

    const { error: setError } = await context.supabase
      .from("opportunity_contacts")
      .update({ is_primary: true })
      .eq("id", associationId)
      .eq("business_id", context.businessId)
      .eq("opportunity_id", opportunityId);
    if (setError) throw setError;

    await insertTimelineEvent(
      context.supabase,
      opportunityId,
      "primary_contact_changed",
      "Contact principal actualizat",
      "Contactul principal al oportunității a fost schimbat."
    );

    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/opportunities");
    return { ok: true, message: "Contactul principal a fost actualizat." };
  } catch (error) {
    return contactDatabaseError(error);
  }
}

export async function removeOpportunityContact(opportunityId: string, associationId: string): Promise<ContactActionResult> {
  const context = await getMutationContext(opportunityId);
  if (!context.ok) return context;

  try {
    const { error } = await context.supabase
      .from("opportunity_contacts")
      .delete()
      .eq("id", associationId)
      .eq("business_id", context.businessId)
      .eq("opportunity_id", opportunityId);

    if (error) throw error;

    await insertTimelineEvent(
      context.supabase,
      opportunityId,
      "contact_removed",
      "Contact eliminat",
      "Un contact a fost eliminat din această oportunitate."
    );

    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/opportunities");
    return { ok: true, message: "Contactul a fost eliminat din oportunitate." };
  } catch (error) {
    return contactDatabaseError(error);
  }
}
