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
      description="Semnalele comerciale primite de firma: apeluri, emailuri, formulare, mesaje si lead-uri care pot deveni oportunitati."
      actions={<Button href="/opportunities">Vezi oportunitati</Button>}
    >
      <CommercialInboxClient initialSignals={inbox.signals} tableReady={inbox.tableReady} setupMessage={inbox.setupMessage} />
    </PageShell>
  );
}
