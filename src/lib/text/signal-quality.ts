const FILLER_WORDS = new Set(["bla", "blah", "test", "asdf", "qwerty", "lorem", "ipsum"]);

function repeatedCharacterRun(value: string) {
  return /(.)\1{7,}/i.test(value);
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9ăâîșț]+/gi) ?? [];
}

export function isObviousFillerText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (repeatedCharacterRun(text)) return true;

  const words = tokenize(text);
  if (words.length === 0) return false;
  const fillerWords = words.filter((word) => FILLER_WORDS.has(word)).length;
  if (fillerWords >= 3 && fillerWords / words.length >= 0.5) return true;

  const uniqueWords = new Set(words);
  if (words.length >= 6 && uniqueWords.size <= 2) return true;

  return false;
}

export function cleanCommercialText(value: string | null | undefined, fallback = "Informație neconfirmată") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || isObviousFillerText(text)) return fallback;
  return text;
}

export function cleanCommercialLongText(value: string | null | undefined, fallback = "Nu există descriere comercială suficientă.") {
  const text = String(value ?? "").trim();
  if (!text || isObviousFillerText(text)) return fallback;
  return text;
}

export function missingDataItems(items: Array<[string, unknown]>) {
  return items
    .filter(([, value]) => {
      if (typeof value === "number") return !Number.isFinite(value) || value <= 0;
      if (Array.isArray(value)) return value.length === 0;
      return !String(value ?? "").trim();
    })
    .map(([label]) => label);
}
