"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { recordProductEvent } from "@/lib/product-events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const targetPages = new Set(["opportunities", "pipeline", "companies", "contacts", "activities"]);
const allowedFilters = new Set(["q", "status", "lifecycle", "commercialType", "attention", "due", "owner", "contact", "decisionMaker", "sort", "page"]);

function parseFilterState(value: string) {
  const params = new URLSearchParams(value.slice(0, 2000));
  const entries: Array<[string, string]> = [];
  params.forEach((item, key) => { if (allowedFilters.has(key) && item.length <= 160) entries.push([key, item]); });
  return Object.fromEntries(entries);
}

export async function getSavedViews(targetPage: string) {
  await requirePermission("workspace.read");
  if (!targetPages.has(targetPage)) return [];
  const [authorization, current, supabase] = await Promise.all([
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!authorization.profileId || !current || !supabase) return [];
  const { data, error } = await supabase.from("saved_views").select("id,name,target_page,filter_state,sort_state,updated_at").eq("business_id", current.business.id).eq("profile_id", authorization.profileId).eq("target_page", targetPage).order("updated_at", { ascending: false }).limit(30);
  if (error) throw new Error("Vizualizările salvate nu au putut fi încărcate.");
  return data ?? [];
}

export async function createSavedView(formData: FormData) {
  await requirePermission("workspace.read");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const targetPage = String(formData.get("targetPage") ?? "");
  if (!name || !targetPages.has(targetPage)) return { ok: false, error: "Completează un nume valid pentru vizualizare." };
  const [authorization, current, supabase] = await Promise.all([
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!authorization.profileId || !current || !supabase) return { ok: false, error: "Vizualizarea nu poate fi salvată momentan." };
  const filterState = parseFilterState(String(formData.get("query") ?? ""));
  const sortState = filterState.sort ? { sort: filterState.sort } : {};
  const { error } = await supabase.from("saved_views").insert({ business_id: current.business.id, profile_id: authorization.profileId, name, target_page: targetPage, filter_state: filterState, sort_state: sortState });
  if (error) return { ok: false, error: error.code === "23505" ? "Există deja o vizualizare cu acest nume." : "Vizualizarea nu a putut fi salvată." };
  void recordProductEvent("saved_view_created", { businessId: current.business.id, metadata: { target_page: targetPage } });
  revalidatePath(`/${targetPage}`);
  return { ok: true };
}

export async function deleteSavedView(id: string) {
  await requirePermission("workspace.read");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  const [authorization, current, supabase] = await Promise.all([
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!authorization.profileId || !current || !supabase) return { ok: false };
  const { error } = await supabase.from("saved_views").delete().eq("id", id).eq("business_id", current.business.id).eq("profile_id", authorization.profileId);
  if (error) return { ok: false };
  revalidatePath("/opportunities");
  return { ok: true };
}
