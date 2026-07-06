"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { previewPlanCookieName, getReveNewAccessMode } from "@/lib/billing/paid-access";
import { isPreviewPlanId, type PreviewPlanId } from "@/lib/billing/plans";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { safeInternalRedirect } from "@/lib/auth/redirects";

const previewPlanCookieMaxAge = 60 * 60 * 24 * 30;

export async function selectPreviewPlan(planId: PreviewPlanId, redirectTo = "/dashboard") {
  if (getReveNewAccessMode() !== "preview") {
    redirect("/access?reason=paid_mode");
  }

  if (!isPreviewPlanId(planId)) {
    redirect("/access?reason=invalid_preview_plan");
  }

  await getCurrentBusinessForUser({ redirectIfMissing: true });

  cookies().set(previewPlanCookieName, planId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: previewPlanCookieMaxAge
  });

  redirect(safeInternalRedirect(redirectTo, "/dashboard"));
}
