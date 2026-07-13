import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency = "EUR") {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "EUR";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(value?: string) {
  if (!value) {
    return "Fără termen";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTimeWithSeconds(value?: string) {
  if (!value) {
    return "Fără dată";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}
