const secretPatterns = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /sk-[A-Za-z0-9_-]+/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /("(?:authorization|cookie|apiKey|api_key|token|secret|serviceRoleKey)"\s*:\s*")[^"]+(")/gi
];

export function redactSensitiveText(value: string) {
  return secretPatterns.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value);
}

export function redactForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveText(value).slice(0, 800);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(redactForLog);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (/authorization|cookie|api|key|token|secret|payload|prompt|raw|content/i.test(key)) {
          return [key, "[redacted]"];
        }
        return [key, redactForLog(entry)];
      })
    );
  }
  return value;
}
