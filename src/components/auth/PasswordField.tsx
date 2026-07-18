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
      <span className="text-sm font-medium text-[rgb(var(--foreground))]">{label}</span>
      <span className="focus-within:focus-ring mt-2 flex min-h-11 items-center rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm transition-colors hover:border-[rgb(var(--border-strong))]">
        <input
          id={name}
          required
          name={name}
          minLength={8}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[rgb(var(--foreground))] outline-none placeholder:text-[rgb(var(--text-faint))]"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="focus-ring mr-1 min-h-9 rounded-control px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
          aria-pressed={visible}
        >
          {visible ? "Ascunde" : "Arată"}
        </button>
      </span>
    </label>
  );
}
