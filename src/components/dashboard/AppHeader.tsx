import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export function AppHeader({ businessName, isDemo = false }: { businessName?: string; isDemo?: boolean }) {
  const displayName = businessName ? (isDemo ? `Demo ${businessName}` : businessName) : "Se încărca workspace-ul...";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/75 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="xl:hidden">
          <Logo />
        </div>
        <div className="hidden xl:block">
          <p className="text-sm text-zinc-400">{displayName}</p>
          <p className="text-lg font-semibold text-white">Centrul tau de crestere</p>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/opportunities" variant="secondary" className="hidden sm:inline-flex">
            Vezi oportunități
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-400/12 text-sm font-semibold text-gold-400">
            {(businessName ?? "M").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
