export type RomanianCountyCode =
  | "RO-AB" | "RO-AG" | "RO-AR" | "RO-B" | "RO-BC" | "RO-BH" | "RO-BN" | "RO-BR" | "RO-BT" | "RO-BV" | "RO-BZ"
  | "RO-CJ" | "RO-CL" | "RO-CS" | "RO-CT" | "RO-CV" | "RO-DB" | "RO-DJ" | "RO-GJ" | "RO-GL" | "RO-GR" | "RO-HD"
  | "RO-HR" | "RO-IF" | "RO-IL" | "RO-IS" | "RO-MH" | "RO-MM" | "RO-MS" | "RO-NT" | "RO-OT" | "RO-PH" | "RO-SB"
  | "RO-SJ" | "RO-SM" | "RO-SV" | "RO-TL" | "RO-TM" | "RO-TR" | "RO-VL" | "RO-VN" | "RO-VS";

export type RomanianCounty = Readonly<{ code: RomanianCountyCode; label: string }>;

export const romanianCounties = [
  { code: "RO-AB", label: "Alba" },
  { code: "RO-AG", label: "Argeș" },
  { code: "RO-AR", label: "Arad" },
  { code: "RO-B", label: "București" },
  { code: "RO-BC", label: "Bacău" },
  { code: "RO-BH", label: "Bihor" },
  { code: "RO-BN", label: "Bistrița-Năsăud" },
  { code: "RO-BR", label: "Brăila" },
  { code: "RO-BT", label: "Botoșani" },
  { code: "RO-BV", label: "Brașov" },
  { code: "RO-BZ", label: "Buzău" },
  { code: "RO-CJ", label: "Cluj" },
  { code: "RO-CL", label: "Călărași" },
  { code: "RO-CS", label: "Caraș-Severin" },
  { code: "RO-CT", label: "Constanța" },
  { code: "RO-CV", label: "Covasna" },
  { code: "RO-DB", label: "Dâmbovița" },
  { code: "RO-DJ", label: "Dolj" },
  { code: "RO-GJ", label: "Gorj" },
  { code: "RO-GL", label: "Galați" },
  { code: "RO-GR", label: "Giurgiu" },
  { code: "RO-HD", label: "Hunedoara" },
  { code: "RO-HR", label: "Harghita" },
  { code: "RO-IF", label: "Ilfov" },
  { code: "RO-IL", label: "Ialomița" },
  { code: "RO-IS", label: "Iași" },
  { code: "RO-MH", label: "Mehedinți" },
  { code: "RO-MM", label: "Maramureș" },
  { code: "RO-MS", label: "Mureș" },
  { code: "RO-NT", label: "Neamț" },
  { code: "RO-OT", label: "Olt" },
  { code: "RO-PH", label: "Prahova" },
  { code: "RO-SB", label: "Sibiu" },
  { code: "RO-SJ", label: "Sălaj" },
  { code: "RO-SM", label: "Satu Mare" },
  { code: "RO-SV", label: "Suceava" },
  { code: "RO-TL", label: "Tulcea" },
  { code: "RO-TM", label: "Timiș" },
  { code: "RO-TR", label: "Teleorman" },
  { code: "RO-VL", label: "Vâlcea" },
  { code: "RO-VN", label: "Vrancea" },
  { code: "RO-VS", label: "Vaslui" }
] as const satisfies readonly RomanianCounty[];

export function getRomanianCounty(value: string) {
  return romanianCounties.find((county) => county.code === value);
}

export function isRomanianCountyCode(value: string): value is RomanianCountyCode {
  return Boolean(getRomanianCounty(value));
}
