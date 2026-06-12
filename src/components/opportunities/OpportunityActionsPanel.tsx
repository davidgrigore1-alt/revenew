"use client";

import { useState } from "react";
import { ActionButton } from "@/components/dashboard/ActionButton";

const actions = [
  ["Genereaza email outreach", "Email pregatit pentru revizuire si contact comercial."],
  ["Genereaza script apel", "Script structurat: introducere, calificare, propunere si urmatorul pas."],
  ["Genereaza draft oferta", "Draft cu context, solutie, beneficii, estimare si pasi urmatori."],
  ["Genereaza checklist", "Checklist operational pentru contact, termen, oferta si follow-up."],
  ["Programeaza follow-up", "Actiune pregatita pentru urmatorul pas comercial."]
];

export function OpportunityActionsPanel() {
  const [state, setState] = useState("Status neschimbat");

  return (
    <div className="grid gap-3">
      {actions.map(([label, result], index) => (
        <ActionButton key={label} label={label} result={result} variant={index === 0 ? "primary" : "secondary"} />
      ))}
      <div className="mt-2 flex flex-wrap gap-2">
        {["Marcheaza contactat", "Marcheaza castigat", "Marcheaza pierdut", "Ignora"].map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setState(label)}
            className="min-h-10 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-400">{state}</p>
    </div>
  );
}
