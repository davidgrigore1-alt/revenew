export type SearchableOption = { value: string; label: string };

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export function filterSearchableOptions(options: readonly SearchableOption[], query: string, limit = 60) {
  const normalizedQuery = normalizeSearchText(query);
  const matches = normalizedQuery
    ? options.filter((option) => normalizeSearchText(option.label).includes(normalizedQuery))
    : options;
  return matches.slice(0, limit);
}

export function exactSearchableOption(options: readonly SearchableOption[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  return options.find((option) => normalizeSearchText(option.label) === normalizedQuery);
}
