"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "warning" | "danger";
type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; href: string };
};
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-[rgb(var(--success-border))]",
  info: "border-[rgb(var(--info-border))]",
  warning: "border-[rgb(var(--warning-border))]",
  danger: "border-[rgb(var(--danger-border))]"
};

const icons: Record<ToastTone, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  danger: ExclamationTriangleIcon
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const showToast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    setToasts((items) => [...items.slice(-2), { ...input, id }]);
    window.setTimeout(() => dismiss(id), 6500);
  }, [dismiss]);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[90] flex flex-col items-end gap-2 sm:bottom-5 sm:left-auto sm:w-[min(26rem,calc(100vw-2rem))]" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const tone = toast.tone ?? "info";
          const Icon = icons[tone];
          return (
            <section key={toast.id} role={tone === "danger" ? "alert" : "status"} className={cn("pointer-events-auto w-full rounded-card border bg-[rgb(var(--surface-elevated))] p-4 text-[rgb(var(--foreground))] shadow-modal", toneClasses[tone])}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">{toast.title}</h2>
                  {toast.description ? <p className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">{toast.description}</p> : null}
                  {toast.action ? <Link href={toast.action.href} className="focus-ring mt-2 inline-flex rounded text-sm font-semibold text-[rgb(var(--primary))] hover:underline">{toast.action.label}</Link> : null}
                </div>
                <button type="button" onClick={() => dismiss(toast.id)} className="focus-ring -mr-1 -mt-1 rounded-control p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]" aria-label="Închide notificarea">
                  <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast trebuie folosit în ToastProvider.");
  return context;
}
