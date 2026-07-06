import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CurrentBusinessResult } from "@/lib/business/current-business";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getPreviewPlanById, isPreviewPlanId, type PreviewPlanId } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type ReveNewAccessMode = "preview" | "paid";
export type PaidAccessStatus = "active" | "none" | "expired" | "past_due" | "cancelled" | "trialing" | "demo_unconfigured" | "preview_active" | "preview_missing";

export type PaidAccessSubscription = {
  id: string;
  businessId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PaidAccessContext = {
  currentBusiness: CurrentBusinessResult;
  subscription: PaidAccessSubscription | null;
  hasAccess: boolean;
  accessStatus: PaidAccessStatus;
  reason: string;
  accessMode: ReveNewAccessMode;
  previewPlan: ReturnType<typeof getPreviewPlanById>;
};

export const previewPlanCookieName = "revenew_preview_plan";

const paidStatusLabels: Record<PaidAccessStatus, string> = {
  active: "Activ",
  none: "Nu ai un plan activ",
  expired: "Plan expirat",
  past_due: "Plată restantă",
  cancelled: "Anulat",
  trialing: "Trial neactiv pentru acces",
  demo_unconfigured: "Mod demo local",
  preview_active: "Mod de testare activ",
  preview_missing: "Niciun plan selectat"
};

export function getPaidAccessStatusLabel(status: PaidAccessStatus) {
  return paidStatusLabels[status] ?? "Necunoscut";
}

export function getReveNewAccessMode(): ReveNewAccessMode {
  const configuredMode = process.env.REVENEW_ACCESS_MODE;
  if (configuredMode === "preview" || configuredMode === "paid") {
    return configuredMode;
  }

  return process.env.NODE_ENV === "production" ? "paid" : "preview";
}

export function getPreviewPlan(): PreviewPlanId | null {
  const value = cookies().get(previewPlanCookieName)?.value;
  return isPreviewPlanId(value) ? value : null;
}

function isFutureDate(value: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function evaluateSubscription(subscription: PaidAccessSubscription | null): Pick<PaidAccessContext, "hasAccess" | "accessStatus" | "reason"> {
  if (!subscription) {
    return { hasAccess: false, accessStatus: "none", reason: "missing" };
  }

  if (subscription.status === "active") {
    if (!subscription.currentPeriodEnd || isFutureDate(subscription.currentPeriodEnd)) {
      return { hasAccess: true, accessStatus: "active", reason: "active" };
    }

    return { hasAccess: false, accessStatus: "expired", reason: "expired" };
  }

  if (subscription.status === "cancelled") {
    if (isFutureDate(subscription.currentPeriodEnd)) {
      return { hasAccess: true, accessStatus: "active", reason: "cancelled_period_active" };
    }

    return { hasAccess: false, accessStatus: "cancelled", reason: subscription.currentPeriodEnd ? "expired" : "cancelled" };
  }

  if (subscription.status === "past_due") {
    return { hasAccess: false, accessStatus: "past_due", reason: "payment_failed" };
  }

  if (subscription.status === "trialing") {
    return { hasAccess: false, accessStatus: "trialing", reason: "trial_not_enabled" };
  }

  return { hasAccess: false, accessStatus: "none", reason: "inactive" };
}

const getCurrentPaidAccessContextCached = cache(async function getCurrentPaidAccessContextCached(redirectIfMissingBusiness: boolean): Promise<PaidAccessContext | null> {
  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: redirectIfMissingBusiness });
  if (!currentBusiness) {
    return null;
  }

  const accessMode = getReveNewAccessMode();
  const previewPlan = getPreviewPlanById(getPreviewPlan());

  if (accessMode === "preview") {
    return {
      currentBusiness,
      subscription: null,
      hasAccess: Boolean(previewPlan),
      accessStatus: previewPlan ? "preview_active" : "preview_missing",
      reason: previewPlan ? "preview_plan_selected" : "preview_plan_required",
      accessMode,
      previewPlan
    };
  }

  if (!isSupabaseConfigured || currentBusiness.source === "demo") {
    return {
      currentBusiness,
      subscription: null,
      hasAccess: true,
      accessStatus: "demo_unconfigured",
      reason: "local_demo_without_supabase",
      accessMode,
      previewPlan: null
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Nu am putut verifica statutul. Încearcă din nou.");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,business_id,plan,status,current_period_end,created_at,updated_at")
    .eq("business_id", currentBusiness.business.id)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Paid access subscription lookup error", { code: error.code, message: error.message });
    throw new Error("Nu am putut verifica statutul. Încearcă din nou.");
  }

  const subscription = data
    ? {
        id: data.id,
        businessId: data.business_id,
        plan: data.plan,
        status: data.status,
        currentPeriodEnd: data.current_period_end,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    : null;

  return {
    currentBusiness,
    subscription,
    accessMode,
    previewPlan: null,
    ...evaluateSubscription(subscription)
  };
});

export async function getCurrentPaidAccessContext({ redirectIfMissingBusiness = false } = {}) {
  return getCurrentPaidAccessContextCached(Boolean(redirectIfMissingBusiness));
}

export async function requireActivePaidAccess() {
  const context = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: true });
  if (!context) {
    redirect("/onboarding");
  }

  if (!context.hasAccess) {
    redirect(`/access?reason=${encodeURIComponent(context.reason)}`);
  }

  return context;
}

export async function getPostBusinessDestination() {
  const context = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: false });
  if (!context) {
    return "/onboarding";
  }

  return context.hasAccess ? "/dashboard" : `/access?reason=${encodeURIComponent(context.reason)}`;
}
