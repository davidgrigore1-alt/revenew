import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-mint-400/25 bg-mint-400/10 text-sm font-black text-mint-400 shadow-glow">
        MH
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-wide text-white">MoneyHunter</span>
        <span className="block text-xs font-medium text-zinc-400">AI Revenue Agent</span>
      </span>
    </Link>
  );
}
