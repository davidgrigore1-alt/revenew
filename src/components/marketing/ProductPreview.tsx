const fields = [
  ["Companie", "Exemplu client B2B"],
  ["Sursă", "Formular website"],
  ["Motiv", "Cerere fără răspuns"],
  ["Vechime", "4 zile"],
  ["Valoare", "Estimare, nu venit confirmat"],
  ["Acțiune", "Pregătește follow-up"],
  ["Status", "Așteaptă revizuirea echipei"]
];

export function ProductPreview() {
  return (
    <div className="relative mx-auto min-h-[430px] w-full max-w-xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Exemplu de flux</p>
          <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--foreground))]">Oportunitate de revizuit</h2>
        </div>
        <span className="rounded-full border border-[rgb(var(--warning)_/_0.35)] bg-[rgb(var(--warning)_/_0.12)] px-3 py-1 text-xs font-semibold text-[rgb(var(--warning))]">
          Estimare
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{label}</dt>
            <dd className="mt-2 text-sm font-semibold text-[rgb(var(--foreground))]">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-xl border border-[rgb(var(--primary)_/_0.25)] bg-[rgb(var(--primary)_/_0.08)] p-4">
        <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Recomandare pregătită pentru echipă</p>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
          Verifică sursa originală, ajustează mesajul și decide dacă follow-up-ul trebuie folosit.
        </p>
      </div>
    </div>
  );
}
