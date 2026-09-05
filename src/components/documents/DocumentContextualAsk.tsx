"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CopilotConversation } from "@/components/intelligence/CopilotConversation";
import styles from "./Documents.module.css";

// Reuse the existing opportunity scope. This is not a document-body retrieval contract.
export function DocumentContextualAsk({ opportunityId, contextTitle }: { opportunityId: string; contextTitle: string }) {
  const [open, setOpen] = useState(false);
  return <section id="document-intelligence" className={styles.section} aria-labelledby="document-ask-title">
    <div className={styles.toolbar}><div><p className={styles.eyebrow}>Inteligență operațională</p><h2 id="document-ask-title">Înțelege contextul comercial</h2><p className={styles.meta}>Întrebarea pornește de la oportunitatea asociată: {contextTitle}.</p></div><Button aria-expanded={open} aria-controls="document-ask-conversation" onClick={()=>setOpen(value=>!value)}>{open?"Închide întrebarea":"Întreabă ReveNew"}</Button></div>
    <p className={styles.meta+" mt-3"}>ReveNew consultă dovezile disponibile în context. Accesul la această pagină nu înseamnă că întregul document a fost citit de AI; verifică sursele din răspuns.</p>
    <div id="document-ask-conversation" hidden={!open}>{open?<CopilotConversation className="mt-5" lockedContext={{pageType:"opportunity",opportunityId,route:`/opportunities/${opportunityId}`}} contextLabel={`Oportunitate · ${contextTitle}`} initialSuggestions={["Ce riscuri sunt susținute de dovezi?","Ce informații lipsesc pentru următorul pas?"]} autoFocus/>:null}</div>
  </section>;
}
