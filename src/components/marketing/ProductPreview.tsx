import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

const attentionRows = [
  { company: "Delta Construct Solutions SRL", reason: "Follow-up restant", owner: "Andrei Munteanu", value: "132.000 RON", tone: "danger" },
  { company: "Nova Medical Systems SRL", reason: "Fără următorul pas", owner: "Ioana Pavel", value: "86.500 RON", tone: "warning" },
  { company: "Meridian Logistic Systems SRL", reason: "Revizuire astăzi", owner: "Mihai Dumitrescu", value: "48.000 RON", tone: "brand" }
] as const;

const toneClasses = {
  danger: "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]",
  warning: "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]",
  brand: "border-[rgb(var(--brand-300)/0.7)] bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] dark:border-[rgb(var(--brand-700))] dark:bg-[rgb(var(--brand-950)/0.72)] dark:text-[rgb(var(--brand-300))]"
};

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[660px]" aria-label="Vizualizare ilustrativă a Control Center-ului ReveNew">
      <div aria-hidden="true" className="marketing-ambient absolute -right-12 -top-10 h-44 w-44 rounded-full bg-[rgb(var(--brand-400)/0.14)] blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[rgb(var(--brand-700)/0.07)] blur-3xl" />

      <div className="relative overflow-hidden rounded-[1.3rem] border border-[rgb(var(--border-strong)/0.68)] bg-[rgb(var(--surface)/0.97)] shadow-[0_28px_76px_rgba(37,33,26,0.14)] dark:shadow-[0_30px_82px_rgba(0,0,0,0.34)]">
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle)/0.8)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-[rgb(var(--primary))] text-[0.625rem] font-black text-[rgb(var(--primary-foreground))]">RN</span>
            <div>
              <p className="text-xs font-semibold text-[rgb(var(--foreground))]">Control Center</p>
              <p className="text-[0.625rem] text-[rgb(var(--text-muted))]">Vizualizare produs · date ilustrative</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-2.5 py-1 text-[0.625rem] font-bold text-[rgb(var(--success-text))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--success-text))]" /> Control activ
          </span>
        </div>

        <div className="p-3 sm:p-5">
          <div className="rounded-panel border border-[rgb(var(--brand-400)/0.38)] bg-[linear-gradient(135deg,rgb(var(--brand-50)),rgb(var(--surface-elevated))_68%)] p-4 text-[rgb(var(--foreground))] shadow-card dark:bg-[linear-gradient(135deg,rgb(var(--surface-muted)),rgb(var(--surface-elevated))_72%)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Brief operațional · Astăzi</p>
                <p className="mt-2 max-w-md text-sm font-semibold leading-5 sm:text-base">Două intervenții comerciale trebuie clarificate înainte de următoarea etapă.</p>
              </div>
              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.7)] px-3 py-1.5 text-[0.625rem] font-semibold text-[rgb(var(--text-secondary))]">Ownership verificat</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Potențial urmărit", "480.500 RON"],
              ["Active", "9"],
              ["Scadente", "3"],
              ["În atenție", "2"]
            ].map(([label, value], index) => (
              <div key={label} className={`rounded-card border p-3 ${index === 0 ? "border-[rgb(var(--brand-500)/0.42)] bg-[rgb(var(--brand-50))] dark:bg-[rgb(var(--brand-950)/0.46)]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]"}`}>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">{label}</p>
                <p className="mt-2 text-sm font-bold tabular-nums text-[rgb(var(--foreground))] sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_0.75fr]">
            <section className="overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]" aria-labelledby="preview-attention-title">
              <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
                <div>
                  <p id="preview-attention-title" className="text-xs font-bold text-[rgb(var(--foreground))]">Necesită atenție astăzi</p>
                  <p className="mt-0.5 text-[0.625rem] text-[rgb(var(--text-muted))]">Prioritate, owner și valoare într-un singur loc</p>
                </div>
                <ArrowUpRightIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />
              </div>
              <div className="divide-y divide-[rgb(var(--border))]">
                {attentionRows.map((row) => (
                  <div key={row.company} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.72rem] font-bold text-[rgb(var(--foreground))]">{row.company}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.625rem] text-[rgb(var(--text-muted))]">
                        <span className={`rounded-full border px-2 py-0.5 font-semibold ${toneClasses[row.tone]}`}>{row.reason}</span>
                        <span className="inline-flex items-center gap-1"><UserCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />{row.owner}</span>
                      </div>
                    </div>
                    <p className="self-center whitespace-nowrap text-[0.7rem] font-bold tabular-nums text-[rgb(var(--foreground))]">{row.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4" aria-labelledby="preview-control-title">
              <p id="preview-control-title" className="text-xs font-bold text-[rgb(var(--foreground))]">Control și progres</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[0.625rem] font-semibold text-[rgb(var(--text-muted))]"><span>Cu owner</span><span>83%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"><div className="marketing-progress-fill h-full w-[83%] rounded-full bg-[rgb(var(--primary))]" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[0.625rem] font-semibold text-[rgb(var(--text-muted))]"><span>Cu next action</span><span>67%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"><div className="marketing-progress-fill h-full w-[67%] rounded-full bg-[rgb(var(--brand-400))]" /></div>
                </div>
              </div>
              <div className="mt-5 space-y-2 border-t border-[rgb(var(--border))] pt-4 text-[0.625rem] text-[rgb(var(--text-muted))]">
                <p className="flex items-center gap-2"><ExclamationTriangleIcon className="h-3.5 w-3.5 text-[rgb(var(--warning-text))]" aria-hidden="true" />1 oportunitate fără termen</p>
                <p className="flex items-center gap-2"><ClockIcon className="h-3.5 w-3.5 text-[rgb(var(--primary))]" aria-hidden="true" />Ultima verificare: astăzi</p>
                <p className="flex items-center gap-2"><CheckCircleIcon className="h-3.5 w-3.5 text-[rgb(var(--success-text))]" aria-hidden="true" />Deciziile rămân aprobate uman</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 right-5 hidden w-48 rounded-card border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-3 shadow-elevated sm:block">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Următorul pas</p>
        <p className="mt-1 text-xs font-semibold text-[rgb(var(--foreground))]">Revizuiește follow-up-ul prioritar</p>
      </div>
    </div>
  );
}
