"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type ActionButtonProps = {
  label: string;
  result: string;
  variant?: "primary" | "secondary";
};

export function ActionButton({ label, result, variant = "secondary" }: ActionButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setActive(true)}
        className={cn(
          "min-h-10 rounded-lg px-4 text-sm font-semibold transition",
          variant === "primary"
            ? "bg-mint-500 text-ink-950 hover:bg-mint-400"
            : "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
        )}
      >
        {label}
      </button>
      {active ? (
        <p className="mt-2 rounded-lg border border-white/10 bg-ink-900/80 p-3 text-sm leading-6 text-zinc-300">
          {result}
        </p>
      ) : null}
    </div>
  );
}
