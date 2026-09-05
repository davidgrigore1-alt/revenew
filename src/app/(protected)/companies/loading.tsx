import { PageShell } from "@/components/dashboard/PageShell";
import styles from "@/components/crm/CompaniesRegistry.module.css";

export default function CompaniesLoading() {
  return <PageShell wide eyebrow="Relații comerciale" title="Companii" description="Portofoliul comercial: relația curentă, oamenii implicați și oportunitățile care cer atenție.">
    <div role="status" aria-busy="true">
      <p className={styles.loadingStatus}>Se încarcă registrul companiilor…</p>
      <div aria-hidden="true" className={styles.loadingRows}>
        {Array.from({ length: 6 }, (_, index) => <div key={index}><span /><span /><span /></div>)}
      </div>
    </div>
  </PageShell>;
}
