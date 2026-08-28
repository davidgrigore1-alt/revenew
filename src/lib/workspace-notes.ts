"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const workspaceNoteTargetTypes = ["company", "contact", "opportunity"] as const;
export type WorkspaceNoteTargetType = typeof workspaceNoteTargetTypes[number];

export type WorkspaceNote = {
  id: string;
  targetType: WorkspaceNoteTargetType;
  targetId: string;
  content: string;
  pinned: boolean;
  authorProfileId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
};

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function pathForTarget(targetType: WorkspaceNoteTargetType, targetId: string) {
  if (targetType === "company") return `/crm/organizations/${targetId}`;
  if (targetType === "opportunity") return `/opportunities/${targetId}`;
  return "/contacts";
}

export async function getWorkspaceNotes(targetType: WorkspaceNoteTargetType, targetId: string): Promise<WorkspaceNote[]> {
  await requirePermission("workspace.read");
  if (!workspaceNoteTargetTypes.includes(targetType) || !validUuid(targetId)) return [];
  const [authorization, current, supabase] = await Promise.all([
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!authorization.profileId || !current || !supabase) return [];

  const { data, error } = await supabase
    .from("workspace_notes")
    .select("id,target_type,target_id,content,is_pinned,author_profile_id,created_at,updated_at")
    .eq("business_id", current.business.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error("Notele nu au putut fi încărcate.");
  }

  const authorIds = Array.from(new Set((data ?? []).map((row) => row.author_profile_id)));
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", authorIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const authorNames = new Map((authors ?? []).map((profile) => [profile.id, profile.full_name ?? "Membru echipă"]));

  return (data ?? []).map((row) => ({
    id: row.id,
    targetType: row.target_type as WorkspaceNoteTargetType,
    targetId: row.target_id,
    content: row.content,
    pinned: row.is_pinned,
    authorProfileId: row.author_profile_id,
    authorName: authorNames.get(row.author_profile_id) ?? "Membru echipă",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canEdit: row.author_profile_id === authorization.profileId
  }));
}

export async function createWorkspaceNote(targetType: WorkspaceNoteTargetType, targetId: string, formData: FormData) {
  await requirePermission("actions.create");
  const content = String(formData.get("content") ?? "").trim();
  if (!workspaceNoteTargetTypes.includes(targetType) || !validUuid(targetId)) return { ok: false, error: "Înregistrarea nu este validă." };
  if (!content || content.length > 5000 || /<script\b/i.test(content)) return { ok: false, error: "Nota trebuie să conțină între 1 și 5.000 de caractere." };

  const [authorization, current, supabase] = await Promise.all([
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!authorization.profileId || !current || !supabase) return { ok: false, error: "Nota nu poate fi salvată momentan." };

  const { error } = await supabase.from("workspace_notes").insert({
    business_id: current.business.id,
    author_profile_id: authorization.profileId,
    target_type: targetType,
    target_id: targetId,
    content,
    is_pinned: formData.get("isPinned") === "on"
  });
  if (error) return { ok: false, error: "Nota nu a putut fi salvată." };
  revalidatePath(pathForTarget(targetType, targetId));
  return { ok: true };
}

export async function updateWorkspaceNote(noteId: string, targetType: WorkspaceNoteTargetType, targetId: string, action: "pin" | "unpin" | "delete") {
  await requirePermission("actions.update");
  if (!validUuid(noteId) || !validUuid(targetId) || !workspaceNoteTargetTypes.includes(targetType)) return { ok: false };
  const [authorization, current, supabase] = await Promise.all([
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!authorization.profileId || !current || !supabase) return { ok: false };

  const base = supabase.from("workspace_notes");
  const query = action === "delete"
    ? base.delete()
    : base.update({ is_pinned: action === "pin" });
  const { error } = await query
    .eq("id", noteId)
    .eq("business_id", current.business.id)
    .eq("author_profile_id", authorization.profileId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  if (error) return { ok: false };
  revalidatePath(pathForTarget(targetType, targetId));
  return { ok: true };
}