export const marketingSections = [
  { id: "cum-functioneaza", label: "Cum funcționează", href: "#cum-functioneaza" },
  { id: "pentru-cine", label: "Pentru cine", href: "#pentru-cine" },
  { id: "ce-primesti", label: "Ce primești", href: "#ce-primesti" },
  { id: "control", label: "Control și siguranță", href: "#control" },
  { id: "preturi", label: "Prețuri", href: "#preturi" },
  { id: "intrebari", label: "Întrebări", href: "#intrebari" }
] as const;

export type MarketingSectionId = (typeof marketingSections)[number]["id"];
