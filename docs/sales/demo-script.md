# Scriptul demonstrației ReveNew — 5 minute

Folosește exclusiv mediul demo local și workspace-ul fictiv **Meridian Commercial Operations**. Înainte de întâlnire, verifică traseul complet și identitatea afișată.

## Pregătire în Windows Command Prompt

```cmd
cd /d C:\Projects\ReveNew
npx supabase start
npm run demo:buyer-ready
npm run demo:dev -- --port 3001
```

După autentificare, deschide:

```cmd
start "" "http://localhost:3001/dashboard"
```

## Traseul exact

1. `/dashboard`
2. `/demo`
3. `/opportunities/de300006-0000-4000-8000-000000000006`
4. `/reports`
5. `/reports/revenue-recovery-audit`
6. `/reports/enterprise-pilot-pack`
7. `/reports/pilot-proof-of-value`

Păstrează accentul pe patru ecrane: Dashboard, oportunitatea selectată, Audit și Pilot Pack. `/demo` este ghidul narativ, iar `/reports` explică diferența dintre pipeline estimat, valoare estimată expusă și venit confirmat.

## 0:00–1:15 — `/dashboard`

> Acesta este Control Center. Prima vedere răspunde la trei întrebări: ce risc comercial contează astăzi, de ce contează și care este prima acțiune sigură. În exemplul Meridian, proiectul Vector Industrial este întârziat, nu are responsabil clar și necesită aprobare umană. Valoarea afișată este estimată, nu venit confirmat.

Arată pe scurt riscul, dovada, responsabilul și CTA-ul principal. Nu parcurge toate cardurile.

## 1:15–1:35 — `/demo`

> Acest traseu păstrează demonstrația concentrată: risc, dovadă, decizie, audit și pilot. ReveNew nu este o listă generică de activități și nu încearcă să înlocuiască decizia umană.

## 1:35–2:50 — oportunitatea selectată

Deschide `/opportunities/de300006-0000-4000-8000-000000000006`.

> Aici vedem obiectul comercial complet: valoare estimată și monedă, status, responsabil, contact, blocaje, ultima și următoarea acțiune, plus dovezile disponibile. Dacă lipsește responsabilul sau aprobarea, sistemul spune exact ce trebuie verificat. Acțiunea externă rămâne sub control uman.

Deschide o dovadă sau timeline-ul numai cât să confirmi afirmația. Nu deschide toate formularele și nu pretinde că un document pregătit a fost trimis.

## 2:50–3:25 — `/reports`

> Rapoartele separă trei concepte. Valoarea estimată în pipeline descrie oportunitățile active. Valoarea estimată expusă descrie obiectele comerciale afectate de blocaje și este deduplicată pe oportunitate. Venitul confirmat apare numai după confirmarea rezultatului. Monedele nu sunt cumulate.

## 3:25–4:15 — Audit

Deschide `/reports/revenue-recovery-audit`.

> Auditul transformă datele disponibile într-un livrabil executiv: priorități, bucle deschise, dovezi și prima acțiune sigură. Aceeași oportunitate poate avea mai multe blocaje, dar valoarea sa este numărată o singură dată. Concluziile trebuie revizuite cu persoana care cunoaște procesul.

Arată titlul, data, spațiul de lucru, expunerea estimată și prima prioritate. Menționează opțiunea de print fără să promiți un PDF generat.

## 4:15–5:00 — Pilot Pack

Deschide `/reports/enterprise-pilot-pack`.

> Dacă auditul confirmă problema, propunem un pilot controlat de 14 zile. Validăm claritatea responsabilității, disciplina de follow-up și traseul aprobărilor pe un domeniu limitat. Clientul stabilește participanții și criteriile. La final, decizia este continuăm, ajustăm sau oprim. Pilotul nu garantează venit recuperat.

Pentru discuția de închidere a pilotului, deschide `/reports/pilot-proof-of-value`. Raportul arată numai progresul demonstrabil din datele existente și precizează dacă linia de bază este doar o stare curentă. Nu prezenta totalurile observate ca diferențe înainte/după în lipsa unui baseline persistent.

## Întrebarea de închidere

> Din situațiile prezentate, care seamănă cel mai mult cu procesul dumneavoastră: follow-up întârziat, responsabil neclar, aprobare blocată sau rezultat neconfirmat? Ar merita să verificăm această ipoteză pe 20–50 de cazuri anonimizate?

Pentru validarea separată a fluxului Appointment Control folosește [scriptul dedicat](appointment-control-demo-script.md) și [protocolul de 15 minute](../appointment-control-validation-protocol.md). Nu îl combina cu traseul principal de cinci minute dacă interlocutorul nu evaluează procese de programare.

## Ce nu afirmăm

- Nu afirmăm venit garantat, ROI promis sau recuperare automată.
- Nu afirmăm că ReveNew înlocuiește CRM-ul ori echipa comercială.
- Nu afirmăm că sunt disponibile integrări live Gmail, Calendar sau voice.
- Nu afirmăm certificări SOC 2, ISO 27001 sau GDPR.
- Nu afirmăm că AI-ul ia decizii ori trimite comunicări automat.
- Nu prezentăm valori estimate drept venit confirmat.
