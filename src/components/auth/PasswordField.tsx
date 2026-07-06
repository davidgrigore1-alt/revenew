"use client";

import { useState } from "react";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
};

export function PasswordField({ name, label, autoComplete, placeholder = "Minim 8 caractere" }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <span className="mt-2 flex h-12 items-center rounded-lg border border-white/10 bg-white/[0.06] transition focus-within:border-mint-400/60">
        <input
          id={name}
          required
          name={name}
          minLength={8}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-white outline-none placeholder:text-zinc-600"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="focus-ring mr-2 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-pressed={visible}
        >
          {visible ? "Ascunde" : "Arată"}
        </button>
      </span>
    </label>
  );
}
