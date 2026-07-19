"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ReportActions({ reportText, fileName = "revenew-report.txt" }: { reportText: string; fileName?: string }) {
  const [message, setMessage] = useState("");

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setMessage("Raport copiat.");
    } catch (error) {
      console.error("Report copy error", error);
      setMessage("Nu am putut copia automat raportul.");
    }
  }

  function downloadReport() {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Raport descărcat.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button onClick={copyReport}>Copiază raportul</Button>
      <Button onClick={downloadReport} variant="secondary">Descarcă .txt</Button>
      <Button onClick={() => window.print()} variant="secondary">Tipărește / PDF</Button>
      {message ? <span className="text-sm font-semibold text-[rgb(var(--success-text))]" role="status">{message}</span> : null}
    </div>
  );
}
