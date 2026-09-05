import styles from "./OperationalIntelligence.module.css";

export function IntelligenceAnalysisStatus() {
  // The request is active; the server does not report individual analysis stages.
  return <span className={styles.status} role="status" aria-live="polite" aria-atomic="true">
    <span className={styles.dot} aria-hidden="true" />Analizez contextul
  </span>;
}
