type ErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function toUserFacingActionError(error: unknown, fallback = "Acțiunea nu a putut fi finalizată. Încearcă din nou.") {
  const candidate = error && typeof error === "object" ? error as ErrorLike : null;
  const code = typeof candidate?.code === "string" ? candidate.code.toUpperCase() : "";
  const message = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : typeof error === "string" ? error.toLowerCase() : "";

  if (code === "42501" || code === "PGRST301" || message.includes("permission denied") || message.includes("row-level security") || message.includes("not authorized")) {
    return "Nu ai permisiunea necesară pentru această acțiune. Cere acces responsabilului spațiului de lucru.";
  }
  if (code === "23505" || message.includes("duplicate key") || message.includes("already exists")) {
    return "Această înregistrare există deja. Verifică elementul existent înainte de a continua.";
  }
  if (code.startsWith("08") || code === "57014" || message.includes("failed to fetch") || message.includes("network")) {
    return "Conexiunea a fost întreruptă. Verifică rețeaua și încearcă din nou.";
  }

  return fallback;
}
