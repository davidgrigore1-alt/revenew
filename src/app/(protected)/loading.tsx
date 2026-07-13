import { PlaceholderGrid } from "@/components/dashboard/PlaceholderGrid";

export default function ProtectedLoading() {
  const items = Array.from({ length: 6 }, (_, index) => ({ title: `Se încarcă secțiunea ${index + 1}`, description: "Datele workspace-ului sunt pregătite." }));
  return <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8 xl:pb-8" aria-label="Se încarcă pagina"><PlaceholderGrid items={items} /></main>;
}
