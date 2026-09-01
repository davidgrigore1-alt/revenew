export const marketingSections = [
  { id: "produs", label: "Produs", href: "#produs" },
  { id: "cum-functioneaza", label: "Cum funcționează", href: "#cum-functioneaza" },
  { id: "integrari", label: "Integrări", href: "#integrari" },
  { id: "preturi", label: "Prețuri", href: "#preturi" },
  { id: "securitate", label: "Securitate", href: "#securitate" },
  { id: "intrebari", label: "Întrebări", href: "#intrebari" }
] as const;

export type MarketingSectionId = (typeof marketingSections)[number]["id"];
