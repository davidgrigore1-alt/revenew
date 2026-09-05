"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ArchiveBoxIcon, BookmarkIcon, ChevronDownIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, StarIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SavedViewControls } from "@/components/filters/SavedViewControls";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { companyInitials } from "@/lib/crm/company-registry";
import { contactFilters, contactRoleLabels, filterContactRegistry, type ContactRegistryRow, type ContactRegistrySnapshot } from "@/lib/crm/contact-registry";
import type { CrmContact } from "@/lib/types";
import shared from "./CompaniesRegistry.module.css";
import styles from "./ContactsRegistry.module.css";

type Props = {
  snapshot: ContactRegistrySnapshot; query: string; filter: string; sort: string;
  onQuery: (value: string) => void; onFilter: (value: string) => void; onSort: (value: string) => void;
  selectedIds: Set<string>; onSelection: (ids: Set<string>) => void;
  onCreate: () => void; onEdit: (contact: CrmContact) => void; onArchive: (id: string) => void; pending: boolean;
  savedViews: Array<{ id: string; name: string; filter_state: Record<string, string> | null }>; currentQuery: string;
};

export function ContactsRegistryError({ message }: { message: string }) {
  const router = useRouter();
  return <ErrorState title="Contactele nu pot fi încărcate" description={message} onAction={() => router.refresh()} />;
}

function Identity({ contact }: { contact: CrmContact }) {
  const content = <><span className={styles.avatar} aria-hidden="true">{companyInitials(contact.fullName)}</span><span className={shared.identityText}><span className={styles.name} title={contact.fullName}>{contact.fullName}</span><span className={styles.secondary} title={contact.jobTitle ?? undefined}>{contact.jobTitle || "Funcție necompletată"}</span></span></>;
  if (contact.isActive !== true || contact.archivedAt) return <div className={shared.identity}>{content}</div>;
  return <Link href={`/crm/contacts/${contact.id}`} className={`${shared.identity} focus-ring`} aria-label={`Deschide contactul ${contact.fullName}`}>
    {content}
  </Link>;
}

function Company({ contact }: { contact: CrmContact }) {
  return contact.organization ? <Link href={`/crm/organizations/${contact.organization.id}`} className={`${styles.company} focus-ring`} title={contact.organization.name}>{contact.organization.name}</Link> : <span className={styles.secondary}>{contact.organizationId ? "Companie indisponibilă" : "Fără companie asociată"}</span>;
}

function Significance({ row }: { row: ContactRegistryRow }) {
  const inactive = row.contact.isActive === false || !!row.contact.archivedAt;
  return <div className={shared.cellText}>
    {inactive ? <span className={styles.secondary}>Contact inactiv</span> : row.contact.isActive !== true ? <span className={styles.secondary}>Stare neconfirmată</span> : row.primary === "confirmed" ? <span className={styles.primary}><StarIcon aria-hidden="true" />Contact principal</span> : row.primary === "ambiguous" ? <span className={styles.warning}>Principal de clarificat</span> : row.primary === "unknown" ? <span className={styles.secondary}>Principal neconfirmat</span> : null}
    <span className={styles.secondary}>{contactRoleLabels[row.contact.decisionRole ?? ""] ?? "Rol neconfirmat"}</span>
  </div>;
}

function Work({ row, complete }: { row: ContactRegistryRow; complete: boolean }) {
  const first = row.active[0];
  return <div className={shared.cellText}>
    {first ? <><span className={styles.workCount}>{complete ? "" : "≥ "}{row.active.length} {row.active.length === 1 ? "oportunitate activă" : "oportunități active"}</span><Link href={`/opportunities/${first.id}`} title={first.title} className={`${styles.workLink} focus-ring`}>{first.title}</Link></> : <span className={styles.secondary}>{complete ? "Fără oportunități active" : "Context incomplet"}</span>}
    {row.closedCount > 0 ? <span className={styles.history}>{complete ? "" : "≥ "}{row.closedCount} {row.closedCount === 1 ? "asociere închisă" : "asocieri închise"}{row.contact.isActive === true && !row.contact.archivedAt ? " · în detaliu" : ""}</span> : null}
  </div>;
}

