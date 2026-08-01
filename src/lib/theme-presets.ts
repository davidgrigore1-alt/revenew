import type { CSSProperties } from "react";

export const ACCENT_THEME_STORAGE_KEY = "revenew.theme.accent";
export const WORKSPACE_IDENTITY_STORAGE_KEY = "revenew.workspace.identityPreview";

export const accentTokenNames = [
  "--rn-accent",
  "--rn-accent-foreground",
  "--rn-accent-soft",
  "--rn-accent-muted",
  "--rn-accent-border",
  "--rn-accent-ring",
  "--rn-accent-glow",
  "--rn-accent-surface",
  "--rn-accent-950",
  "--rn-accent-900",
  "--rn-accent-800",
  "--rn-accent-700",
  "--rn-accent-600",
  "--rn-accent-500",
  "--rn-accent-400",
  "--rn-accent-300",
  "--rn-accent-100",
  "--rn-accent-50"
] as const;

export type AccentTokenName = (typeof accentTokenNames)[number];
export type AccentThemeId = "champagne" | "executive-blue" | "emerald" | "copper" | "burgundy" | "violet" | "graphite";

export type AccentThemePreset = {
  id: AccentThemeId;
  label: string;
  shortLabel: string;
  description: string;
  tokens: Record<AccentTokenName, string>;
};

function tokens(scale: {
  deep: string; deepest: string; strong: string; action: string; ring: string; accent: string; softAccent: string; pale: string; soft: string; surface: string; foreground?: string;
}): AccentThemePreset["tokens"] {
  return {
    "--rn-accent": scale.accent,
    "--rn-accent-foreground": scale.foreground ?? scale.deepest,
    "--rn-accent-soft": scale.soft,
    "--rn-accent-muted": scale.surface,
    "--rn-accent-border": scale.softAccent,
    "--rn-accent-ring": scale.ring,
    "--rn-accent-glow": scale.accent,
    "--rn-accent-surface": scale.surface,
    "--rn-accent-950": scale.deepest,
    "--rn-accent-900": scale.deep,
    "--rn-accent-800": scale.strong,
    "--rn-accent-700": scale.action,
    "--rn-accent-600": scale.ring,
    "--rn-accent-500": scale.accent,
    "--rn-accent-400": scale.softAccent,
    "--rn-accent-300": scale.pale,
    "--rn-accent-100": scale.soft,
    "--rn-accent-50": scale.surface
  };
}

