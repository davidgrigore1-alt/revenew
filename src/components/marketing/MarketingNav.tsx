import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export function MarketingNav() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
      <Logo />
      <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-300 md:flex">
        <a href="#platforma" className="hover:text-white">
          Platforma
        </a>
        <a href="#flux" className="hover:text-white">
          Flux
        </a>
        <a href="#impact" className="hover:text-white">
          Impact
        </a>
      </nav>
      <div className="flex items-center gap-3">
        <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
          Intrare
        </Button>
        <Button href="/signup">Creează cont</Button>
      </div>
    </header>
  );
}
