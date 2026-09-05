import "server-only";
import { createHash } from "node:crypto";
import { parseWorkbook } from "./workbook-parser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { inspectLocalDocument, LOCAL_DOCUMENT_BUCKET, LOCAL_DOCUMENT_PARSER, LocalDocumentError, type LocalDocumentVersion, type LocalDocumentSource, type LocalDocumentSegment } from "./local-document-core";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function actor(write = false) {
  const authorization = await requirePermission(write ? "documents.update" : "documents.read");
  const current = await getCurrentBusinessForUser({ redirectIfMissing: false });
  const client = await createSupabaseServerClient();
  if (!client || !current || current.source !== "supabase" || current.profileId !== authorization.profileId) throw new LocalDocumentError("forbidden", "Documentul nu este disponibil în spațiul autorizat.");
  return { client, businessId: current.business.id, profileId: current.profileId };
}
function admin() { const client = createSupabaseAdminClient(); if (!client) throw new LocalDocumentError("unavailable", "Păstrarea documentelor nu este disponibilă momentan. Reîncearcă."); return client; }
function check(error: unknown, retained = false) { if (error) throw new LocalDocumentError("unavailable", retained ? "Originalul poate fi păstrat, dar verificarea nu s-a încheiat. Deschide documentul și reîncearcă verificarea." : "Operațiunea nu a fost finalizată. Reîncearcă din document; disponibilitatea originalului nu este confirmată.", retained); }

export async function listLocalDocuments(query = "", limit = 25) {
  const { client, businessId } = await actor();
  let request = client.from("local_document_versions").select("*").eq("business_id", businessId).neq("state", "deleted").order("created_at", { ascending: false }).order("id").limit(Math.min(250, limit));
  if (query) request = request.ilike("original_filename", "%" + query.slice(0,100).replace(/[%_\\]/g, "\\$&") + "%");
  const result = await request; check(result.error);
  return result.data as LocalDocumentVersion[];
}
export async function getLocalDocument(sourceId: string, versionId?: string) {
  if (!uuid.test(sourceId) || (versionId && !uuid.test(versionId))) return null;
  const { client, businessId } = await actor();
  const source = await client.from("local_document_sources").select("*").eq("id", sourceId).eq("business_id", businessId).maybeSingle(); check(source.error);
  if (!source.data) return null;
  let query = client.from("local_document_versions").select("*").eq("source_id", sourceId).eq("business_id", businessId).order("created_at", { ascending: false }).limit(1);
  if (versionId) query = query.eq("id", versionId);
  const version = await query.maybeSingle(); check(version.error);
  if (!version.data) return null;
  const segments = version.data.state === "ready" && source.data.state === "active"
    ? await client.from("local_document_segments").select("row_number,cells").eq("business_id", businessId).eq("version_id", version.data.id).order("row_number").limit(1000)
    : { data: [], error: null };
  check(segments.error);
  return { source: source.data as LocalDocumentSource, version: version.data as LocalDocumentVersion, segments: segments.data as LocalDocumentSegment[] };
}