export const accentThemePresets: AccentThemePreset[] = [
  {
    id: "champagne",
    label: "Champagne Gold · implicit ReveNew",
    shortLabel: "Champagne Gold",
    description: "Accent cald și editorial, semnătura vizuală ReveNew.",
    tokens: tokens({ deepest: "39 33 9", deep: "59 49 12", strong: "92 75 17", action: "128 103 24", ring: "171 139 43", accent: "214 183 74", softAccent: "226 201 104", pale: "235 218 155", soft: "249 241 207", surface: "253 250 239" })
  },
  {
    id: "executive-blue",
    label: "Executive Blue",
    shortLabel: "Executive Blue",
    description: "Albastru sobru pentru echipe executive și operaționale.",
    tokens: tokens({ deepest: "17 34 56", deep: "24 49 79", strong: "31 70 111", action: "42 92 142", ring: "61 116 169", accent: "91 143 195", softAccent: "129 170 208", pale: "173 201 227", soft: "226 237 247", surface: "242 247 251", foreground: "248 251 255" })
  },
  {
    id: "emerald",
    label: "Emerald",
    shortLabel: "Emerald",
    description: "Verde mineral calm, separat de verdele semantic pentru succes.",
    tokens: tokens({ deepest: "10 37 31", deep: "15 55 46", strong: "24 78 66", action: "34 102 86", ring: "49 126 106", accent: "76 151 129", softAccent: "112 176 154", pale: "162 207 190", soft: "224 241 234", surface: "242 248 245", foreground: "248 253 251" })
  },
  {
    id: "copper",
    label: "Copper",
    shortLabel: "Copper",
    description: "Cupru temperat, potrivit mediilor industriale și de servicii.",
    tokens: tokens({ deepest: "48 29 18", deep: "71 41 23", strong: "96 55 28", action: "124 71 35", ring: "153 91 48", accent: "181 116 72", softAccent: "204 148 105", pale: "225 184 150", soft: "244 224 207", surface: "251 243 236", foreground: "255 250 246" })
  },
  {
    id: "burgundy",
    label: "Burgundy",
    shortLabel: "Burgundy",
    description: "Vișiniu matur, distinct de roșul folosit pentru risc și eroare.",
    tokens: tokens({ deepest: "47 18 29", deep: "68 23 39", strong: "91 30 51", action: "116 40 64", ring: "142 52 77", accent: "166 78 101", softAccent: "190 112 132", pale: "215 159 173", soft: "243 224 231", surface: "250 242 245", foreground: "255 249 251" })
  },
  {
    id: "violet",
    label: "Violet",
    shortLabel: "Violet",
    description: "Violet executiv discret, fără gradient sau estetică de produs AI generic.",
    tokens: tokens({ deepest: "35 27 52", deep: "49 37 73", strong: "66 49 96", action: "84 64 119", ring: "105 84 143", accent: "130 109 164", softAccent: "158 139 188", pale: "191 177 211", soft: "231 224 240", surface: "247 243 250", foreground: "253 250 255" })
  },
  {
    id: "graphite",
    label: "Graphite Minimal",
    shortLabel: "Graphite Minimal",
    description: "Contrast redus și aproape monocrom pentru o prezență vizuală minimă.",
    tokens: tokens({ deepest: "26 27 27", deep: "41 43 43", strong: "61 64 63", action: "80 84 82", ring: "103 108 105", accent: "128 133 130", softAccent: "157 162 158", pale: "194 198 195", soft: "229 231 229", surface: "246 247 246", foreground: "255 255 253" })
  }
];

export const defaultAccentTheme: AccentThemeId = "champagne";

export function isAccentThemeId(value: unknown): value is AccentThemeId {
  return typeof value === "string" && accentThemePresets.some((preset) => preset.id === value);
}

export function getAccentThemePreset(id: AccentThemeId) {
  return accentThemePresets.find((preset) => preset.id === id) ?? accentThemePresets[0];
}

export function accentThemeStyle(id: AccentThemeId) {
  return getAccentThemePreset(id).tokens as unknown as CSSProperties;
}

export const workspaceIndustryOptions = [
  "Rent-a-car / leasing operațional",
  "Distribuție B2B",
  "Logistică / transport",
  "Clinici private",
  "Service auto / fleet services",
  "Construcții B2B",
  "Facility management",
  "Servicii B2B",
  "Altă industrie"
] as const;

export type WorkspaceCurrencyPreference = "RON" | "EUR" | "RON + EUR";
export type WorkspaceLanguagePreference = "ro" | "en-ready";

export type WorkspaceIdentityPreview = {
  displayName: string;
  initials: string;
  industry: string;
  currency: WorkspaceCurrencyPreference;
  language: WorkspaceLanguagePreference;
};

export function normalizeWorkspaceIdentityPreview(value: unknown): WorkspaceIdentityPreview | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WorkspaceIdentityPreview>;
  const currency = (["RON", "EUR", "RON + EUR"] as const).includes(candidate.currency as WorkspaceCurrencyPreference) ? candidate.currency as WorkspaceCurrencyPreference : "RON + EUR";
  const language = candidate.language === "en-ready" ? "en-ready" : "ro";
  return {
    displayName: String(candidate.displayName ?? "").trim().slice(0, 64),
    initials: String(candidate.initials ?? "").replace(/[^a-zA-Z0-9ĂÂÎȘȚăâîșț]/g, "").toLocaleUpperCase("ro-RO").slice(0, 4),
    industry: String(candidate.industry ?? "").trim().slice(0, 64),
    currency,
    language
  };
}
