"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ArrowUpRightIcon, ArchiveBoxIcon, BookmarkIcon, ChevronDownIcon, InformationCircleIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SavedViewControls } from "@/components/filters/SavedViewControls";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { companyDomain, companyInitials, filterCompanyRegistry, registryActivityTime, relationshipLabels, type CompanyRegistrySnapshot, type CompanyRegistryRow, type RegistryCoverage } from "@/lib/crm/company-registry";
import type { CrmOrganization } from "@/lib/types";
import styles from "./CompaniesRegistry.module.css";

type Props = {
  snapshot: CompanyRegistrySnapshot;
  query: string; relationship: string; sort: string;
  onQuery: (value: string) => void; onRelationship: (value: string) => void; onSort: (value: string) => void;
  selectedIds: Set<string>; onSelection: (ids: Set<string>) => void;
  onCreate: () => void; onEdit: (organization: CrmOrganization) => void; onArchive: (id: string) => void;
  pending: boolean;
  savedViews: Array<{ id: string; name: string; filter_state: Record<string, string> | null }>;
  currentQuery: string;
};

export function CompaniesRegistryError({ message }: { message: string }) {
  const router = useRouter();
  return <ErrorState title="Companiile nu pot fi încărcate" description={message} onAction={() => router.refresh()} />;
}

function CompanyIdentity({ organization }: { organization: CrmOrganization }) {
  const domain = companyDomain(organization.website);
  return <Link href={`/crm/organizations/${organization.id}`} className={`${styles.identity} focus-ring`}>
    {/* Stable identity frame for a future approved/local logo. Only initials render today; no image requests. */}
    <span className={styles.avatar} data-company-identity="initials" aria-hidden="true">{companyInitials(organization.name)}</span>
    <span className={styles.identityText}>
      <span className={styles.companyName} title={organization.name}>{organization.name}</span>
      <span className={styles.secondary} title={domain ?? undefined}>{domain ?? "Domeniu necompletat"}</span>
    </span>
    <ArrowUpRightIcon className={styles.openIcon} aria-hidden="true" />
  </Link>;
}

function PrimaryContact({ row, complete }: { row: CompanyRegistryRow; complete: boolean }) {
  return <div className={styles.cellText}>
    <span className={row.primaryContact ? styles.mainText : styles.missing} title={row.primaryContact?.fullName}>{row.primaryContact?.fullName ?? (complete ? "Neconfirmat" : "Date incomplete")}</span>
    <span className={styles.secondary} title={row.primaryContact?.jobTitle ?? undefined}>{row.primaryContact?.jobTitle || (row.contactCount ? `${row.contactCount}${complete ? "" : "+"} contacte` : complete ? "Fără contact principal" : "Contacte indisponibile")}</span>
  </div>;
}

function ActiveOpportunities({ row, complete }: { row: CompanyRegistryRow; complete: boolean }) {
  return <span className={styles.number} title={complete ? "Oportunități deschise, fără cele câștigate, pierdute, descalificate sau arhivate." : "Numărul total nu poate fi confirmat din datele încărcate."}>
    {complete ? row.activeOpportunities : row.activeOpportunities ? `≥ ${row.activeOpportunities}` : "—"}
    {!complete ? <span className="sr-only"> Date incomplete</span> : null}
  </span>;
}

function Attention({ row, coverage }: { row: CompanyRegistryRow; coverage: RegistryCoverage }) {
  const first = row.attention[0];
  const complete = coverage.opportunities && coverage.associations && coverage.actions;
  if (!first) return <span className={styles.missing}>{complete ? "Niciun motiv identificat" : "Date incomplete"}</span>;
  const details = row.attention.map((item) => `${item.label}: ${item.count} ${item.count === 1 ? "oportunitate" : "oportunități"}`).join(" · ");
  return <Link href={`/crm/organizations/${row.organization.id}`} className={`${styles.attention} focus-ring`} title={details} aria-label={`${details}. Deschide ${row.organization.name}`}>
    <span className={styles.attentionLabel}><span className={styles.attentionDot} aria-hidden="true" /><span>{first.label}</span></span>
    <span className={styles.secondary}>{first.count} {first.count === 1 ? "oportunitate" : "oportunități"}{row.attention.length > 1 ? ` · +${row.attention.length - 1} ${row.attention.length === 2 ? "motiv" : "motive"}` : ""}{!complete ? " · parțial" : ""}</span>
  </Link>;
}

function LatestActivity({ row, observedAt, complete }: { row: CompanyRegistryRow; observedAt: string; complete: boolean }) {
  const activity = row.latestActivity;
  if (!activity) return <span className={styles.missing}>{complete ? "Fără activitate datată" : "Date incomplete"}</span>;
  const time = registryActivityTime(activity.occurredAt, observedAt);
  return <div className={styles.cellText} title={`${activity.label} · ${time.exact}${complete ? "" : " · Date parțiale"}`}>
    <span className={styles.activityLabel}>{activity.label}</span>
    <time className={styles.secondary} dateTime={activity.occurredAt} aria-label={time.exact}>{time.relative}{!complete ? " · parțial" : ""}</time>
  </div>;
}

