"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DemoExampleActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyExample() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" className="min-h-10 px-4" onClick={copyExample}>
        Copiaza exemplul
      </Button>
      {copied ? <span className="text-sm font-semibold text-mint-300">Copiat.</span> : null}
    </div>
  );
}
