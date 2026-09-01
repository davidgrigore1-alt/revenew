import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  EyeIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { IntegrationBrandIcon, type IntegrationBrand } from "@/components/ui/IntegrationBrandIcon";

function Eyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return (
    <p
      className={`text-[0.66rem] font-bold uppercase tracking-[0.19em] ${
        inverse ? "text-[#dfc77f]" : "text-[#8f5d13]"
      }`}
    >
      {children}
    </p>
  );
}

function GoldIconBadge({
  children,
  dark = false,
  size = "md"
}: {
  children: ReactNode;
  dark?: boolean;
  size?: "sm" | "md";
}) {
  const outerSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const innerSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  return (
    <span
      className={`inline-flex ${outerSize} shrink-0 items-center justify-center rounded-full border ${
        dark
          ? "border-[#d8bd76]/24 bg-[#d8bd76]/[0.08] text-[#dfc77f]"
          : "border-[#d9c79b] bg-[#faf1da] text-[#89580f] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_18px_rgba(120,90,35,0.08)]"
      }`}
    >
      <span
        className={`flex ${innerSize} items-center justify-center rounded-full ${
          dark ? "bg-black/10" : "bg-white/60"
        }`}
      >
        {children}
      </span>
    </span>
  );
}

function ContextNodeIcon({ id }: { id: "company" | "contact" | "document" | "owner" }) {
  switch (id) {
    case "company":
      return <BuildingOffice2Icon className="h-4 w-4" aria-hidden="true" />;
    case "document":
      return <DocumentCheckIcon className="h-4 w-4" aria-hidden="true" />;
    case "contact":
      return <UserIcon className="h-4 w-4" aria-hidden="true" />;
    case "owner":
      return <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />;
    default:
      return <UserIcon className="h-4 w-4" aria-hidden="true" />;
  }
}

export function HeroProductStage({ children }: { children: ReactNode }) {
  return (
    <div className="landing-v3-hero-stage relative px-0 pb-6 pt-3 sm:px-4 sm:pb-9 lg:px-10 lg:pb-12">
      <div
        className="landing-v3-hero-orbit pointer-events-none absolute inset-x-[8%] bottom-[8%] top-0 rounded-[50%]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1120px]">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white/50">
          <span>Inteligență operațională · vedere controlată</span>
          <span className="inline-flex items-center gap-2 text-[#9de0c5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#54c596]" />
            Context autorizat
          </span>
        </div>
        <div className="landing-v3-hero-product relative z-10">{children}</div>
      </div>
    </div>
  );
}

