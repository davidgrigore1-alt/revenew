import { Select } from "@/components/ui/Select";
import { PageShell } from "@/components/dashboard/PageShell";
import {
  formatProductDateTime,
  presentSequenceState,
} from "@/lib/ui/presentation";
import { Button } from "@/components/ui/Button";
import {
  NewSequenceBuilder,
  SequenceStepBuilder,
} from "@/components/communication/SequenceStepBuilder";
import {
  archiveCommunicationTemplate,
  createCommunicationTemplate,
  exitSequenceEnrollment,
  enrollOpportunityInSequence,
  getCommunicationWorkspace,
  saveCommunicationSignature,
  saveResponseWindow,
  setSequenceStatus,
  updateCommunicationTemplate,
} from "@/lib/communication-workspace";

export const dynamic = "force-dynamic";

const sequenceStates = new Set([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
] as const);

const stepLabels = {
  email: "Email pregătit",
  wait: "Așteptare",
  manual_task: "Task manual",
} as const;

type SequenceStep = {
  type: "email" | "wait" | "manual_task";
  label: string;
  businessDays?: number;
};

const regionClass =
  "rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]";

const innerSurfaceClass =
  "rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]";

function sequenceLabel(value: string) {
  return sequenceStates.has(
    value as "draft" | "active" | "paused" | "completed" | "archived",
  )
    ? presentSequenceState(
        value as "draft" | "active" | "paused" | "completed" | "archived",
      ).label
    : "De verificat";
}

