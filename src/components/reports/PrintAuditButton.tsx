"use client";

import { PrinterIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";

export function PrintAuditButton() {
  return (
    <Button onClick={() => window.print()} variant="secondary" className="print:hidden">
      <PrinterIcon className="h-4 w-4" aria-hidden="true" />
      Printează auditul
    </Button>
  );
}
