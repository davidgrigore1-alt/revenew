import Link from "next/link";
import { brand } from "@/lib/brand";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="focus-ring flex items-center gap-3 rounded-button" aria-label={brand.name}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--primary)_/_0.25)] bg-[rgb(var(--primary)_/_0.1)] text-sm font-black text-[rgb(var(--primary))]">
        {brand.mark}
      </span>
      <span className="leading-tight">
        <span className="block text-[22px] font-semibold tracking-normal text-[rgb(var(--foreground))]">{brand.name}</span>
      </span>
    </Link>
  );
}
