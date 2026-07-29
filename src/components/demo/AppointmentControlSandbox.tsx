"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { atelierBellezzaSandbox } from "@/lib/appointment-sandbox-fixtures";
import {
  applyReceptionistInput,
  buildReceptionistSlotProposal,
  createReceptionistPendingBooking,
  getNextReceptionistPrompt,
  reopenReceptionistPreferences,
  startReceptionistSandbox
} from "@/lib/text-receptionist-sandbox";

const timeWindows = [
  { value: "09:00-12:00", label: "Dimineață · 09:00–12:00", start: "09:00", end: "12:00" },
  { value: "12:00-17:00", label: "După-amiază · 12:00–17:00", start: "12:00", end: "17:00" },
  { value: "09:00-17:00", label: "Flexibil · 09:00–17:00", start: "09:00", end: "17:00" }
] as const;

const safetyFacts = [
  ["Mod", "Sandbox local"],
  ["Google Calendar", "Neconectat"],
  ["Programare reală", "Nu este creată"],
  ["Aprobare", "Obligatorie"]
] as const;

export function AppointmentControlSandbox() {
  const [state, setState] = useState(startReceptionistSandbox);
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setPreferredDate] = useState("2026-08-04");
  const [timeWindow, setTimeWindow] = useState<(typeof timeWindows)[number]["value"]>("09:00-17:00");
  const [staffId, setStaffId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const prompt = useMemo(() => getNextReceptionistPrompt(atelierBellezzaSandbox, state), [state]);

  function reset() {
    setState(startReceptionistSandbox());
    setServiceId("");
    setPreferredDate("2026-08-04");
    setTimeWindow("09:00-17:00");
    setStaffId("");
    setCustomerName("");
    setNotes("");
  }

  function apply(input: Parameters<typeof applyReceptionistInput>[2]) {
    setState((current) => applyReceptionistInput(atelierBellezzaSandbox, current, input));
  }

  const selectedWindow = timeWindows.find((item) => item.value === timeWindow) ?? timeWindows[2];

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Limitele sandbox-ului">
        {safetyFacts.map(([label, value]) => (
          <div key={label} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <p className="text-label text-[rgb(var(--primary))]">Atelier Bellezza Demo</p>
            <CardTitle>{prompt.title}</CardTitle>
            <CardDescription>{prompt.prompt}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {state.stage === "disclosure" ? (
              <Button onClick={() => apply({ acknowledgeDisclosure: true })}>Am înțeles · continuă simularea</Button>
            ) : null}

            {state.stage === "collect_service" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                  Serviciu
                  <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                    <option value="">Selectează serviciul</option>
                    {prompt.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </label>
                <Button disabled={!serviceId} onClick={() => apply({ selectedServiceId: serviceId })}>Confirmă serviciul</Button>
              </>
            ) : null}

            {state.stage === "collect_date" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                  Data demonstrativă
                  <Input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} />
                </label>
                <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Fixture-ul local include disponibilitate pentru 4 august 2026.</p>
                <Button disabled={!preferredDate} onClick={() => apply({ preferredDate })}>Confirmă data</Button>
              </>
            ) : null}

            {state.stage === "collect_time_window" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                  Interval preferat
                  <Select value={timeWindow} onChange={(event) => setTimeWindow(event.target.value as (typeof timeWindows)[number]["value"])}>
                    {timeWindows.map((window) => <option key={window.value} value={window.value}>{window.label}</option>)}
                  </Select>
                </label>
                <Button onClick={() => apply({ preferredTimeWindow: { start: selectedWindow.start, end: selectedWindow.end } })}>Confirmă intervalul</Button>
              </>
            ) : null}

            {state.stage === "collect_staff_preference" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                  Persoană preferată · opțional
                  <Select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                    <option value="">Fără preferință</option>
                    {prompt.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </label>
                <Button onClick={() => apply(staffId ? { preferredStaffId: staffId } : { skipStaffPreference: true })}>Continuă</Button>
              </>
            ) : null}

            {state.stage === "collect_customer_details" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                  Nume client · opțional
                  <Input value={customerName} maxLength={120} onChange={(event) => setCustomerName(event.target.value)} placeholder="Client demonstrativ" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                  Notă · opțional
                  <Textarea value={notes} maxLength={500} rows={3} onChange={(event) => setNotes(event.target.value)} placeholder="Preferință relevantă pentru operator" />
                </label>
                <Button onClick={() => apply({
                  customerName,
                  notes,
                  continueWithoutCustomerDetails: !customerName.trim() && !notes.trim()
                })}>Pregătește verificarea</Button>
              </>
            ) : null}

            {state.stage === "propose_slots" ? (
              <Button onClick={() => setState((current) => buildReceptionistSlotProposal(atelierBellezzaSandbox, current))}>
                Propune intervale locale
              </Button>
            ) : null}

            {state.stage === "create_pending_booking" ? (
              <Button variant="secondary" onClick={() => setState((current) => reopenReceptionistPreferences(current))}>
                Schimbă data sau preferința
              </Button>
            ) : null}

            {state.stage === "no_slots_available" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => setState((current) => reopenReceptionistPreferences(current))}>
                  Schimbă preferințele
                </Button>
                <Button variant="secondary" onClick={reset}>Reia simularea</Button>
              </div>
            ) : null}

            {state.stage === "handoff" ? (
              <Button variant="secondary" onClick={reset}>Pornește o simulare nouă</Button>
            ) : null}

            {state.lastError ? (
              <p role="alert" className="rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-3 py-2 text-sm text-[rgb(var(--danger-text))]">
                {state.lastError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="subtle">
          <CardHeader>
            <CardTitle>Rezultat controlat</CardTitle>
            <CardDescription>Propunerile provin exclusiv din fixture și reguli locale. Nicio selecție nu confirmă o programare.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.stage === "create_pending_booking" ? (
              <div className="grid gap-3">
                {state.proposedSlots.map((proposal, index) => (
                  <article key={proposal.slotId} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Opțiunea {index + 1}</p>
                      <span className="rounded-pill border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--warning-text))]">{proposal.statusLabel}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{proposal.explanation}</p>
                    <Button
                      className="mt-4 w-full sm:w-auto"
                      size="small"
                      onClick={() => setState((current) => createReceptionistPendingBooking(atelierBellezzaSandbox, current, proposal.slotId))}
                    >
                      Selectează pentru aprobare
                    </Button>
                  </article>
                ))}
              </div>
            ) : state.stage === "handoff" && state.pendingBooking && state.handoffSummary ? (
              <div className="grid gap-4">
                <div className="rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--warning-text))]">În așteptarea aprobării</p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--foreground))]">{state.handoffSummary.selectedSlot} · {state.handoffSummary.staffMember}</p>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{state.handoffSummary.approvalStatus}. {state.handoffSummary.deliveryStatus}.</p>
                </div>
                <dl className="grid gap-3 text-sm">
                  {[
                    ["Serviciu", state.handoffSummary.requestedService],
                    ["Preferință", state.handoffSummary.requestedDateAndWindow],
                    ["Client", state.handoffSummary.customerSummary],
                    ["Efect extern", state.handoffSummary.externalEffectStatus]
                  ].map(([label, value]) => (
                    <div key={label} className="grid gap-1 border-b border-[rgb(var(--border))] pb-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                      <dt className="text-[rgb(var(--text-muted))]">{label}</dt>
                      <dd className="font-medium text-[rgb(var(--foreground))]">{value}</dd>
                    </div>
                  ))}
                </dl>
                {state.handoffSummary.missingOptionalInformation.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">Informații opționale lipsă</p>
                    <ul className="mt-2 grid gap-1 text-sm text-[rgb(var(--text-secondary))]">
                      {state.handoffSummary.missingOptionalInformation.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-[rgb(var(--border))] p-5 text-sm leading-6 text-[rgb(var(--text-muted))]">
                Completează pașii din stânga. Aici vor apărea intervalele locale și, după selecție, rezumatul pentru operator.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
