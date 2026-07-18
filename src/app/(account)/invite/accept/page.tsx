import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getCurrentAuthUser } from "@/lib/auth/profile";
import { acceptWorkspaceInvitation } from "@/lib/enterprise-governance-internal";

export default async function InviteAcceptPage({ searchParams }: { searchParams: { token?: string; error?: string } }) {
  const token = String(searchParams.token ?? "");
  const user = await getCurrentAuthUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/accept?token=${encodeURIComponent(token)}`)}`);
  async function accept() { "use server"; const result = await acceptWorkspaceInvitation(token); if (result.ok) redirect("/dashboard"); redirect(`/invite/accept?token=${encodeURIComponent(token)}&error=invalid`); }
  return <main className="mx-auto grid min-h-screen max-w-xl place-content-center gap-5 px-4 py-12"><div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6"><p className="text-sm font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Invitație workspace</p><h1 className="mt-2 text-2xl font-semibold">Acceptă accesul în echipă</h1><p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">Acceptarea este permisă numai contului autentificat cu adresa invitată. Linkul este cu utilizare unică și expiră.</p>{searchParams.error ? <p role="alert" className="mt-4 rounded-lg bg-rose-400/10 p-3 text-sm">Invitația este invalidă, expirată, revocată, deja utilizată sau nu corespunde contului.</p> : null}<form action={accept} className="mt-6"><Button type="submit">Acceptă invitația</Button></form><Link href="/login" className="mt-4 inline-block text-sm text-[rgb(var(--primary))]">Schimbă contul</Link></div></main>;
}
