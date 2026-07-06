import "server-only";

type SupabaseLikeError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

function asSupabaseLikeError(error: unknown): SupabaseLikeError | null {
  if (!error || typeof error !== "object") return null;
  return error as SupabaseLikeError;
}

function normalizedErrorText(error: SupabaseLikeError) {
  return [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function isMissingRelationError(error: unknown, relationName: string) {
  const candidate = asSupabaseLikeError(error);
  if (!candidate || typeof candidate.code !== "string") return false;

  const relation = relationName.toLowerCase();
  const text = normalizedErrorText(candidate);

  if (candidate.code === "42P01") {
    return text.includes(relation);
  }

  if (candidate.code === "PGRST205") {
    return (
      text.includes(relation) &&
      text.includes("schema cache") &&
      (text.includes("could not find the table") || text.includes("relation does not exist"))
    );
  }

  return false;
}

export function toSafeDatabaseErrorMessage(error: unknown) {
  const candidate = asSupabaseLikeError(error);
  if (!candidate || typeof candidate.code !== "string") {
    return "database_error";
  }

  return candidate.code;
}

export type DatabaseErrorKind = "unique_conflict" | "constraint_failure" | "rls_denial" | "connection_error" | "missing_relation" | "unknown";

export function classifyDatabaseError(error: unknown): DatabaseErrorKind {
  const candidate = asSupabaseLikeError(error);
  if (!candidate || typeof candidate.code !== "string") {
    return "unknown";
  }

  if (candidate.code === "23505") return "unique_conflict";
  if (candidate.code === "23514") return "constraint_failure";
  if (candidate.code === "42501" || candidate.code === "PGRST301") return "rls_denial";
  if (candidate.code === "42P01" || candidate.code === "PGRST205") return "missing_relation";
  if (candidate.code.startsWith("08") || candidate.code === "57014") return "connection_error";

  return "unknown";
}

export const safeProfileInitializationMessage = "Nu am putut pregăti profilul contului. Încearcă din nou.";
