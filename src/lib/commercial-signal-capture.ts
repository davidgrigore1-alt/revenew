import type { CommercialSignalSource } from "@/lib/types";

export type CommercialSignalCapture = {
  title?: string;
  source?: CommercialSignalSource;
  rawMessage?: string;
  contactEmail?: string;
  estimatedValueMin?: number;
  estimatedValueMax?: number;
  suggestedDueDate?: string;
};

export const manualCaptureSources = new Set<CommercialSignalSource>(["manual", "email", "whatsapp", "phone", "csv_import", "other"]);

export function validateCommercialSignalCapture(input: CommercialSignalCapture) {
  if (!input.title?.trim()) return "Titlul semnalului este obligatoriu.";
  if (!input.source || !manualCaptureSources.has(input.source)) return "Selectează o sursă validă pentru semnal.";
  if (!input.rawMessage?.trim()) return "Contextul sau textul semnalului este obligatoriu.";
  const email = input.contactEmail?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Emailul contactului nu este valid.";
  for (const value of [input.estimatedValueMin, input.estimatedValueMax]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) return "Valoarea estimată trebuie să fie un număr pozitiv.";
  }
  if (input.suggestedDueDate && Number.isNaN(Date.parse(input.suggestedDueDate))) return "Termenul selectat nu este valid.";
  return null;
}
