const rows = [
  ["Contract corporate flotă temporară", "48.000 EUR", "Ridicat"],
  ["Grant digitalizare IMM", "22.500 EUR", "Mediu"],
  ["Client vechi nereactivat", "8.200 EUR", "Rapid"]
];

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-ink-900/90 p-4 shadow-premium backdrop-blur">
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-mint-400">
            Demo pentru firmă B2B din București
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Pipeline detectat</h2>
        </div>
        <div className="rounded-lg border border-gold-400/25 bg-gold-400/10 px-3 py-2 text-right">
          <p className="text-xs text-zinc-400">Valoare</p>
          <p className="font-semibold text-gold-400">78.700 EUR</p>
        </div>
      </div>

      <div className="grid gap-3">
        {rows.map(([name, value, priority]) => (
          <div
            key={name}
            className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-white/8 bg-white/[0.045] p-4"
          >
            <div>
              <p className="font-medium text-white">{name}</p>
              <p className="mt-1 text-sm text-zinc-400">Actiune recomandata pregatita</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">{value}</p>
              <p className="mt-1 text-xs text-mint-400">{priority}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-zinc-400">
        <div className="rounded-lg bg-white/[0.05] p-3">
          <span className="block text-lg font-semibold text-white">31</span>
          oportunități
        </div>
        <div className="rounded-lg bg-white/[0.05] p-3">
          <span className="block text-lg font-semibold text-white">12</span>
          acțiuni pregătite
        </div>
        <div className="rounded-lg bg-white/[0.05] p-3">
          <span className="block text-lg font-semibold text-white">4.8x</span>
          ROI estimat
        </div>
      </div>
    </div>
  );
}