export function ContactsRegistry({ snapshot, query, filter, sort, onQuery, onFilter, onSort, selectedIds, onSelection, onCreate, onEdit, onArchive, pending, savedViews, currentQuery }: Props) {
  const rows = useMemo(() => filterContactRegistry(snapshot.rows, query, filter, sort), [snapshot.rows, query, filter, sort]);
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.contact.id));
  const someSelected = rows.some((row) => selectedIds.has(row.contact.id));
  const hiddenSelections = selectedIds.size - rows.filter((row) => selectedIds.has(row.contact.id)).length;
  const filtered = !!query.trim() || filter !== "all";
  const clear = () => { onQuery(""); onFilter("all"); };
  const toggle = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); onSelection(next); };
  const selectAll = () => onSelection(allSelected ? new Set() : new Set(rows.map((row) => row.contact.id)));
  const selection = (contact: CrmContact) => <label className={shared.selectionTarget}><Checkbox checked={selectedIds.has(contact.id)} onChange={() => toggle(contact.id)} aria-label={`Selectează contactul ${contact.fullName}`} /></label>;
  const actions = (contact: CrmContact) => contact.isActive === true && !contact.archivedAt ? <div className={shared.rowActions}>
    <Button variant="ghost" size="icon" disabled={!snapshot.coverage.organizations || !!contact.organizationId && !contact.organization} aria-label={`Editează contactul ${contact.fullName}`} title="Editează contactul" onClick={() => onEdit(contact)}><PencilSquareIcon aria-hidden="true" /></Button>
    <Button variant="ghost" size="icon" disabled={pending} aria-label={`Arhivează contactul ${contact.fullName}`} title="Arhivează contactul" onClick={() => onArchive(contact.id)}><ArchiveBoxIcon aria-hidden="true" /></Button>
  </div> : null;

  return <section className={`${shared.registry} ${styles.registry}`} aria-label="Registru contacte">
    <div className={shared.toolbar}>
      <label className={shared.search}><span className="sr-only">Caută contacte</span><MagnifyingGlassIcon aria-hidden="true" /><Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Nume, funcție sau companie" /></label>
      <label className={shared.filter}><span className="sr-only">Relația contactului</span><Select value={filter} onChange={(event) => onFilter(event.target.value)}>{Object.entries(contactFilters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
      <label className={shared.filter}><span className="sr-only">Sortare</span><Select value={sort} onChange={(event) => onSort(event.target.value)}><option value="updated">Actualizare înregistrare</option><option value="name">Nume</option><option value="company">Companie</option></Select></label>
      <Button className={shared.create} disabled={!snapshot.coverage.organizations} onClick={onCreate}><PlusIcon className="size-4" aria-hidden="true" />Adaugă contact</Button>
    </div>
    <div className={shared.registryTools}>
      <SavedViewControls views={savedViews} currentQuery={currentQuery} targetPage="contacts" summary={<><BookmarkIcon className={shared.viewIcon} aria-hidden="true" /><span>Vizualizări private</span><span className={shared.viewCount}>({savedViews.length})</span><ChevronDownIcon className={shared.viewChevron} aria-hidden="true" /></>} />
      <div className={shared.results}><span role="status"><strong>{rows.length}</strong> {rows.length === 1 ? "contact afișat" : "contacte afișate"}{!snapshot.coverage.contacts ? " · cohortă parțială" : ""}</span>
        {selectedIds.size ? <span className={shared.selectionSummary}>{selectedIds.size} {selectedIds.size === 1 ? "selectat" : "selectate"}{hiddenSelections ? ` · ${hiddenSelections} ascunse de filtre` : ""}<Button variant="ghost" size="small" onClick={() => onSelection(new Set())}>Șterge selecția</Button></span> : null}
        {filtered ? <Button variant="ghost" size="small" onClick={clear}>Resetează filtrele</Button> : null}
      </div>
    </div>
    {Object.values(snapshot.coverage).some((value) => !value) ? <p className={shared.partial} role="status">Date parțiale. Căutarea și sortarea folosesc contactele încărcate. Totalurile și statutul principal pot rămâne neconfirmate.{!snapshot.coverage.organizations ? " Editarea așteaptă lista completă de companii." : ""}</p> : null}
    {rows.length ? <>
      <div className={shared.mobileSelect}><label className={shared.selectionTarget}><Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={selectAll} aria-label="Selectează contactele vizibile" /></label>Selectează contactele vizibile</div>
      <ul className={shared.mobileRecords} aria-label="Contacte">
        {rows.map((row) => <li key={row.contact.id} data-selected={selectedIds.has(row.contact.id)}>
          <div className={shared.mobileIdentity}>{selection(row.contact)}<Identity contact={row.contact} /></div>
          <div className={styles.mobileCompany}><Company contact={row.contact} /></div>
          <div className={styles.mobileSignificance}><Significance row={row} /></div>
          <div className={styles.mobileWork}><Work row={row} complete={snapshot.coverage.associations} />{actions(row.contact)}</div>
        </li>)}
      </ul>
      <div className={shared.tableViewport} role="region" aria-label="Tabel contacte" tabIndex={0}>
        <table className={`${shared.table} ${styles.table}`}><caption className="sr-only">Contacte și relațiile lor explicite. Compania este asocierea canonică; oportunitățile au asocieri separate.</caption>
          <colgroup><col style={{ width: "29%" }} /><col style={{ width: "23%" }} /><col style={{ width: "18%" }} /><col style={{ width: "23%" }} /><col style={{ width: "7%" }} /></colgroup>
          <thead><tr><th scope="col"><span className={shared.companyHeading}><label className={shared.selectionTarget}><Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={selectAll} aria-label="Selectează contactele vizibile" /></label>Contact / funcție</span></th><th scope="col">Companie</th><th scope="col">Rol în relație</th><th scope="col">Oportunități asociate</th><th scope="col"><span className="sr-only">Acțiuni</span></th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.contact.id} data-selected={selectedIds.has(row.contact.id)}>
            <th scope="row"><div className={shared.companyCell}>{selection(row.contact)}<Identity contact={row.contact} /></div></th>
            <td><Company contact={row.contact} /></td><td><Significance row={row} /></td><td><Work row={row} complete={snapshot.coverage.associations} /></td><td className={shared.actionsCell}>{actions(row.contact)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </> : <div className={shared.empty}><h2>{snapshot.rows.length === 0 ? snapshot.coverage.contacts ? "Adaugă primul contact" : "Contactele nu sunt disponibile" : query.trim() ? "Niciun contact găsit" : "Niciun contact în această selecție"}</h2><p>{snapshot.rows.length === 0 ? "Leagă persoanele de companie și de oportunitățile la care participă." : "Încearcă alt nume, o companie sau schimbă filtrul relației."}</p><Button variant="secondary" disabled={!snapshot.rows.length && !snapshot.coverage.organizations} onClick={snapshot.rows.length ? clear : onCreate}>{snapshot.rows.length ? "Resetează filtrele" : "Adaugă contact"}</Button></div>}
    <details className={shared.contextNote}><summary className="focus-ring">Despre relații și context<ChevronDownIcon className={shared.viewChevron} aria-hidden="true" /></summary><p>Contactul principal este activ și desemnat explicit pentru companie. Mai mulți candidați cer clarificare. Oportunitățile apar numai prin asocieri explicite; istoricul închis rămâne separat. Prima oportunitate afișată este cea actualizată cel mai recent. Actualizarea înregistrării contactului nu reprezintă o interacțiune comercială. Contactele inactive rămân în istoric, fără reactivare din acest registru.</p></details>
  </section>;
}
