import { CommercialInboxClient } from "@/components/inbox/CommercialInboxClient";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";

export default async function CommercialInboxPage() {
  const inbox = await getCommercialSignalsForCurrentBusiness();

  return (
    <PageShell
      eyebrow="Inbox Comercial"
      title="Inbox Comercial"
      description="Semnalele comerciale primite de firmă: apeluri, emailuri, formulare, mesaje și lead-uri care pot deveni oportunități."
      actions={<Button href="/opportunities">Vezi oportunități</Button>}
    >
      <CommercialInboxClient initialSignals={inbox.signals} tableReady={inbox.tableReady} setupMessage={inbox.setupMessage} />
    </PageShell>
  );
}