export function CredibilityBand() {
  const truths = [
    [MagnifyingGlassIcon, "01", "Dovadă lângă decizie", "Sursa, momentul și relația comercială rămân inspectabile."],
    [ShieldCheckIcon, "02", "Control înainte de efect", "Pregătirea, aprobarea și execuția sunt stări distincte."],
    [DocumentCheckIcon, "03", "Adevăr financiar", "Estimarea susține prioritatea; nu devine venit confirmat."],
    [EyeIcon, "04", "Urme verificabile", "Actorul, decizia și schimbarea rămân în istoricul autorizat."]
  ] as const;

  return (
    <div className="overflow-hidden rounded-[1.2rem] border border-[#d6d0c3] bg-[#fbfaf7] text-[#111216] shadow-[0_18px_55px_rgba(27,24,18,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[#ded9cd] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <Eyebrow>Contract de încredere</Eyebrow>
          <p className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[#111216]">
            Claritate operațională, fără promisiuni inventate.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#acd8c4] bg-[#edf9f3] px-3 py-1.5 text-xs font-semibold text-[#125f43]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2a9b70]" />
          Control uman activ
        </span>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4">
        {truths.map(([Icon, number, title, copy], index) => (
          <article
            key={title}
            className={`group relative min-h-[190px] p-5 sm:p-6 ${index < 3 ? "border-b border-[#ded9cd] xl:border-b-0 xl:border-r" : ""} ${index === 0 ? "md:border-r" : ""} ${index === 1 ? "xl:border-r" : ""} ${index === 2 ? "md:border-r" : ""}`}
          >
            <div className="flex items-center justify-between">
              <GoldIconBadge>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </GoldIconBadge>
              <span className="font-mono text-[0.62rem] tracking-[0.12em] text-[#8f897f]">{number}</span>
            </div>
            <h3 className="mt-6 text-base font-semibold text-[#111216]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#5e626a]">{copy}</p>
            <span
              className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-[#a97019] transition-transform duration-300 group-hover:scale-x-100"
              aria-hidden="true"
            />
          </article>
        ))}
      </div>
    </div>
  );
}

export function OperationalDiagnostic() {
  const records = [
    ["Vector Industrial", "76.000 RON", "Ofertă trimisă"],
    ["Nova Medical", "36.000 RON", "Follow-up"],
    ["Meridian Logistics", "42.000 RON", "Negociere"]
  ] as const;
  const findings = [
    ["Termen depășit", "Acțiunea promisă nu a fost confirmată", "Astăzi"],
    ["Responsabil neclar", "Decizia nu are owner verificat", "De atribuit"],
    ["Pas următor lipsă", "Oferta există, continuarea nu", "În atenție"]
  ] as const;

  return (
    <div className="overflow-hidden rounded-[1.2rem] border border-[#d2ccbf] bg-white shadow-[0_24px_70px_rgba(33,28,19,0.09)]">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <section
          className="border-b border-[#ded9ce] bg-[#f7f6f2] p-5 text-[#111216] sm:p-6 lg:border-b-0 lg:border-r"
          aria-labelledby="crm-register-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.15em] text-[#696e76]">Registru tradițional</p>
              <h3 id="crm-register-title" className="mt-2 text-lg font-semibold text-[#111216]">
                Ce există
              </h3>
            </div>
            <span className="rounded-full border border-[#d7d2c8] bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-[#60656d]">
              3 înregistrări
            </span>
          </div>

          <div className="mt-5 divide-y divide-[#dcd7cd] border-y border-[#dcd7cd]">
            {records.map(([name, value, state]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#111216]">{name}</p>
                  <p className="mt-1 text-xs text-[#686d75]">{state}</p>
                </div>
                <p className="text-xs font-semibold tabular-nums text-[#3f454e]">{value}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-[#626770]">
            Datele există, dar registrul nu explică unde s-a rupt execuția.
          </p>
        </section>

        <section
          className="relative overflow-hidden bg-[#101113] p-5 text-white sm:p-6"
          aria-labelledby="attention-diagnostic-title"
        >
          <div className="landing-v3-scan pointer-events-none absolute inset-0 opacity-24" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.15em] text-[#dfc77f]">Diagnostic ReveNew</p>
              <h3 id="attention-diagnostic-title" className="mt-2 text-lg font-semibold text-white">
                Ce necesită atenție
              </h3>
            </div>
            <span className="rounded-full border border-[#d8bd76]/35 bg-[#d8bd76]/10 px-2.5 py-1 text-[0.65rem] font-semibold text-[#efd999]">
              3 rupturi
            </span>
          </div>

          <div className="relative mt-5 grid gap-2.5">
            {findings.map(([title, copy, state], index) => (
              <article
                key={title}
                className="landing-v3-diagnostic-row grid gap-3 rounded-[0.75rem] border border-white/12 bg-white/[0.05] p-3.5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <GoldIconBadge dark size="sm">
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                </GoldIconBadge>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/68">{copy}</p>
                </div>
                <span className="w-fit rounded-full border border-white/12 bg-white/[0.025] px-2.5 py-1 text-[0.62rem] font-semibold text-white/72">
                  {state}
                </span>
              </article>
            ))}
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-4">
            <p className="text-xs text-white/60">Prioritate explicabilă, nu scor abstract.</p>
            <p className="text-xs font-semibold text-[#e6cb82]">Revizuire umană necesară</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ExecutiveCommercialDiagnostic() {
  const signals = ["Termen depășit", "Responsabil neclar", "Pas următor lipsă"] as const;

  return (
    <aside
      className="landing-v3-executive-diagnostic mt-6 overflow-hidden rounded-[1rem] border border-[#d1c8b6] bg-[#f8f6f0] text-[#111216] shadow-[0_18px_45px_rgba(35,29,19,0.08)]"
      aria-label="Diagnostic comercial ilustrativ"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd7ca] px-4 py-3.5">
        <div>
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#89580f]">Diagnostic executiv</p>
          <p className="mt-1 text-[0.62rem] text-[#676c74]">Scenariu ilustrativ de produs</p>
        </div>
        <span className="rounded-full border border-[#d4c8ac] bg-white px-2.5 py-1 text-[0.58rem] font-semibold text-[#5f594f]">
          3 situații
        </span>
      </div>
      <div className="grid sm:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-[#ddd7ca] p-4 sm:border-b-0 sm:border-r">
          <p className="text-2xl font-semibold tracking-[-0.045em] text-[#16171a] tabular-nums">154.000 RON</p>
          <p className="mt-1 text-[0.66rem] font-semibold leading-5 text-[#555b64]">Expunere comercială estimată</p>
        </div>
        <div className="grid divide-y divide-[#e2ddd2] px-4 py-2">
          {signals.map((signal) => (
            <p key={signal} className="flex items-center gap-2 py-2 text-[0.66rem] font-medium text-[#42474f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a96d16]" />
              {signal}
            </p>
          ))}
        </div>
      </div>
      <p className="border-t border-[#ddd7ca] bg-white/75 px-4 py-3 text-[0.62rem] font-semibold text-[#5f584d]">
        Expunere estimată <span aria-hidden="true">≠</span><span className="sr-only">nu este</span> venit confirmat
      </p>
    </aside>
  );
}

export function ProcessJourney() {
  const steps = [
    ["01", "Detectează", "Semnal", "Situația comercială care cere atenție devine vizibilă."],
    ["02", "Înțelege", "Context", "Dovezile disponibile și informațiile lipsă sunt separate."],
    ["03", "Prioritizează", "Decizie", "Momentul, impactul și responsabilul explică ordinea."],
    ["04", "Pregătește", "Draft", "Următorul pas rămâne editabil și încă neaprobat."],
    ["05", "Verifică", "Rezultat", "Execuția și rezultatul se confirmă separat, după efect."]
  ] as const;

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-[#d5cfc2] bg-[#f7f5ef] text-[#111216] shadow-[0_22px_65px_rgba(26,23,17,0.07)]">
      <div className="grid border-b border-[#ded9ce] bg-white px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
        <div>
          <Eyebrow>Fir operațional</Eyebrow>
          <p className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[#111216]">O singură relație de la semnal la rezultat.</p>
        </div>
        <p className="mt-3 text-xs text-[#5f656e] sm:mt-0">Fără salturi între pregătire și efect</p>
      </div>

      <ol className="relative grid lg:grid-cols-5" aria-label="Proces comercial controlat în cinci pași">
        {steps.map(([number, title, state, copy], index) => (
          <li
            key={title}
            className={`landing-v3-flow-step relative grid grid-cols-[auto_1fr] gap-4 border-b border-[#ded9ce] p-5 last:border-b-0 lg:block lg:min-h-[250px] lg:border-b-0 lg:border-r lg:last:border-r-0 ${
              index === 2 ? "bg-[#fff4dc]" : "bg-[#fbfaf7]"
            }`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7c18c] bg-white text-[0.65rem] font-bold text-[#82530f]">
              {number}
            </div>
            <div className="lg:mt-8">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.13em] text-[#89580f]">{state}</p>
              <h3 className="mt-2 text-base font-semibold text-[#111216]">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#5f646d]">{copy}</p>
            </div>
            {index < steps.length - 1 ? (
              <ArrowRightIcon
                className="absolute -bottom-2.5 left-[1.9rem] z-10 h-5 w-5 rotate-90 rounded-full border border-[#d6cfbf] bg-[#f7f5ef] p-1 text-[#8c6f3c] lg:-right-2.5 lg:bottom-auto lg:left-auto lg:top-8 lg:rotate-0"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 border-t border-[#ded9ce] bg-white px-5 py-4 text-xs text-[#5f646c] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p>Fiecare etapă păstrează contextul, actorul și starea.</p>
        <p className="font-semibold text-[#754a0d]">Pregătit ≠ aprobat ≠ executat</p>
      </div>
    </div>
  );
}

export function ControlCenterStage() {
  const queue = [
    ["01", "Follow-up întârziat", "Vector Industrial", "Astăzi", "76.000 RON"],
    ["02", "Ofertă fără decizie", "Meridian Services", "2 zile", "42.000 RON"],
    ["03", "Responsabil neconfirmat", "Nova Medical", "De atribuit", "36.000 RON"]
  ] as const;

  const explanation = [
    ["Ce", "Follow-up-ul care cere atenție"],
    ["De ce", "Termen + conversație + context"],
    ["Cine", "Owner-ul comercial responsabil"],
    ["Urmează", "Revizuire internă, fără trimitere automată"]
  ] as const;

  return (
    <div className="overflow-hidden rounded-[1.3rem] border border-[#cbd2dc] bg-white text-[#111216] shadow-[0_32px_90px_rgba(31,39,53,0.13)]">
      <div className="flex items-center justify-between border-b border-[#dce1e8] bg-[#f5f7fa] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.55rem] bg-[#996315] text-[0.62rem] font-black text-white">RN</span>
          <div>
            <p className="text-xs font-semibold text-[#15171a]">Control Center</p>
            <p className="text-[0.62rem] text-[#69717e]">Priorități comerciale · stare ilustrativă</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#acd9c3] bg-[#edfaf3] px-2.5 py-1 text-[0.62rem] font-bold text-[#135f42]">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          Control uman
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_0.46fr]">
        <section className="border-b border-[#dce1e8] p-5 lg:border-b-0 lg:border-r sm:p-6" aria-labelledby="control-center-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Astăzi</Eyebrow>
              <h3 id="control-center-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#111216]">
                Ce necesită atenție acum
              </h3>
            </div>
            <p className="text-xs text-[#656c78]">3 situații · ordonate după urgență</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-[0.8rem] border border-[#dce1e8]">
            {queue.map(([number, title, company, due, value], index) => (
              <article
                key={title}
                className={`landing-v3-queue-row grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center ${index === 0 ? "bg-[#eef4ff]" : "bg-white"} ${index < queue.length - 1 ? "border-b border-[#dce1e8]" : ""}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-bold ${index === 0 ? "bg-[#285fd3] text-white" : "bg-[#eef1f5] text-[#59616e]"}`}>
                  {number}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#15171a]">{title}</h4>
                    {index === 0 ? (
                      <span className="rounded-full bg-[#fff0cf] px-2 py-0.5 text-[0.6rem] font-bold text-[#80510d]">Prioritar</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[#626a76]">{company} · Valoare estimată {value}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-[#2b3038]">{due}</p>
                  <p className="mt-1 text-[0.62rem] text-[#69717e]">Necesită decizie</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="bg-[#f5f7fa] p-5 sm:p-6" aria-label="Explicația priorității selectate">
          <Eyebrow>De ce acum</Eyebrow>
          <h4 className="mt-3 text-lg font-semibold text-[#181a1e]">Firul de follow-up s-a rupt.</h4>
          <div className="mt-5 space-y-4 border-l border-[#c9d2df] pl-4">
            {["Termenul confirmat a fost depășit", "Conversația asociată nu are răspuns", "Responsabilul comercial este identificat"].map((item, index) => (
              <p key={item} className="relative text-xs leading-5 text-[#555d69]">
                <span className={`absolute -left-[1.2rem] top-1.5 h-2 w-2 rounded-full ${index === 2 ? "bg-[#2b9b70]" : "bg-[#a96d16]"}`} />
                {item}
              </p>
            ))}
          </div>
          <div className="mt-6 rounded-[0.75rem] border border-[#deb65c] bg-[#fff4dc] p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#80510d]">Ce urmează</p>
            <p className="mt-2 text-sm font-semibold text-[#241c10]">Revizuiește contextul și confirmă revenirea</p>
            <p className="mt-2 text-xs leading-5 text-[#665a43]">Acțiune internă pregătită. Nimic nu este trimis extern.</p>
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-2 border-t border-[#dce1e8] bg-[#fbfcfd] sm:grid-cols-4">
        {explanation.map(([label, value], index) => (
          <div
            key={label}
            className={`px-4 py-3.5 ${index < 3 ? "sm:border-r sm:border-[#dce1e8]" : ""} ${index < 2 ? "border-b border-[#dce1e8] sm:border-b-0" : ""}`}
          >
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#80510d]">{label}</p>
            <p className="mt-1 text-[0.68rem] font-medium leading-5 text-[#4e5662]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RelationshipContext() {
  const leftNodes = [
    {
      id: "company" as const,
      label: "Companie",
      value: "Meridian Logistics",
      meta: "Relație comercială"
    },
    {
      id: "document" as const,
      label: "Document",
      value: "Ofertă v4",
      meta: "Dovadă asociată"
    }
  ];

  const rightNodes = [
    {
      id: "contact" as const,
      label: "Contact",
      value: "Ioana Petrescu",
      meta: "Contact asociat"
    },
    {
      id: "owner" as const,
      label: "Responsabil",
      value: "Andrei M.",
      meta: "Owner curent"
    }
  ];

  const renderNode = (
    node: (typeof leftNodes)[number] | (typeof rightNodes)[number],
    index: number
  ) => (
    <article
      key={node.id}
      className="landing-v3-context-node relative z-10 w-full rounded-[0.8rem] border border-[#d8d2c7] bg-white/[0.96] px-3.5 py-3 shadow-[0_8px_20px_rgba(31,27,20,0.035)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center gap-3">
        <GoldIconBadge size="sm">
          <ContextNodeIcon id={node.id} />
        </GoldIconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.115em] text-[#777d86]">
            {node.label}
          </p>
          <p className="mt-0.5 truncate text-[0.78rem] font-semibold text-[#202328]">
            {node.value}
          </p>
          <p className="mt-0.5 text-[0.55rem] text-[#858b94]">{node.meta}</p>
        </div>
      </div>
    </article>
  );

  return (
    <div className="relative overflow-hidden rounded-[1.15rem] border border-[#d8d1c5] bg-[#f8f6f0] p-4 text-[#111216] shadow-[0_18px_48px_rgba(31,27,20,0.05)] sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(216,189,118,.10),transparent_31%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,.78),transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative z-20 flex flex-wrap items-start justify-between gap-3 border-b border-[#ddd6ca] pb-4">
        <div>
          <Eyebrow>Context conectat</Eyebrow>
          <p className="mt-1.5 max-w-[38rem] text-sm font-semibold leading-5 text-[#17191d] sm:text-[0.94rem]">
            Patru relații verificate converg într-o singură decizie.
          </p>
          <p className="mt-1 max-w-[41rem] text-xs leading-5 text-[#6a6f77]">
            Compania, contactul, documentul și responsabilul rămân legate de
            aceeași oportunitate comercială.
          </p>
        </div>
        <span className="rounded-full border border-[#d6cebe] bg-white/88 px-2.5 py-1 text-[0.58rem] font-semibold text-[#61666d]">
          5 relații canonice
        </span>
      </div>

      <div className="relative z-10 mt-4">
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          viewBox="0 0 1000 306"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="relationshipLineLeft" x1="0" x2="1">
              <stop offset="0%" stopColor="#d2bd8c" stopOpacity="0.42" />
              <stop offset="70%" stopColor="#b88a3b" stopOpacity="0.78" />
              <stop offset="100%" stopColor="#b88a3b" stopOpacity="0.18" />
            </linearGradient>

            <linearGradient id="relationshipLineRight" x1="1" x2="0">
              <stop offset="0%" stopColor="#d2bd8c" stopOpacity="0.42" />
              <stop offset="70%" stopColor="#b88a3b" stopOpacity="0.78" />
              <stop offset="100%" stopColor="#b88a3b" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          <path d="M265 54 C350 54 365 108 424 123" fill="none" stroke="url(#relationshipLineLeft)" strokeWidth="1.25" />
          <path d="M265 252 C350 252 365 198 424 183" fill="none" stroke="url(#relationshipLineLeft)" strokeWidth="1.25" />
          <path d="M735 54 C650 54 635 108 576 123" fill="none" stroke="url(#relationshipLineRight)" strokeWidth="1.25" />
          <path d="M735 252 C650 252 635 198 576 183" fill="none" stroke="url(#relationshipLineRight)" strokeWidth="1.25" />
          {[265, 735].flatMap((x) => [54, 252].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#c69a4f" fillOpacity="0.72" />
          )))}
          <circle cx="500" cy="153" r="119" fill="none" stroke="#e5d8bd" strokeOpacity="0.72" strokeWidth="1" />
        </svg>

        <div className="relative grid gap-3 lg:min-h-[306px] lg:grid-cols-[minmax(0,0.86fr)_minmax(18rem,1fr)_minmax(0,0.86fr)] lg:items-center lg:gap-7">
          <div className="grid gap-3 lg:h-full lg:content-between lg:py-3">
            {leftNodes.map((node, index) => renderNode(node, index))}
          </div>

          <article className="landing-v3-context-node relative z-20 overflow-hidden rounded-[0.9rem] border border-[#a87221] bg-[#151618] text-white shadow-[0_16px_38px_rgba(18,17,14,0.14)]">
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[0.52rem] font-bold uppercase tracking-[0.13em] text-white/48">Oportunitate</p>
                  <p className="mt-1 text-xs font-semibold text-white/92">Extindere servicii</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d8bd76]/20 bg-[#d8bd76]/[0.065] px-2 py-1 text-[0.5rem] font-semibold text-[#ead38e]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d8bd76]" aria-hidden="true" />
                  Context consolidat
                </span>
              </div>

              <div className="px-4 py-4">
                <p className="text-[0.54rem] font-bold uppercase tracking-[0.13em] text-[#dfc77f]">Decizie curentă</p>
                <h4 className="mt-2 max-w-[18rem] text-base font-semibold leading-[1.3] tracking-[-0.018em] text-white">
                  Confirmă responsabilul și termenul
                </h4>
                <p className="mt-2 text-[0.66rem] leading-4 text-white/62">
                  Relațiile autorizate explică decizia care trebuie revizuită.
                </p>

                <div className="mt-3 overflow-hidden rounded-[0.65rem] border border-white/9 bg-white/[0.025]">
                  {[["Companie", "Meridian Logistics"], ["Dovadă", "Ofertă v4"], ["Lipsește", "Termen confirmat"]].map(([label, value], index) => (
                    <div key={label} className={`grid grid-cols-[4.6rem_1fr] gap-2 px-3 py-2 ${index > 0 ? "border-t border-white/8" : ""}`}>
                      <span className="text-[0.5rem] font-bold uppercase tracking-[0.09em] text-white/38">{label}</span>
                      <span className={`text-[0.61rem] font-medium ${index === 2 ? "text-[#ecd18a]" : "text-white/76"}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[0.5rem] font-bold uppercase tracking-[0.1em] text-white/38">Stare</p>
                    <p className="mt-0.5 text-[0.61rem] font-semibold text-white/78">Necesită revizuire</p>
                  </div>
                  <span className="rounded-full border border-[#d8bd76]/22 bg-[#d8bd76]/[0.07] px-2 py-1 text-[0.5rem] font-semibold text-[#e5ca80]">
                    Decizie umană
                  </span>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-3 lg:h-full lg:content-between lg:py-3">
            {rightNodes.map((node, index) =>
              renderNode(node, index + leftNodes.length)
            )}
          </div>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ddd6ca] pt-3">
          <p className="text-[0.58rem] leading-4 text-[#747981]">
            Relațiile provin din starea autorizată și persistată.
          </p>
          <p className="text-[0.56rem] font-semibold text-[#926117]">Relație → context → decizie</p>
        </div>
      </div>
    </div>
  );
}

export function DecisionTheater() {
  return (
    <div className="overflow-hidden rounded-[1.3rem] border border-white/12 bg-[#111214] text-white shadow-[0_32px_90px_rgba(0,0,0,0.28)]">
      <div className="grid xl:grid-cols-[0.92fr_1.08fr]">
        <section className="border-b border-white/10 p-5 sm:p-7 xl:border-b-0 xl:border-r" aria-labelledby="ai-analysis-title">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#dfc77f]">
              <SparklesIcon className="h-4 w-4" />
              <Eyebrow inverse>Analiză autorizată</Eyebrow>
            </div>
            <span className="rounded-full border border-white/12 bg-white/[0.025] px-2.5 py-1 text-[0.62rem] text-white/64">3 surse</span>
          </div>

          <h3 id="ai-analysis-title" className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-white">
            AI-ul separă concluzia de dovadă.
          </h3>

          <div className="mt-6 grid gap-3">
            {[
              ["A identificat", "Follow-up depășit înaintea termenului comercial"],
              ["Pe ce se bazează", "Conversație asociată · ofertă v4 · activitate restantă"],
              ["Ce lipsește", "Confirmarea responsabilului și a datei de revenire"]
            ].map(([label, copy], index) => (
              <div key={label} className="grid gap-2 border-t border-white/12 pt-4 sm:grid-cols-[0.36fr_0.64fr]">
                <p className={`text-[0.62rem] font-bold uppercase tracking-[0.11em] ${index === 2 ? "text-[#e4c56f]" : "text-white/58"}`}>{label}</p>
                <p className="text-sm leading-6 text-white/78">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[0.75rem] border border-[#d8bd76]/28 bg-[#d8bd76]/[0.075] p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#dfc77f]">Pas pregătit</p>
            <p className="mt-2 text-sm font-semibold text-white">Revizuiește și confirmă revenirea comercială</p>
            <p className="mt-1 text-xs leading-5 text-white/60">Editabil · neaprobat · neexecutat</p>
          </div>
        </section>

        <section className="bg-white/[0.025] p-5 sm:p-7" aria-labelledby="human-review-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow inverse>Revizuire umană</Eyebrow>
              <h3 id="human-review-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">
                Echipa păstrează ultima decizie.
              </h3>
            </div>
            <span className="rounded-full border border-[#d8bd76]/30 bg-[#d8bd76]/10 px-3 py-1.5 text-[0.65rem] font-semibold text-[#ead38e]">Așteaptă decizia</span>
          </div>

          <div className="mt-6 overflow-hidden rounded-[0.8rem] border border-white/12">
            <div className="grid sm:grid-cols-3">
              {[
                ["Se schimbă", "Owner și termen intern"],
                ["Rămâne vizibil", "Dovada și informația lipsă"],
                ["Nu se întâmplă", "Nicio trimitere automată"]
              ].map(([label, copy], index) => (
                <div key={label} className={`p-4 ${index < 2 ? "border-b border-white/10 sm:border-b-0 sm:border-r" : ""}`}>
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/56">{label}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/78">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-white/60">Alege explicit rezultatul revizuirii:</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" className="rounded-[0.65rem] bg-[#dfc77f] px-3 py-2.5 text-xs font-semibold text-[#17130b] transition-colors hover:bg-[#ead79e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfc77f]/70">
                Aprobă intern
              </button>
              {['Editează', 'Respinge', 'Amână'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-[0.65rem] border border-white/18 bg-white/[0.045] px-3 py-2.5 text-xs font-semibold text-white/84 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-white/12 pt-4 text-xs text-white/62">
            <LockClosedIcon className="h-4 w-4 text-[#dfc77f]" />
            <span>Aprobarea internă nu confirmă o acțiune externă.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export function WorkflowBuilderStage() {
  const overview = [
    [ClockIcon, "01", "Trigger", "Semnal"],
    [MagnifyingGlassIcon, "02", "Condiții", "Regulă"],
    [DocumentCheckIcon, "03", "Context", "Dovezi"],
    [ShieldCheckIcon, "04", "Control uman", "Decizie"],
    [DocumentCheckIcon, "05", "Pas pregătit", "Neexecutat"]
  ] as const;

  const reviewContract = [
    ["01", "Definiție", "Regula descrie când merită pregătit lucrul."],
    ["02", "Autoritate", "Utilizatorul autorizat păstrează decizia."],
    ["03", "Efect extern", "Nu are loc până la acțiunea separată permisă."]
  ] as const;

  const buildNodes = [
    { id: "trigger", icon: ClockIcon, label: "Trigger", title: "Follow-up depășit", copy: "Termen confirmat depășit", state: "Semnal observat", tone: "verified" },
    { id: "condition", icon: MagnifyingGlassIcon, label: "Condiție", title: "Oportunitate activă", copy: "Stare comercială verificată", state: "Regulă verificată", tone: "verified" },
    { id: "context", icon: DocumentCheckIcon, label: "Context", title: "Dovezi disponibile", copy: "Email + ofertă + owner", state: "3 surse", tone: "verified" },
    { id: "review", icon: ShieldCheckIcon, label: "Control uman", title: "Revizuire necesară", copy: "Decizia rămâne la echipă", state: "Decizie necesară", tone: "control" },
    { id: "prepared", icon: DocumentCheckIcon, label: "Dacă este aprobat", title: "Pregătește revenirea", copy: "Draft intern · editabil", state: "Neexecutat", tone: "prepared" },
    { id: "missing", icon: EyeIcon, label: "Dacă lipsesc date", title: "Solicită context", copy: "Revizuirea rămâne deschisă", state: "Fără efect", tone: "neutral" }
  ] as const;

  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[#d7d1c5] bg-[#fbfaf7] text-[#111216] shadow-[0_18px_52px_rgba(29,25,18,0.055)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded9ce] bg-white/[0.82] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.55rem] border border-[#b77a21]/20 bg-[#9b6517] text-[0.56rem] font-black text-white">
            RN
          </span>
          <div>
            <p className="text-xs font-semibold text-[#17191d]">Workflow Studio</p>
            <p className="mt-0.5 text-[0.58rem] text-[#69707a]">Follow-up comercial · definiție controlată</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#d8d2c7] bg-white px-2.5 py-1 text-[0.55rem] font-semibold text-[#61666e]">Scenariu ilustrativ</span>
          <span className="rounded-full border border-[#b6dfcc] bg-[#effaf5] px-2.5 py-1 text-[0.55rem] font-semibold text-[#176346]">Control activ</span>
        </div>
      </div>

      <div className="grid border-b border-[#ded9ce] lg:grid-cols-[1.45fr_0.78fr]">
        <section className="bg-[#f6f3ed] px-4 py-4 sm:px-5 lg:border-r lg:border-[#ded9ce]" aria-label="Rezumatul procesului">
          <div className="grid grid-cols-2 divide-x divide-y divide-[#ddd7cb] border-y border-[#ddd7cb] sm:grid-cols-5 sm:divide-y-0">
            {overview.map(([Icon, number, label, state], index) => (
              <div key={label} className={`px-3 py-3 ${index === 4 ? "col-span-2 sm:col-span-1" : ""} ${index === 3 ? "bg-[#fff3d9]" : "bg-white/45"}`}>
                <div className="flex items-center justify-between gap-2">
                  <Icon className={`h-4 w-4 ${index === 3 ? "text-[#9b6517]" : "text-[#69717b]"}`} aria-hidden="true" />
                  <span className="text-[0.5rem] font-bold tracking-[0.1em] text-[#8b857b]">{number}</span>
                </div>
                <p className="mt-2 text-[0.69rem] font-semibold text-[#24272b]">{label}</p>
                <p className={`mt-1 text-[0.55rem] ${index === 3 ? "font-semibold text-[#865510]" : "text-[#777d85]"}`}>{state}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.58rem] leading-4 text-[#747981]">
            <span>Definiția pregătește lucrul; autoritatea rămâne explicită.</span>
            <span className="font-semibold text-[#936219]">Pregătit ≠ aprobat ≠ executat</span>
          </div>
        </section>

        <aside className="bg-[#121315] px-4 py-4 text-white sm:px-5" aria-label="Contractul de control al workflow-ului">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow inverse>Contract de control</Eyebrow>
            <span className="rounded-full border border-[#d8bd76]/20 bg-[#d8bd76]/[0.06] px-2 py-1 text-[0.52rem] font-semibold text-[#e3cb87]">1 decizie umană</span>
          </div>
          <div className="mt-3 divide-y divide-white/9 border-y border-white/9">
            {reviewContract.map(([number, label, copy], index) => (
              <div key={label} className={`grid grid-cols-[1.5rem_4.6rem_1fr] gap-2 py-2.5 ${index === 1 ? "bg-[#d8bd76]/[0.055]" : ""}`}>
                <span className={`text-[0.5rem] font-bold ${index === 1 ? "text-[#e7ce86]" : "text-white/34"}`}>{number}</span>
                <span className={`text-[0.52rem] font-bold uppercase tracking-[0.09em] ${index === 1 ? "text-[#e7ce86]" : "text-white/52"}`}>{label}</span>
                <span className="text-[0.58rem] leading-4 text-white/70">{copy}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="relative bg-[#f7f5ef] p-4 sm:p-5" aria-labelledby="workflow-canvas-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#9a681a]">Construcția workflow-ului</p>
            <h3 id="workflow-canvas-title" className="mt-1 text-sm font-semibold text-[#24272b]">De la semnal la un pas pregătit pentru revizuire.</h3>
          </div>
          <p className="text-[0.57rem] text-[#747a82]">Toate stările rămân vizibile · fără execuție externă</p>
        </div>

        <div className="landing-v3-workflow-build relative mt-4 min-h-0 overflow-hidden rounded-[0.85rem] border border-[#d9d4ca] bg-[#f2efe8] p-3 sm:p-4 lg:min-h-[326px]">
          <div className="landing-v3-workflow-field pointer-events-none absolute inset-0" aria-hidden="true" />
          <svg className="landing-v3-workflow-connectors pointer-events-none absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 1000 326" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="workflowArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="#9e875d" /></marker>
            </defs>
            <path d="M188 87 H250" />
            <path d="M408 87 H470" />
            <path d="M628 87 H690" />
            <path d="M790 132 C790 166 710 176 700 205" />
            <path d="M824 132 C824 166 882 176 884 205" />
          </svg>

          <div className="relative z-10 grid gap-3 lg:block lg:h-[292px]">
            {buildNodes.map(({ id, icon: Icon, label, title, copy, state, tone }, index) => (
              <article
                key={id}
                className={`landing-v3-workflow-build-node landing-v3-workflow-node-${id} relative rounded-[0.78rem] border bg-white px-3.5 py-3 transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:shadow-[0_8px_18px_rgba(31,27,20,.055)] focus-within:-translate-y-px ${
                  tone === "control" ? "border-[#b77a21] bg-[#fff4dc]" : tone === "prepared" ? "border-[#d3b66d] bg-[#fffaf0]" : "border-[#d7d2c8]"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.5rem] border ${tone === "control" ? "border-[#c9943f] bg-[#9b6517] text-white" : "border-[#dfcfaa] bg-[#fbf2dc] text-[#8b5b14]"}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[0.5rem] font-bold uppercase tracking-[0.1em] ${tone === "control" ? "text-[#8a5810]" : "text-[#747a82]"}`}>{label}</p>
                    <p className="mt-1 text-[0.72rem] font-semibold leading-4 text-[#22252a]">{title}</p>
                    <p className="mt-1 text-[0.56rem] leading-4 text-[#747a82]">{copy}</p>
                  </div>
                </div>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[0.49rem] font-semibold ${tone === "verified" ? "border-[#cce9dc] bg-[#edf9f3] text-[#17684a]" : tone === "control" ? "border-[#dfbc69] bg-[#f4dca4] text-[#72470b]" : "border-[#dcd7ce] bg-[#f4f3ef] text-[#656b73]"}`}>{state}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#ddd7cb] pt-3">
          <p className="text-[0.58rem] leading-4 text-[#747981]">Definiția poate pregăti un draft intern. Nu pornește o execuție externă și nu ocolește aprobarea.</p>
          <span className="text-[0.58rem] font-semibold text-[#936219]">Pregătit pentru revizuire · neexecutat</span>
        </div>
      </section>
    </div>
  );
}

function IntegrationLogo({ name }: { name: string }) {
  const provider: Partial<Record<string, IntegrationBrand>> = {
    Gmail: "gmail",
    "Google Calendar": "google_calendar",
    "Google Drive": "google_drive"
  };
  if (provider[name]) return <IntegrationBrandIcon provider={provider[name]!} size="small" />;

  const common = "h-7 w-7 shrink-0";
  switch (name) {
    case "Outlook":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="6" fill="#1473E6"/><path fill="#fff" d="M4 8.5 15 5v18L4 20.7z"/><path fill="#0B5FC6" d="M14 8h10v12H14z"/><path fill="#fff" d="m14 13.2 5 3.4 5-3.4V20H14z"/><ellipse cx="9.5" cy="14" rx="3" ry="4" fill="#1473E6"/></svg>;
    case "Microsoft 365":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="11" height="11" fill="#F35325"/><rect x="15" y="2" width="11" height="11" fill="#81BC06"/><rect x="2" y="15" width="11" height="11" fill="#05A6F0"/><rect x="15" y="15" width="11" height="11" fill="#FFBA08"/></svg>;
    case "Teams":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="7" width="16" height="17" rx="4" fill="#6264A7"/><circle cx="20.5" cy="7" r="4" fill="#7B83EB"/><circle cx="23" cy="15" r="3" fill="#7B83EB"/><path d="M7 11h9v3h-3v7h-3v-7H7z" fill="#fff"/></svg>;
    case "Excel":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="6" fill="#107C41"/><path fill="#fff" d="m6 7 5 7-5 7h4l3-4.4 3 4.4h4l-5-7 5-7h-4l-3 4.4L10 7z"/></svg>;
    case "Salesforce":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><path fill="#00A1E0" d="M11 5a6 6 0 0 1 5 2.6A5 5 0 0 1 24 12a5 5 0 0 1-4 8H8a6 6 0 0 1-1-11.9A5.8 5.8 0 0 1 11 5Z"/><text x="14" y="16" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff">sf</text></svg>;
    case "HubSpot":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="4" fill="#FF7A59"/><circle cx="22" cy="8" r="3" fill="#FF7A59"/><circle cx="7" cy="7" r="2.5" fill="#FF7A59"/><circle cx="7" cy="22" r="2.5" fill="#FF7A59"/><path stroke="#FF7A59" strokeWidth="2.4" d="m9 8.5 3.5 3M17 11l3-2M11.5 17 8.5 20"/></svg>;
    case "Pipedrive":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="6" fill="#1B1B1B"/><path d="M8 6h7a6 6 0 0 1 0 12h-3v5H8zm4 4v4h3a2 2 0 1 0 0-4z" fill="#5CC8A1"/></svg>;
    case "Slack":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect x="12" y="2" width="5" height="11" rx="2.5" fill="#36C5F0"/><rect x="15" y="12" width="11" height="5" rx="2.5" fill="#2EB67D"/><rect x="11" y="15" width="5" height="11" rx="2.5" fill="#ECB22E"/><rect x="2" y="11" width="11" height="5" rx="2.5" fill="#E01E5A"/></svg>;
    case "Zoom":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7" fill="#2D8CFF"/><rect x="5" y="8" width="12" height="12" rx="3" fill="#fff"/><path d="m18 11 5-3v12l-5-3z" fill="#fff"/></svg>;
    case "Notion":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="4" fill="#fff" stroke="#111" strokeWidth="2"/><path fill="#111" d="M7 7.5h4l8 11V10l-2-.5v-2H23v2l-1.8.5v11h-3.5l-8.5-11.5V18l2 .5v2H5.5v-2l1.5-.5z"/></svg>;
    case "Dropbox":
      return <svg className={common} viewBox="0 0 28 28" aria-hidden="true"><path fill="#0061FF" d="m8 4 6 4-6 4-6-4zm12 0 6 4-6 4-6-4zM8 13l6 4-6 4-6-4zm12 0 6 4-6 4-6-4zm-6 5 6 4-6 4-6-4z"/></svg>;
    default:
      return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.5rem] border border-white/15 bg-white/[0.04] text-[0.6rem] font-bold text-white/70">API</span>;
  }
}

export function IntegrationEcosystem() {
  const groups = [
    { label: "Disponibil acum", tone: "live", tools: ["Gmail", "Google Calendar", "Google Drive"] },
    { label: "Disponibil prin implementare", tone: "planned", tools: ["Outlook", "Microsoft 365", "Teams", "Excel", "Salesforce", "HubSpot", "Pipedrive", "Slack", "Zoom", "Notion", "Dropbox"] }
  ] as const;

  return (
    <div className="overflow-hidden rounded-[1.2rem] border border-[#d2ccbf] bg-[#111214] text-white shadow-[0_26px_80px_rgba(20,19,16,0.16)]">
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b border-white/12 p-6 lg:border-b-0 lg:border-r sm:p-8">
          <Eyebrow inverse>Ecosistem comercial</Eyebrow>
          <h3 className="mt-4 text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-white">
            Instrumentele rămân surse. ReveNew leagă contextul.
          </h3>
          <p className="mt-5 text-sm leading-7 text-white/68">
            Starea fiecărei conexiuni se validează separat. Un logo din ecosistem nu înseamnă automat că integrarea este deja activă.
          </p>
          <div className="mt-7 rounded-[0.75rem] border border-[#d8bd76]/25 bg-[#d8bd76]/[0.07] p-4">
            <p className="text-xs font-semibold text-[#e5ca80]">Sistem intern sau integrare personalizată?</p>
            <p className="mt-2 text-xs leading-5 text-white/62">Scopul, accesul și implementarea se evaluează la cerere.</p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid gap-6">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${group.tone === "live" ? "bg-[#54c596]" : "bg-[#dfc77f]"}`} />
                    <p className={`text-[0.62rem] font-bold uppercase tracking-[0.14em] ${group.tone === "live" ? "text-[#9de0c5]" : "text-[#dfc77f]"}`}>
                      {group.label}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold ${group.tone === "live" ? "border-[#54c596]/25 bg-[#54c596]/[0.08] text-[#9de0c5]" : "border-[#d8bd76]/25 bg-[#d8bd76]/[0.07] text-[#e5ca80]"}`}>
                    {group.tone === "live" ? "Conector verificat" : "Necesită implementare"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {group.tools.map((tool) => (
                    <div
                      key={tool}
                      className={`group flex min-h-14 items-center gap-2.5 rounded-[0.7rem] border px-3 py-2.5 transition-colors ${group.tone === "live" ? "border-[#54c596]/18 bg-[#54c596]/[0.045] hover:bg-[#54c596]/[0.075]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.065]"}`}
                    >
                      <IntegrationLogo name={tool} />
                      <span className="min-w-0 text-xs font-semibold text-white/84">{tool}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-5">
            <p className="text-xs text-white/60">Capabilitățile și permisiunile se confirmă înainte de activare.</p>
            <span className="rounded-full border border-white/12 px-3 py-1 text-[0.62rem] text-white/66">Custom · la cerere</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AudienceCases() {
  const cases = [
    [
      UserGroupIcon,
      "Echipe comerciale B2B",
      "Când follow-up-ul, oferta și aprobarea circulă între oameni, iar următorul pas devine greu de urmărit.",
      ["follow-up", "ownership", "următorul pas"]
    ],
    [
      EyeIcon,
      "Fondatori și management",
      "Când pipeline-ul arată oportunități, dar nu și blocajul care le poate opri înainte de rezultat.",
      ["prioritate", "risc", "decizie"]
    ],
    [
      BuildingOffice2Icon,
      "RevOps și operațiuni",
      "Când procesul trebuie să rămână repetabil, explicabil și verificabil fără automatizare oarbă.",
      ["reguli", "dovezi", "audit"]
    ],
    [
      DocumentCheckIcon,
      "Procese comerciale distribuite",
      "Când conversațiile, documentele și aprobările se rup între instrumente și nimeni nu vede firul complet.",
      ["ofertă", "aprobare", "context"]
    ]
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cases.map(([Icon, title, copy, tags], index) => (
        <article
          key={title}
          className={`group relative overflow-hidden rounded-[1rem] border border-[#d8d2c6] p-5 text-[#111216] shadow-[0_10px_28px_rgba(30,25,18,0.04)] sm:p-6 ${
            index === 0 || index === 3 ? "bg-[#f4f0e7]" : "bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <GoldIconBadge>
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </GoldIconBadge>

            <span className="font-mono text-[0.62rem] tracking-[0.12em] text-[#938d82]">
              0{index + 1}
            </span>
          </div>

          <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-[#111216]">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#5e636c]">{copy}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#d7d1c6] bg-white/85 px-2.5 py-1 text-[0.62rem] font-semibold text-[#5c6169]"
              >
                {tag}
              </span>
            ))}
          </div>

          <span className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-[#a97019] transition-transform duration-300 group-hover:scale-y-100" />
        </article>
      ))}
    </div>
  );
}

export function GovernanceConsole() {
  const controls = [
    [LockClosedIcon, "Izolare între companii", "Workspace și rol verificate"],
    [UserGroupIcon, "Acces bazat pe rol", "Autoritatea rămâne server-side"],
    [SparklesIcon, "Context autorizat", "AI-ul vede numai sursele permise"],
    [EyeIcon, "Auditabilitate", "Actor, stare și moment păstrate"],
    [ShieldCheckIcon, "Control uman", "Decizie explicită înainte de efect"],
    [DocumentCheckIcon, "Adevăr financiar", "Estimatul rămâne separat de confirmat"]
  ] as const;

  return (
    <div className="overflow-hidden rounded-[1.2rem] border border-white/14 bg-white/[0.035] text-white">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {controls.map(([Icon, title, copy], index) => (
          <article
            key={title}
            className={`p-5 sm:p-6 ${
              index < 3 ? "border-b border-white/12" : ""
            } ${index % 3 !== 2 ? "lg:border-r lg:border-white/12" : ""} ${
              index % 2 === 0 ? "sm:border-r sm:border-white/12 lg:border-r" : ""
            }`}
          >
            <div className="flex items-start gap-3.5">
              <GoldIconBadge dark>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </GoldIconBadge>

              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-white/64">{copy}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/12 bg-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/62">
          Guvernanța nu este un badge. Este contractul fiecărei acțiuni.
        </p>

        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#dfc77f]">
          <CheckCircleIcon className="h-4 w-4" />
          Control verificabil
        </span>
      </div>
    </div>
  );
}
