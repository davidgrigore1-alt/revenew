import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { demoBusiness } from "@/lib/mock-data";
import type { Business } from "@/lib/types";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type CurrentBusinessResult = {
  business: Business;
  source: "supabase" | "demo";
  profileId: string;
  authUserId: string;
  authUserEmail: string;
  profileName: string;
  servicesCount: number;
  targetsCount: number;
};

type BusinessRow = {
  id: string;
  owner_profile_id: string | null;
  name: string;
  legal_name: string | null;
  cui: string | null;
  website: string | null;
  industry: string | null;
  country_code: string | null;
  administrative_area_code: string | null;
  company_phone_e164: string | null;
  postal_code: string | null;
  city: string | null;
  county: string | null;
  average_contract_value: number | null;
  current_sales_process: string | null;
  notification_email: string | null;
};

function mapBusiness(row: BusinessRow, services: string[], customers: string[], cities: string[], industries: string[]): Business {
  return {
    id: row.id,
    owner_profile_id: row.owner_profile_id,
    name: row.name,
    legalName: row.legal_name ?? row.name,
    cui: row.cui ?? "",
    website: row.website ?? "",
    industry: row.industry ?? "",
    countryCode: row.country_code ?? "",
    administrativeAreaCode: row.administrative_area_code ?? "",
    companyPhoneE164: row.company_phone_e164 ?? "",
    postalCode: row.postal_code ?? "",
    city: row.city ?? "",
    county: row.county ?? "",
    services,
    targetCustomers: customers,
    averageContractValue: Number(row.average_contract_value ?? 0),
    targetCities: cities,
    targetIndustries: industries,
    currentSalesProcess: row.current_sales_process ?? "",
    notificationEmail: row.notification_email ?? ""
  };
}

const getCurrentBusinessForUserCached = cache(async function getCurrentBusinessForUserCached(redirectIfMissing: boolean): Promise<CurrentBusinessResult | null> {
  if (!isSupabaseConfigured) {
    return {
      business: demoBusiness,
      source: "demo",
      profileId: "",
      authUserId: "",
      authUserEmail: "",
      profileName: "Demo",
      servicesCount: demoBusiness.services.length,
      targetsCount: demoBusiness.targetCustomers.length + demoBusiness.targetCities.length + demoBusiness.targetIndustries.length
    };
  }

  const { authUser, profile } = await getCurrentProfile();
  if (!authUser || !profile) {
    redirect("/login");
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase nu este disponibil pe server.");
  }

  let { data: business, error: ownerError } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ownerError) {
    throw new Error(`Business lookup owner error: ${ownerError.message}`);
  }

  if (!business) {
    const { data: membership, error: membershipError } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw new Error(`Business membership lookup error: ${membershipError.message}`);
    }

    if (membership?.business_id) {
      const lookup = await supabase.from("businesses").select("*").eq("id", membership.business_id).single();
      if (lookup.error) {
        throw new Error(`Business lookup member error: ${lookup.error.message}`);
      }
      business = lookup.data;
    }
  }

  if (!business) {
    if (redirectIfMissing) {
      redirect("/onboarding");
    }
    return null;
  }

  const [{ data: services, error: servicesError }, { data: targets, error: targetsError }] = await Promise.all([
    supabase.from("business_services").select("name").eq("business_id", business.id),
    supabase.from("business_targets").select("target_type,value").eq("business_id", business.id)
  ]);

  if (servicesError) {
    throw new Error(`Business services load error: ${servicesError.message}`);
  }

  if (targetsError) {
    throw new Error(`Business targets load error: ${targetsError.message}`);
  }

  const targetRows = targets ?? [];

  return {
    business: mapBusiness(
      business as BusinessRow,
      (services ?? []).map((item) => item.name),
      targetRows.filter((item) => item.target_type === "customer").map((item) => item.value),
      targetRows.filter((item) => item.target_type === "city").map((item) => item.value),
      targetRows.filter((item) => item.target_type === "industry").map((item) => item.value)
    ),
    source: "supabase",
    profileId: profile.id,
    authUserId: authUser.id,
    authUserEmail: authUser.email ?? profile.email,
    profileName: profile.full_name,
    servicesCount: services?.length ?? 0,
    targetsCount: targetRows.length
  };
});

export async function getCurrentBusinessForUser({ redirectIfMissing = false } = {}): Promise<CurrentBusinessResult | null> {
  return getCurrentBusinessForUserCached(Boolean(redirectIfMissing));
}
