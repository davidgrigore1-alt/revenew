"use client";

import { ErrorState } from "@/components/dashboard/ErrorState";

export default function ProtectedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-12"><ErrorState title="Pagina nu a putut fi încărcată" description="Conexiunea sau datele s-au schimbat între timp. Reîncearcă fără a pierde contextul din workspace." actionLabel="Reîncearcă" onAction={reset} /></div>;
}
