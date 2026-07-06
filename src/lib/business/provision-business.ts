import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { parseOnboardingForm, splitList, type ParsedOnboardingInput } from "@/lib/business/onboarding-normalization";

type SupabaseServerClient = NonNullable<ReturnType<typeof createSupabaseServerClient>>;

type OnboardingSetupResult =
  | { ok: true }
  | {
      ok: false;
      step: "member_insert" | "services_insert" | "targets_insert";
      businessId: string;
      error: string;
    };

async function ensureOnboardingBusinessSetup({
  supabase,
  businessId,
  profileId,
  services,
  targets
}: {
  supabase: SupabaseServerClient;
  businessId: string;
  profileId: string;
  services: Array<{ business_id: string; name: string }>;
  targets: Array<{ business_id: string; target_type: string; value: string }>;
}): Promise<OnboardingSetupResult> {
  const { error: memberError } = await supabase
    .from("business_members")
    .upsert({ business_id: businessId, profile_id: profileId, role: "owner" }, { onConflict: "business_id,profile_id" });

  if (memberError) {
    console.error("Supabase business member upsert error", { code: memberError.code });
    return { ok: false, step: "member_insert", businessId, error: "Rolul de owner nu a putut fi salvat. Încearcă din nou." };
  }

  if (services.length) {
    const { data: existingService, error: serviceLookupError } = await supabase.from("business_services").select("id").eq("business_id", businessId).limit(1).maybeSingle();

    if (serviceLookupError) {
      console.error("Supabase business services lookup error", { code: serviceLookupError.code });
      return { ok: false, step: "services_insert", businessId, error: "Serviciile nu au putut fi verificate. Încearcă din nou." };
    }

    if (!existingService) {
      const { error: serviceError } = await supabase.from("business_services").insert(services);
      if (serviceError) {
        console.error("Supabase business services insert error", { code: serviceError.code });
        return { ok: false, step: "services_insert", businessId, error: "Serviciile nu au putut fi salvate. Încearcă din nou." };
      }
    }
  }

  if (targets.length) {
    const { data: existingTarget, error: targetLookupError } = await supabase.from("business_targets").select("id").eq("business_id", businessId).limit(1).maybeSingle();

    if (targetLookupError) {
      console.error("Supabase business targets lookup error", { code: targetLookupError.code });
      return { ok: false, step: "targets_insert", businessId, error: "Țintele nu au putut fi verificate. Încearcă din nou." };
    }

    if (!existingTarget) {
      const { error: targetError } = await supabase.from("business_targets").insert(targets);
      if (targetError) {
        console.error("Supabase business targets insert error", { code: targetError.code });
        return { ok: false, step: "targets_insert", businessId, error: "Țintele nu au putut fi salvate. Încearcă din nou." };
      }
    }
  }

  return { ok: true };
}

function buildServices(parsed: ParsedOnboardingInput, businessId: string) {
  return [parsed.mainOffering, parsed.shortDescription]
    .filter(Boolean)
    .map((name) => ({ business_id: businessId, name }));
}

function buildTargets(parsed: ParsedOnboardingInput, businessId: string) {
  return [
    ...splitList(parsed.leadSources).map((value) => ({ business_id: businessId, target_type: "customer", value })),
    { business_id: businessId, target_type: "city", value: parsed.city },
    { business_id: businessId, target_type: "industry", value: parsed.industry }
  ];
}

export async function provisionBusinessFromOnboarding(formData: FormData) {
  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo", step: "success" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, step: "auth_check", error: "Nu am putut verifica sesiunea. Încearcă din nou." };
  }

  let current;
  try {
    current = await getCurrentProfile();
  } catch (error) {
    console.error("Onboarding profile lookup/create error", error);
    return { ok: false, step: "profile_lookup", error: "Nu am putut pregăti profilul contului. Încearcă din nou." };
  }

  if (!current.authUser || !current.profile?.id) {
    return { ok: false, step: "auth_check", error: "Nu ești autentificat. Intră din nou în cont înainte să salvezi firma." };
  }

  const parsedResult = parseOnboardingForm(formData);
  if (!parsedResult.ok) {
    return { ok: false, step: "business_insert", error: parsedResult.error };
  }
  const parsed = parsedResult.value;

  const { data: existingBusiness, error: existingBusinessError } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_profile_id", current.profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingBusinessError) {
    console.error("Supabase existing business lookup error", { code: existingBusinessError.code });
    return { ok: false, step: "business_lookup", profileId: current.profile.id, ownerProfileId: current.profile.id, error: "Nu am putut verifica dacă firma există deja. Încearcă din nou." };
  }

  if (existingBusiness) {
    const setupResult = await ensureOnboardingBusinessSetup({
      supabase,
      businessId: existingBusiness.id,
      profileId: current.profile.id,
      services: buildServices(parsed, existingBusiness.id),
      targets: buildTargets(parsed, existingBusiness.id)
    });
    if (!setupResult.ok) {
      return { ok: false, step: setupResult.step, profileId: current.profile.id, ownerProfileId: current.profile.id, businessId: existingBusiness.id, error: setupResult.error };
    }

    return { ok: true, mode: "supabase", step: "business_exists", profileId: current.profile.id, ownerProfileId: current.profile.id, businessId: existingBusiness.id, message: "Ai deja o firmă configurată. Poți continua în dashboard." };
  }

  const businessPayload = {
    owner_profile_id: current.profile.id,
    name: parsed.businessName,
    legal_name: parsed.legalName,
    cui: parsed.cui,
    website: parsed.website,
    industry: parsed.industry,
    country_code: parsed.countryCode,
    administrative_area_code: parsed.administrativeAreaCode || null,
    company_phone_e164: parsed.companyPhoneE164,
    postal_code: parsed.postalCode || null,
    city: parsed.city,
    county: parsed.administrativeAreaLabel,
    average_contract_value: parsed.averageContractValue,
    current_sales_process: [
      `Țară: ${parsed.countryCode}`,
      parsed.companyPhoneE164 ? `Telefon firmă: ${parsed.companyPhoneE164}` : "",
      parsed.postalCode ? `Cod poștal: ${parsed.postalCode}` : "",
      parsed.mainCommercialProblem ? `Problemă principală: ${parsed.mainCommercialProblem}` : "",
      parsed.leadSources ? `Surse cereri: ${parsed.leadSources}` : "",
      parsed.currency ? `Monedă: ${parsed.currency}` : ""
    ]
      .filter(Boolean)
      .join("\n"),
    notification_email: current.authUser.email ?? ""
  };

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert(businessPayload)
    .select("id")
    .single();

  if (businessError || !business) {
    console.error("Supabase business insert error", { code: businessError?.code });
    return { ok: false, step: "business_insert", profileId: current.profile.id, ownerProfileId: current.profile.id, error: "Firma nu a putut fi salvată. Încearcă din nou." };
  }

  const setupResult = await ensureOnboardingBusinessSetup({
    supabase,
    businessId: business.id,
    profileId: current.profile.id,
    services: buildServices(parsed, business.id),
    targets: buildTargets(parsed, business.id)
  });

  if (!setupResult.ok) {
    return { ok: false, step: setupResult.step, profileId: current.profile.id, ownerProfileId: current.profile.id, businessId: business.id, error: setupResult.error };
  }

  revalidatePath("/dashboard");
  return { ok: true, mode: "supabase", step: "success", profileId: current.profile.id, ownerProfileId: current.profile.id, businessId: business.id };
}