export async function saveLocalDocument(bytes: Uint8Array, filename: string, mime: string, sourceId?: string) {
  const { client, businessId } = await actor(true);
  const xlsx = /\.xlsx$/i.test(filename);
  if (xlsx) { await inspectWorkbookUpload(bytes,filename,mime); } else inspectLocalDocument(bytes, filename, mime);
  if (sourceId && !uuid.test(sourceId)) throw new LocalDocumentError("forbidden", "Documentul nu este disponibil.");
  const reservation = await client.rpc("reserve_local_document", { p_business: businessId, p_filename: filename, p_source: sourceId ?? null }); check(reservation.error);
  const version = reservation.data as LocalDocumentVersion;
  const storage = admin().storage.from(LOCAL_DOCUMENT_BUCKET);
  const upload = await storage.upload(version.object_key, bytes, { contentType: xlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv", upsert: false });
  if (upload.error) {
    await admin().from("local_document_versions").update({ state: "unavailable", failure_code: "upload_failed" }).eq("id",version.id).eq("state","reserved");
    return { sourceId: version.source_id, versionId: version.id, ready: false };
  }
  try { await finalizeLocalDocument(version.source_id, version.id); }
  catch {
    // The source identifies every attempted object. Explicit delete retries clean even late uploads.
    const source = await admin().from("local_document_sources").select("state").eq("id", version.source_id).single();
    if (source.data?.state !== "active") await storage.remove([version.object_key]);
    return { sourceId: version.source_id, versionId: version.id, ready: false };
  }
  return { sourceId: version.source_id, versionId: version.id, ready: true };
}
export async function finalizeLocalDocument(sourceId: string, versionId: string) {
  const { client } = await actor(true);
  const document = await getLocalDocument(sourceId, versionId);
  if (!document || document.source.state !== "active") throw new LocalDocumentError("forbidden", "Documentul nu mai este disponibil.");
  if (document.version.state === "ready") return;
  if (!["reserved", "verifying", "unavailable"].includes(document.version.state)) throw new LocalDocumentError("state", "Documentul nu poate fi verificat în starea curentă.");
  const access = await client.rpc("can_write_local_documents", { target_business_id: document.source.business_id });
  if (access.error || access.data !== true) throw new LocalDocumentError("forbidden", "Accesul la document a fost retras.");
  const stored = await admin().storage.from(LOCAL_DOCUMENT_BUCKET).download(document.version.object_key); check(stored.error, true);
  if (!stored.data || stored.data.size > 2097152) throw new LocalDocumentError("size", "Originalul nu poate fi verificat. Șterge această încărcare și alege un CSV de cel mult 2 MB.", true);
  const bytes = new Uint8Array(await stored.data.arrayBuffer());
  if (document.version.format === "xlsx") {
    const workbook = await inspectWorkbookUpload(bytes, document.version.original_filename, stored.data.type.split(";")[0]);
    check((await admin().rpc("finalize_local_workbook",{p_version:versionId,p_size:bytes.length,p_hash:createHash("sha256").update(bytes).digest("hex"),p_workbook:workbook})).error,true);
    return;
  }
  const verified = inspectLocalDocument(bytes, document.version.original_filename, stored.data.type.split(";")[0]);
  const result = await admin().rpc("finalize_local_document", { p_version: versionId, p_size: verified.size, p_hash: verified.hash, p_headers: verified.csv.headers, p_rows: verified.csv.rows, p_parser: LOCAL_DOCUMENT_PARSER }); check(result.error, true);
}
export async function inspectWorkbookUpload(bytes: Uint8Array, filename: string, mime: string) {
  await actor(true);
  if (!/\.xlsx$/i.test(filename) || filename.length>240 || /[\x00-\x1f/\\]/.test(filename) || !["","application/octet-stream","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(mime)) throw new LocalDocumentError("format","Alege un workbook XLSX valid. Acest format nu este disponibil.");
  return parseWorkbook(bytes);
}
export async function downloadLocalDocument(sourceId: string, versionId: string) {
  const { client } = await actor();
  const document = await getLocalDocument(sourceId, versionId);
  if (!document || document.source.state !== "active" || document.version.state !== "ready") throw new LocalDocumentError("forbidden", "Originalul nu este disponibil pentru acest cont.");
  // JWT Storage read rechecks RLS at byte access, including a membership change after metadata loading.
  const result = await client.storage.from(LOCAL_DOCUMENT_BUCKET).download(document.version.object_key); check(result.error, true);
  if (!result.data) throw new LocalDocumentError("unavailable", "Originalul nu a putut fi deschis. Reîncearcă.", true);
  return { blob: result.data, filename: document.version.original_filename };
}
export async function deleteLocalDocument(sourceId: string) {
  const { client, businessId } = await actor(true);
  if (!uuid.test(sourceId)) throw new LocalDocumentError("forbidden", "Documentul nu este disponibil.");
  const begin = await client.rpc("begin_local_document_delete", { p_source: sourceId }); check(begin.error);
  const versions = await client.from("local_document_versions").select("object_key").eq("source_id", sourceId).eq("business_id", businessId); check(versions.error);
  const keys = (versions.data ?? []).map(row => row.object_key as string);
  if (keys.length) {
    const removed = await admin().storage.from(LOCAL_DOCUMENT_BUCKET).remove(keys);
    if (removed.error) return { deleted: false };
  }
  const finish = await admin().rpc("finish_local_document_delete", { p_source: sourceId }); check(finish.error);
  return { deleted: true };
}
export async function associateLocalDocument(sourceId: string, opportunityId: string | null) {
  const { client } = await actor(true);
  if (!uuid.test(sourceId) || (opportunityId && !uuid.test(opportunityId))) throw new LocalDocumentError("forbidden", "Contextul nu este disponibil.");
  check((await client.rpc("associate_local_document", { p_source: sourceId, p_opportunity: opportunityId })).error);
}