export default async function SequencesPage() {
  const workspace = await getCommunicationWorkspace();

  const activeSequences = workspace.sequences.filter(
    (sequence) => sequence.status === "active",
  ).length;

  const draftSequences = workspace.sequences.filter(
    (sequence) =>
      sequence.status === "draft" || sequence.status === "paused",
  ).length;

  const activeEnrollments = workspace.enrollments.filter(
    (item) => item.status === "active" || item.status === "paused",
  ).length;

  const enrollmentsBySequence = new Map<string, number>();

  for (const item of workspace.enrollments) {
    enrollmentsBySequence.set(
      item.sequence_id,
      (enrollmentsBySequence.get(item.sequence_id) ?? 0) + 1,
    );
  }

  const currentEnrollments = workspace.enrollments.filter(
    (item) => item.status === "active" || item.status === "paused",
  );

  const activeTemplates = workspace.templates.filter(
    (item) => item.status === "active",
  );

  return (
    <PageShell
      eyebrow="Comunicare controlată"
      title="Secvențe și mesaje"
      description="Pregătește comunicarea repetabilă, păstrează controlul uman și oprește secvența când contextul comercial se schimbă"
      actions={
        <Button href="/inbox" variant="secondary">
          Deschide Inbox Comercial
        </Button>
      }
    >
      <div className="grid gap-6">
        {/* Summary */}
        <section
          aria-label="Rezumat secvențe"
          className={`${regionClass} grid overflow-hidden sm:grid-cols-3`}
        >
          <div className="px-4 py-3.5 sm:border-r sm:border-[rgb(var(--border))]">
            <p className="micro-label">Active</p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {activeSequences}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Pregătesc pașii, fără trimitere autonomă
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 sm:border-r sm:border-t-0">
            <p className="micro-label">Draft / pauză</p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {draftSequences}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Inactive până la activare explicită
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 sm:border-t-0">
            <p className="micro-label">Înrolări curente</p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {activeEnrollments}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Pot fi oprite manual în orice moment
            </p>
          </div>
        </section>

        {/* Sequences */}
        <section className={`${regionClass} p-4 sm:p-5`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="micro-label">Execuție controlată</p>

              <h2 className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">
                Secvențe de outreach
              </h2>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Emailurile sunt pregătite pentru revizuire. Nu există
                trimitere autonomă.
              </p>
            </div>

            <span className="shrink-0 text-xs tabular-nums text-[rgb(var(--text-muted))]">
              {workspace.sequences.length} definite
            </span>
          </div>

          {workspace.sequences.length ? (
            <div
              className={`${innerSurfaceClass} mt-4 overflow-hidden divide-y divide-[rgb(var(--border))]`}
            >
              {workspace.sequences.map((sequence) => {
                const steps = Array.isArray(sequence.steps)
                  ? (sequence.steps as SequenceStep[])
                  : [];

                return (
                  <article
                    key={sequence.id}
                    className="grid gap-4 px-4 py-4 transition-colors hover:bg-[rgb(var(--surface-hover))] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">
                          {sequence.name}
                        </h3>

                        <span className="status-pill status-pill-neutral">
                          {sequenceLabel(sequence.status)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                        {sequence.description || "Fără descriere."}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-[rgb(var(--text-subtle))]">
                        {steps.map((step, index) => (
                          <span key={index}>
                            {index + 1}.{" "}
                            {step.label || stepLabels[step.type]}
                          </span>
                        ))}

                        <span>
                          {enrollmentsBySequence.get(sequence.id) ?? 0} înrolări
                        </span>
                      </div>

                      <details className="mt-3">
                        <summary className="focus-ring w-fit cursor-pointer list-none text-xs font-semibold text-[rgb(var(--primary))]">
                          Editează pașii
                        </summary>

                        <div className="mt-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3">
                          <SequenceStepBuilder
                            sequenceId={sequence.id}
                            initialSteps={steps}
                            disabled={
                              sequence.status === "active" ||
                              sequence.status === "archived"
                            }
                          />
                        </div>
                      </details>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {sequence.status === "active" ? (
                        <form action={setSequenceStatus}>
                          <input
                            type="hidden"
                            name="sequenceId"
                            value={sequence.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="paused"
                          />

                          <button className="focus-ring h-8 rounded-[8px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] px-3 text-xs font-semibold text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--surface-hover))]">
                            Pune în pauză
                          </button>
                        </form>
                      ) : sequence.status === "draft" ||
                        sequence.status === "paused" ? (
                        <form action={setSequenceStatus}>
                          <input
                            type="hidden"
                            name="sequenceId"
                            value={sequence.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="active"
                          />

                          <button className="focus-ring h-8 rounded-[8px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] px-3 text-xs font-semibold text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--surface-hover))]">
                            Activează pregătirea
                          </button>
                        </form>
                      ) : null}

                      {workspace.opportunities.length ? (
                        <details className="relative">
                          <summary className="focus-ring flex h-8 cursor-pointer list-none items-center rounded-[8px] bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))]">
                            Revizuiește înrolarea
                          </summary>

                          <div className="absolute right-0 z-20 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-[10px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-floating))] p-4 shadow-floating">
                            <p className="micro-label">
                              Confirmare explicită
                            </p>

                            <dl className="mt-3 grid gap-2 text-xs">
                              <div>
                                <dt className="text-[rgb(var(--text-muted))]">
                                  Expeditor
                                </dt>
                                <dd className="mt-0.5 font-semibold">
                                  {workspace.senderEmail ||
                                    "Conexiune Gmail de confirmat"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-[rgb(var(--text-muted))]">
                                  Plan
                                </dt>
                                <dd className="mt-0.5">
                                  {steps.length} pași · emailurile sunt doar
                                  pregătite pentru revizuire
                                </dd>
                              </div>

                              <div>
                                <dt className="text-[rgb(var(--text-muted))]">
                                  Ieșiri
                                </dt>
                                <dd className="mt-0.5">
                                  Răspuns primit · întâlnire programată ·
                                  oportunitate închisă · oprire manuală
                                </dd>
                              </div>
                            </dl>

                            <form
                              action={enrollOpportunityInSequence}
                              className="mt-4 grid gap-2"
                            >
                              <input
                                type="hidden"
                                name="sequenceId"
                                value={sequence.id}
                              />

                              <label className="text-[0.6875rem] text-[rgb(var(--text-muted))]">
                                Oportunitate

                                <Select
                                  name="opportunityId"
                                  aria-label="Oportunitate de înrolat"
                                  className="mt-1"
                                  density="compact"
                                >
                                  {workspace.opportunities.map(
                                    (opportunity) => (
                                      <option
                                        key={opportunity.id}
                                        value={opportunity.id}
                                      >
                                        {opportunity.companyName
                                          ? `${opportunity.companyName} · `
                                          : ""}
                                        {opportunity.title}
                                      </option>
                                    ),
                                  )}
                                </Select>
                              </label>

                              <button className="focus-ring mt-1 h-9 rounded-[8px] bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))]">
                                Confirmă înrolarea
                              </button>
                            </form>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`${innerSurfaceClass} mt-4 p-5`}>
              <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                Nu există secvențe
              </p>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Creează un draft controlat pentru a defini pașii înainte de
                activare.
              </p>
            </div>
          )}

          <details className="mt-4 border-t border-[rgb(var(--border))] pt-4">
            <summary className="focus-ring w-fit cursor-pointer list-none rounded-[8px] bg-[rgb(var(--primary))] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))]">
              Creează o secvență
            </summary>

            <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Noul flux pornește ca draft. Activarea pregătește pașii; nu
              trimite mesaje automat.
            </p>

            <div className={`${innerSurfaceClass} mt-3 p-4`}>
              <NewSequenceBuilder />
            </div>
          </details>

          {currentEnrollments.length ? (
            <div className="mt-5 border-t border-[rgb(var(--border))] pt-4">
              <div>
                <p className="micro-label">
                  Înrolări curente
                </p>

                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  Starea și următoarea activitate programată rămân vizibile;
                  oprirea este manuală.
                </p>
              </div>

              <div
                className={`${innerSurfaceClass} mt-3 overflow-hidden divide-y divide-[rgb(var(--border))]`}
              >
                {currentEnrollments.map((item) => {
                  const opportunity = workspace.opportunities.find(
                    (candidate) =>
                      candidate.id === item.opportunity_id,
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-xs"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[rgb(var(--foreground))]">
                          {opportunity?.title || "Oportunitate"}
                        </span>

                        <span className="mt-0.5 block truncate text-[rgb(var(--text-muted))]">
                          {item.status === "active"
                            ? "Activă"
                            : "În pauză"}{" "}
                          · pas {item.current_step + 1}
                          {item.next_step_at
                            ? ` · următorul pas ${formatProductDateTime(
                                item.next_step_at,
                                { year: false },
                              )}`
                            : " · fără activitate programată"}
                        </span>
                      </span>

                      <form action={exitSequenceEnrollment}>
                        <input
                          type="hidden"
                          name="enrollmentId"
                          value={item.id}
                        />

                        <button className="focus-ring font-semibold text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))]">
                          Oprește
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {/* Templates + signature */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className={`${regionClass} p-4 sm:p-5`}>
            <div>
              <p className="micro-label">
                Conținut reutilizabil
              </p>

              <h2 className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">
                Șabloane de workspace
              </h2>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Conținut reutilizabil, editabil înainte de fiecare trimitere.
              </p>
            </div>

            {activeTemplates.length ? (
              <div
                className={`${innerSurfaceClass} mt-4 overflow-hidden divide-y divide-[rgb(var(--border))]`}
              >
                {activeTemplates.map((template) => (
                  <article
                    key={template.id}
                    className="px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">
                          {template.name}
                        </h3>

                        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                          {template.subject ||
                            "Fără subiect predefinit"}
                        </p>
                      </div>

                      <form action={archiveCommunicationTemplate}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />

                        <button className="focus-ring text-xs font-semibold text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))]">
                          Arhivează
                        </button>
                      </form>
                    </div>

                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--text-subtle))]">
                      {template.body}
                    </p>

                    <details className="mt-3">
                      <summary className="focus-ring w-fit cursor-pointer list-none text-xs font-semibold text-[rgb(var(--primary))]">
                        Editează șablonul
                      </summary>

                      <form
                        action={updateCommunicationTemplate}
                        className="mt-3 grid gap-2 border-l border-[rgb(var(--border))] pl-3"
                      >
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />

                        <input
                          name="name"
                          required
                          maxLength={120}
                          defaultValue={template.name}
                          aria-label="Numele șablonului"
                          className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-xs"
                        />

                        <input
                          name="subject"
                          maxLength={500}
                          defaultValue={template.subject}
                          aria-label="Subiectul șablonului"
                          className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-xs"
                        />

                        <textarea
                          name="body"
                          required
                          maxLength={50000}
                          defaultValue={template.body}
                          rows={5}
                          aria-label="Conținutul șablonului"
                          className="focus-ring rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5 text-xs leading-5"
                        />

                        <button className="focus-ring h-8 w-fit rounded-[7px] border border-[rgb(var(--border-strong))] px-3 text-xs font-semibold">
                          Salvează modificările
                        </button>
                      </form>
                    </details>
                  </article>
                ))}
              </div>
            ) : null}

            <form
              action={createCommunicationTemplate}
              className={`${innerSurfaceClass} mt-4 grid gap-3 p-4`}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  name="name"
                  required
                  placeholder="Nume șablon"
                  className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"
                />

                <input
                  name="subject"
                  placeholder="Subiect"
                  className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"
                />
              </div>

              <textarea
                name="body"
                required
                rows={5}
                placeholder="Mesaj reutilizabil"
                className="focus-ring rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm leading-6"
              />

              <button className="focus-ring h-9 w-fit rounded-[8px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] px-4 text-sm font-semibold transition-colors hover:bg-[rgb(var(--surface-hover))]">
                Salvează șablonul
              </button>
            </form>
          </div>

          <div className={`${regionClass} p-4 sm:p-5`}>
            <div>
              <p className="micro-label">
                Identitate expeditor
              </p>

              <h2 className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">
                Semnătura mea
              </h2>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Se aplică numai utilizatorului curent și rămâne editabilă în
                composer.
              </p>
            </div>

            <form
              action={saveCommunicationSignature}
              className={`${innerSurfaceClass} mt-4 grid gap-3 p-4`}
            >
              <textarea
                name="signature"
                defaultValue={workspace.signature}
                rows={7}
                maxLength={4000}
                placeholder={"Cu stimă,\nNumele tău"}
                className="focus-ring rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm leading-6"
              />

              <button className="focus-ring h-9 w-fit rounded-[8px] bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))]">
                Salvează semnătura
              </button>
            </form>
          </div>
        </section>

        {/* Safety */}
        <section className={`${regionClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="micro-label">
                Reguli de siguranță
              </p>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Fereastra conservatoare previne alertele premature după un
                mesaj trimis.
              </p>
            </div>

            <form
              action={saveResponseWindow}
              className="flex items-end gap-2"
            >
              <label className="text-[0.6875rem] text-[rgb(var(--text-muted))]">
                Zile lucrătoare

                <input
                  name="businessDays"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={workspace.responseWindowBusinessDays}
                  className="focus-ring mt-1 block h-8 w-20 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-2 text-sm"
                />
              </label>

              <button className="focus-ring h-8 rounded-[8px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] px-3 text-xs font-semibold transition-colors hover:bg-[rgb(var(--surface-hover))]">
                Salvează
              </button>
            </form>
          </div>

          <div className="mt-4 grid overflow-hidden rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] text-xs leading-5 text-[rgb(var(--text-muted))] md:grid-cols-3 md:divide-x md:divide-[rgb(var(--border))]">
            <div className="p-4">
              <strong className="text-[rgb(var(--foreground))]">
                Ieșire la răspuns
              </strong>

              <p className="mt-1">
                Un răspuns nou oprește pregătirea pașilor următori.
              </p>
            </div>

            <div className="border-t border-[rgb(var(--border))] p-4 md:border-t-0">
              <strong className="text-[rgb(var(--foreground))]">
                Ieșire la întâlnire
              </strong>

              <p className="mt-1">
                O întâlnire programată suspendă follow-up-ul automatizat.
              </p>
            </div>

            <div className="border-t border-[rgb(var(--border))] p-4 md:border-t-0">
              <strong className="text-[rgb(var(--foreground))]">
                Control uman
              </strong>

              <p className="mt-1">
                V1 pregătește emailuri; nu le trimite autonom.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}