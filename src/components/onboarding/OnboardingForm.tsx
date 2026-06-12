"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getCurrentProfileDebug } from "@/lib/auth/actions";
import { saveOnboarding } from "@/lib/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

const fields = [
  ["businessName", "Nume business", "Auto Management SRL"],
  ["legalName", "Denumire legalÄƒ", "Auto Management SRL"],
  ["cui", "CUI", "RO12345678"],
  ["website", "Website", "automanagement.ro"],
  ["industry", "Industrie", "rent-a-car / servicii auto"],
  ["city", "OraÈ™", "BucureÈ™ti"],
  ["county", "JudeÈ›", "Ilfov"],
  ["averageContractValue", "Valoare medie contract", "6200 EUR"],
  ["notificationEmail", "Email notificÄƒri", "office@automanagement.ro"]
];

const textAreas = [
  ["services", "Servicii oferite", "Ã®nchiriere auto pe termen scurt, flote corporate, transfer aeroport"],
  ["idealCustomers", "ClienÈ›i ideali", "companii de construcÈ›ii, logisticÄƒ, consultanÈ›Äƒ, service-uri auto"],
  ["targetCities", "OraÈ™e È›intÄƒ", "BucureÈ™ti, Otopeni, Voluntari, Pipera"],
  ["targetIndustries", "Industrii È›intÄƒ", "construcÈ›ii, logisticÄƒ, evenimente, servicii auto"],
  ["currentSalesProcess", "Proces actual de vÃ¢nzÄƒri", "Lead-uri din recomandÄƒri, apeluri directe È™i follow-up manual"]
];

const fieldHelpers: Record<string, string> = {
  businessName: "Numele afisat in dashboard.",
  legalName: "Numele legal al firmei, util pentru oferte si documente.",
  cui: "Identificator fiscal. Momentan este folosit doar pentru profilul businessului.",
  averageContractValue: "O estimare aproximativa. Ajuta la prioritizarea oportunitatilor.",
  services: "Scrie serviciile principale. Acestea vor fi folosite pentru scorul de potrivire.",
  idealCustomers: "Exemple de firme sau industrii carora vrei sa le vinzi."
};

type DebugState = {
  sessionExists: boolean;
  userId: string;
  userEmail: string;
  profileId: string;
  ownerProfileId: string;
  lastAttemptedPayload: string;
  lastSupabaseError: string;
  currentStep: string;
};

export function OnboardingForm() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState<DebugState>({
    sessionExists: false,
    userId: "",
    userEmail: "",
    profileId: "",
    ownerProfileId: "",
    lastAttemptedPayload: "",
    lastSupabaseError: "",
    currentStep: "auth_check"
  });

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!isSupabaseConfigured) {
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error: sessionError } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null }, error: null };
      const profileDebug = await getCurrentProfileDebug();

      if (sessionError) {
        console.error("Supabase onboarding session debug error", sessionError);
      }

      if (!mounted) {
        return;
      }

      setDebug({
        sessionExists: Boolean(data.session),
        userId: data.session?.user.id ?? "",
        userEmail: data.session?.user.email ?? "",
        profileId: profileDebug.profileId,
        ownerProfileId: profileDebug.profileId,
        lastAttemptedPayload: "",
        lastSupabaseError: profileDebug.ok ? "" : profileDebug.error ?? "",
        currentStep: profileDebug.ok ? "profile_lookup" : "auth_check"
      });
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    setDebug((current) => ({ ...current, currentStep: "auth_check", lastSupabaseError: "" }));

    if (isSupabaseConfigured && !debug.sessionExists) {
      const message = "Nu eÈ™ti autentificat. IntrÄƒ din nou Ã®n cont Ã®nainte sÄƒ salvezi firma.";
      setError(message);
      setDebug((current) => ({ ...current, currentStep: "auth_check", lastSupabaseError: message }));
      setLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      const formData = new FormData(event.currentTarget);
      const attemptedPayload = JSON.stringify(Object.fromEntries(formData.entries()), null, 2);
      setDebug((current) => ({ ...current, currentStep: "business_insert", lastAttemptedPayload: attemptedPayload }));
      const result = await saveOnboarding(formData);
      if (!result.ok) {
        const message = result.error ?? "Nu am putut salva onboarding-ul.";
        setError(message);
        setDebug((current) => ({
          ...current,
          currentStep: result.step ?? "business_insert",
          profileId: result.profileId ?? current.profileId,
          ownerProfileId: result.ownerProfileId ?? current.ownerProfileId,
          lastAttemptedPayload: JSON.stringify(result.attemptedPayload ?? Object.fromEntries(formData.entries()), null, 2),
          lastSupabaseError: message
        }));
        setLoading(false);
        return;
      }
      setDebug((current) => ({
        ...current,
        currentStep: result.step ?? "success",
        profileId: result.profileId ?? current.profileId,
        ownerProfileId: result.ownerProfileId ?? current.ownerProfileId,
        lastSupabaseError: result.message ?? "",
        lastAttemptedPayload: attemptedPayload
      }));
      setSuccessMessage(result.message ?? "Date salvate. Te redirectionam...");
    }

    setSaved(true);
    window.setTimeout(() => router.push("/dashboard"), 700);
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-6">
        <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold text-white">Profil firmÄƒ</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {fields.map(([name, label, placeholder]) => (
              <label key={name} className="block">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                {fieldHelpers[name] ? <span className="mt-1 block text-xs leading-5 text-zinc-500">{fieldHelpers[name]}</span> : null}
                <input
                  name={name}
                  placeholder={placeholder}
                  className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold text-white">Oferta È™i piaÈ›a È›intÄƒ</h2>
          <div className="mt-5 grid gap-4">
            {textAreas.map(([name, label, placeholder]) => (
              <label key={name} className="block">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                {fieldHelpers[name] ? <span className="mt-1 block text-xs leading-5 text-zinc-500">{fieldHelpers[name]}</span> : null}
                <textarea
                  name={name}
                  rows={3}
                  placeholder={placeholder}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Button type="submit">{loading ? "Se salveazÄƒ..." : "SalveazÄƒ È™i intrÄƒ Ã®n dashboard"}</Button>
          {saved ? <p className="text-sm text-mint-400">{successMessage || "Date salvate. Te redirectionam..."}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      </form>

      {process.env.NODE_ENV === "development" ? (
      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-xs leading-5 text-zinc-400">
        <p className="font-semibold text-zinc-300">Debug dezvoltare onboarding</p>
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          <p>Supabase conectat: {isSupabaseConfigured ? "da" : "nu"}</p>
          <p>Sesiune existentÄƒ: {debug.sessionExists ? "da" : "nu"}</p>
          <p>User ID: {debug.userId || "-"}</p>
          <p>Email: {debug.userEmail || "-"}</p>
          <p>Profile ID: {debug.profileId || "-"}</p>
          <p>Owner profile id pentru insert: {debug.ownerProfileId || "-"}</p>
          <p className="sm:col-span-2">Pas curent: {debug.currentStep}</p>
          <p className="sm:col-span-2">Ultima eroare Supabase: {debug.lastSupabaseError || error || "-"}</p>
          <pre className="mt-2 max-h-52 overflow-auto rounded bg-ink-950/70 p-3 sm:col-span-2">
            {debug.lastAttemptedPayload || "Payload neÃ®ncercat Ã®ncÄƒ."}
          </pre>
        </div>
      </section>
      ) : null}
    </div>
  );
}
