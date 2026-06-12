"use client";

import { useState } from "react";

export function ReportActions({ reportText, fileName = "moneyhunter-report.txt" }: { reportText: string; fileName?: string }) {
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
    setMessage("Raport descarcat.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={copyReport} className="rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-mint-400">
        Copiaza raport
      </button>
      <button type="button" onClick={downloadReport} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.1]">
        Descarca .txt
      </button>
      <button type="button" onClick={() => window.print()} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.1]">
        Print / PDF
      </button>
      {message ? <span className="text-sm font-semibold text-mint-300">{message}</span> : null}
    </div>
  );
}
