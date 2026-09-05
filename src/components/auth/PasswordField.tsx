"use client";

import { Input } from "@/components/ui/Input";
import { useState, type ChangeEventHandler, type FocusEventHandler } from "react";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export function PasswordField({ name, label, autoComplete, placeholder = "Minim 8 caractere", invalid = false, describedBy, onBlur, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-medium text-[rgb(var(--foreground))]">{label}</span>
      <span className="mt-2 flex min-h-11 items-center rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm transition-colors hover:border-[rgb(var(--border-strong))]">
        <Input
          id={name}
          required
          name={name}
          minLength={8}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          invalid={invalid}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onChange={onChange}
          className="h-11 min-w-0 flex-1 rounded-r-none border-transparent shadow-none"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="focus-ring mr-1 min-h-9 rounded-control px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
          aria-pressed={visible}
          aria-label={visible ? `Ascunde ${label.toLocaleLowerCase("ro-RO")}` : `Arată ${label.toLocaleLowerCase("ro-RO")}`}
        >
          {visible ? "Ascunde" : "Arată"}
        </button>
      </span>
    </label>
  );
}