export function CompaniesRegistry({ snapshot, query, relationship, sort, onQuery, onRelationship, onSort, selectedIds, onSelection, onCreate, onEdit, onArchive, pending, savedViews, currentQuery }: Props) {
  const rows = useMemo(() => filterCompanyRegistry(snapshot.rows, query, relationship, sort), [snapshot.rows, query, relationship, sort]);
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.organization.id));
  const someSelected = rows.some((row) => selectedIds.has(row.organization.id));
  const hiddenSelections = selectedIds.size - rows.filter((row) => selectedIds.has(row.organization.id)).length;
  const coverage = snapshot.coverage;
  const graphComplete = coverage.opportunities && coverage.associations;
  const activityComplete = graphComplete && coverage.actions && coverage.events;
  const filtered = Boolean(query.trim()) || relationship !== "all";
  const clearFilters = () => { onQuery(""); onRelationship("all"); };
  const toggle = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); onSelection(next); };
  const selectAll = () => onSelection(allSelected ? new Set() : new Set(rows.map((row) => row.organization.id)));
  const rowSelection = (organization: CrmOrganization) => <label className={styles.selectionTarget}>
    <Checkbox checked={selectedIds.has(organization.id)} onChange={() => toggle(organization.id)} aria-label={`Selectează compania ${organization.name}`} />
  </label>;
  const rowActions = (organization: CrmOrganization) => <div className={styles.rowActions}>
    <Button variant="ghost" size="icon" aria-label={`Editează compania ${organization.name}`} title="Editează compania" onClick={() => onEdit(organization)}><PencilSquareIcon className="size-4" aria-hidden="true" /></Button>
    <Button variant="ghost" size="icon" aria-label={`Arhivează compania ${organization.name}`} title="Arhivează compania" disabled={pending} onClick={() => onArchive(organization.id)}><ArchiveBoxIcon className="size-4" aria-hidden="true" /></Button>
  </div>;

  return <section className={styles.registry} aria-label="Registru companii">
    <div className={styles.toolbar} aria-label="Instrumente registru companii">
      <label className={styles.search}>
        <span className="sr-only">Caută companii</span><MagnifyingGlassIcon aria-hidden="true" />
        <Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Companie, industrie sau oraș" />
      </label>
      <label className={styles.filter}><span className="sr-only">Relație</span><Select value={relationship} onChange={(event) => onRelationship(event.target.value)}>
        <option value="all">Toate relațiile</option><option value="prospect">Prospect</option><option value="customer">Client</option><option value="partner">Partener</option><option value="inactive">Inactiv</option>
      </Select></label>
      <label className={styles.filter}><span className="sr-only">Sortare</span><Select value={sort} onChange={(event) => onSort(event.target.value)}>
        <option value="updated">Actualizare recentă</option><option value="name">Nume</option><option value="opportunities">Oportunități active</option>
      </Select></label>
      <Button onClick={onCreate} className={styles.create}><PlusIcon className="size-4" aria-hidden="true" />Adaugă companie</Button>
    </div>
    <div className={styles.registryTools}>
    <SavedViewControls views={savedViews} currentQuery={currentQuery} targetPage="companies" summary={<>
      <BookmarkIcon className={styles.viewIcon} aria-hidden="true" /><span>Vizualizări private</span>
      <span className={styles.viewCount} aria-label={`${savedViews.length} vizualizări salvate`}>({savedViews.length})</span>
      <ChevronDownIcon className={styles.viewChevron} aria-hidden="true" />
    </>} />
    <div className={styles.results}>
      <div role="status" aria-live="polite"><strong>{rows.length}</strong> {filtered ? `din ${snapshot.rows.length} companii` : "companii"}{!coverage.organizations ? " încărcate" : ""}</div>
      {selectedIds.size ? <div className={styles.selectionSummary}><span>{selectedIds.size} {selectedIds.size === 1 ? "selectată" : "selectate"}{hiddenSelections ? ` · ${hiddenSelections} ${hiddenSelections === 1 ? "ascunsă" : "ascunse"} de filtre` : ""}</span><Button variant="ghost" size="small" onClick={() => onSelection(new Set())}>Șterge selecția</Button></div> : null}
      {filtered ? <Button variant="ghost" size="small" onClick={clearFilters}><XMarkIcon className="size-3.5" aria-hidden="true" />Resetează filtrele</Button> : null}
    </div>
    </div>
    {Object.values(coverage).some((value) => !value) ? <p className={styles.partial} role="status">Date parțiale. Căutarea și sortarea folosesc înregistrările încărcate; totalurile și informațiile lipsă nu pot fi confirmate.</p> : null}

    {rows.length ? <>
      <div className={styles.mobileSelect}><label className={styles.selectionTarget}><Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={selectAll} aria-label="Selectează companiile vizibile" /></label><span>Selectează companiile vizibile</span></div>
      <ul className={styles.mobileRecords} aria-label="Companii">
        {rows.map((row) => <li key={row.organization.id} data-selected={selectedIds.has(row.organization.id)}>
          <div className={styles.mobileIdentity}>{rowSelection(row.organization)}<CompanyIdentity organization={row.organization} /></div>
          <div className={styles.mobileRelationship}>{relationshipLabels[row.organization.relationshipStatus ?? ""] ?? "Neclasificată"}<span>·</span><ActiveOpportunities row={row} complete={graphComplete} /><span>{graphComplete && row.activeOpportunities === 1 ? "oportunitate activă" : "oportunități active"}</span></div>
          <dl className={styles.mobileContext}>
            <div><dt>Contact principal</dt><dd><PrimaryContact row={row} complete={coverage.contacts} /></dd></div>
            <div><dt>Atenție</dt><dd><Attention row={row} coverage={coverage} /></dd></div>
          </dl>
          <div className={styles.mobileFooter}><LatestActivity row={row} observedAt={snapshot.observedAt} complete={activityComplete} />{rowActions(row.organization)}</div>
        </li>)}
      </ul>
      <div className={styles.tableViewport} role="region" aria-label="Tabel companii, derulare orizontală" tabIndex={0}>
        <table className={styles.table}>
          <caption className="sr-only">Companii din spațiul de lucru curent. Atenția urmărește oportunitățile active; activitatea include profilul și oportunitățile asociate.</caption>
          <colgroup><col style={{ width: "26%" }} /><col style={{ width: "10%" }} /><col style={{ width: "15%" }} /><col style={{ width: "10%" }} /><col style={{ width: "18%" }} /><col style={{ width: "13%" }} /><col style={{ width: "8%" }} /></colgroup>
          <thead><tr>
            <th scope="col"><span className={styles.companyHeading}><label className={styles.selectionTarget}><Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={selectAll} aria-label="Selectează companiile vizibile" /></label>Companie</span></th>
            <th scope="col">Relație</th><th scope="col">Contact principal</th><th scope="col" className={styles.numericHeading} title="Oportunități active"><span aria-hidden="true">Oportunități</span><span className="sr-only">Oportunități active</span></th><th scope="col">Atenție</th><th scope="col">Ultima activitate CRM</th><th scope="col"><span className="sr-only">Acțiuni</span></th>
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.organization.id} data-selected={selectedIds.has(row.organization.id)}>
            <th scope="row"><div className={styles.companyCell}>{rowSelection(row.organization)}<CompanyIdentity organization={row.organization} /></div></th>
            <td><span className={row.organization.relationshipStatus ? styles.relationship : styles.missing}>{relationshipLabels[row.organization.relationshipStatus ?? ""] ?? "Neclasificată"}</span></td>
            <td><PrimaryContact row={row} complete={coverage.contacts} /></td>
            <td className={styles.numericCell}><ActiveOpportunities row={row} complete={graphComplete} /></td>
            <td><Attention row={row} coverage={coverage} /></td>
            <td><LatestActivity row={row} observedAt={snapshot.observedAt} complete={activityComplete} /></td>
            <td className={styles.actionsCell}>{rowActions(row.organization)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <details className={styles.contextNote}>
        <summary className="focus-ring"><InformationCircleIcon aria-hidden="true" />Despre atenție și activitate<ChevronDownIcon className={styles.viewChevron} aria-hidden="true" /></summary>
        <p>Oportunitățile afișate sunt active. Atenția indică follow-up-uri întârziate, responsabili neatribuiți și pași următori lipsă. Activitatea include evenimentele și actualizările oportunităților și acțiunilor asociate; actualizările profilului companiei sunt etichetate separat. Pentru semnale, aprobări și dovezi, deschide compania.</p>
      </details>
    </> : <div className={styles.empty}>
      <h2>{snapshot.rows.length === 0 ? coverage.organizations ? "Adaugă prima companie" : "Companiile nu sunt disponibile" : query.trim() ? "Nicio companie găsită" : "Nicio companie în această relație"}</h2>
      <p>{snapshot.rows.length === 0 ? "Leagă persoanele și oportunitățile de o companie pentru a urmări relația comercială." : "Încearcă alt nume, alt oraș sau modifică relația selectată."}</p>
      <Button variant="secondary" onClick={snapshot.rows.length ? clearFilters : onCreate}>{snapshot.rows.length ? "Resetează filtrele" : "Adaugă companie"}</Button>
    </div>}
  </section>;
}
