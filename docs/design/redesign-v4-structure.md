# ReveNew v4 — structură și teză vizuală

## Intenție

ReveNew trebuie să se simtă ca un registru comercial viu: faptele sunt marcate, interpretările sunt explicate, decizia aparține unei persoane, iar schimbarea poate fi măsurată. Interfața nu pornește de la baza de date și nu distribuie aceeași greutate fiecărui obiect.

Semnături funcționale:

1. **Firul de dovadă** — fapt → sursă → interpretare → acțiune, legate vizual printr-o linie continuă și etichete diferite.
2. **Marca de decizie** — o margine scurtă, oxide-copper, indică locul în care este necesară o alegere umană; nu este folosită pentru statusuri.
3. **Bariera de confirmare** — acțiunile cu efect sau rezultat comercial afișează explicit ce se schimbă și cine confirmă.
4. **Înainte → după** — comparație tip registru, cu definiția și cohorta la vedere, fără grafic de creștere decorativ.

## Teză vizuală

| Axă | Alegere | Motiv și utilizare | Nu apare în |
| --- | --- | --- | --- |
| Tip | sans compact pentru lucru; cifre tabulare; titluri editoriale scurte | separă scanarea zilnică de momentele de decizie | texte decorative supradimensionate în aplicație |
| Culoare | fundație limestone/graphite; accent implicit oxide-copper | amintește de o adnotare umană pe un registru și rămâne distinct de succes/risc | fiecare card, fiecare border sau fiecare număr |
| Spațiu | densitate operațională, cu pauze mari numai între nivelurile de decizie | face ierarhia lizibilă fără card soup | spațiu gol fără rol |
| Formă | colțuri 6–12 px; capsule numai pentru stări scurte | maturitate și scanare rapidă | panouri mari rotunjite repetitiv |
| Suprafețe | canvas cald în light, cerneală minerală în dark, panouri plate și zone recessed | structură prin contrast și divizoare | glassmorphism și glow |
| Motion | 80–140 ms feedback; 160–240 ms context; ieșiri mai rapide | arată ce s-a schimbat și de unde apare | mișcare continuă în aplicație |
| Iconografie | contur 16–20 px, fără cutii decorative implicite | întărește sensul și densitatea | iconuri colorate aleatoriu |
| Date | tabele, comparații și mici bare cu definiția aproape | credibilitate financiară | donut implicit, 3D, agregarea monedelor |
| Grafică | linii de registru, marcaje, numere de secțiune și trace-uri de dovadă | limbaj propriu ReveNew | bloburi, orburi și imagini AI generice |

## Dashboard / Control Center

- **Scop:** alegerea intervenției cu cel mai mare cost al întârzierii.
- **Utilizator:** manager comercial sau operator responsabil.
- **Întrebare:** „Ce merită atenția mea acum și de ce?”
- **Decizie:** execut, atribui, revizuiesc sau amân explicit prioritatea principală.
- **Acțiune:** CTA unic în obiectul prioritar.
- **Primul viewport:** bandă îngustă „ce s-a schimbat”; prioritatea #1 ocupă 8/12 coloane; o coloană de control arată termen, responsabil, valoare estimată și dovada disponibilă.
- **Ordine:** Schimbări → Decizia principală → Următoarele 3 priorități → Activitatea mea → sănătate operațională → indicatori secundari pliați.
- **Dezvăluire:** metodologie, AI la cerere și indicatorii lungi rămân pliați.
- **Mobil:** decizia, acțiunea și dovada preced orice metrică.

Wireframe:

```text
[CE S-A SCHIMBAT DE LA ULTIMA VERIFICARE -----------------------------]
[  #1 DECIZIE / motiv / povara întârzierii / CTA  ][ CONTROL + DOVADĂ ]
[  URMĂTOARELE PRIORITĂȚI — registru compact       ][ ACTIVITATEA MEA ]
[  SĂNĂTATE OPERAȚIONALĂ + excepții ----------------------------------]
[  indicatori secundari / analiză la cerere (pliate)                  ]
```

## Opportunity Detail

- **Scop:** continuarea sigură a unei inițiative comerciale.
- **Utilizator:** responsabil comercial, manager sau aprobator.
- **Întrebare:** „Ce blochează progresul și ce facem acum?”
- **Decizie:** confirmarea următorului pas, a responsabilului sau a rezultatului.
- **Acțiune:** o singură intervenție recomandată în rail-ul de lucru.
- **Primul viewport:** identitate și stare pe o linie; „acum” în 7/12 coloane; rail sticky în 5/12 cu valoare, responsabil, termen și CTA.
- **Ordine:** Identitate → Acum / acțiune sigură → dovadă-cheie → poveste comercială → persoane și documente → formulare și audit.
- **Dezvăluire:** alternativele, formularele, semnalele asociate și metodologia se deschid la cerere.
- **Mobil:** identitate → rail-ul de decizie → dovadă → timeline.

Wireframe:

```text
[IDENTITATE / STARE / COMPANIE ---------------------------------------]
[ CE BLOCHEAZĂ + DE CE + DOVADA-CHEIE ][ ACUM: valoare / owner / CTA ]
[ POVESTEA COMERCIALĂ — facts și interpretări pe același fir --------]
[ oameni + documente + semnale ][ acțiuni secundare / formulare ------]
```

## Company 360

- **Scop:** păstrarea memoriei comerciale a relației.
- **Utilizator:** manager, owner sau persoana care preia relația.
- **Întrebare:** „Ce nu trebuie să uităm și ce buclă rămâne deschisă?”
- **Decizie:** deschiderea priorității sau completarea golului critic.
- **Acțiune:** deschiderea buclei principale; crearea oportunității este secundară.
- **Primul viewport:** identitatea ocupă o bandă compactă; „ce contează acum” domină 7/12; „relația pe scurt” în 5/12.
- **Ordine:** Identitate → Ce contează acum → Memorie cronologică → Ask despre companie → oportunități active → oameni → dovezi/documente.
- **Dezvăluire:** Ask pornește compact; detaliile istorice și sursele se extind în fir.
- **Mobil:** bucla deschisă și ultima schimbare înaintea datelor de firmă.

Wireframe:

```text
[COMPANIE / relație / localizare / owner -----------------------------]
[ CE CONTEAZĂ ACUM + buclă deschisă ][ RELAȚIA PE SCURT + valori -----]
[ MEMORIE COMERCIALĂ — fir cronologic + surse ------------------------]
[ ÎNTREABĂ DESPRE COMPANIE (compact) ---------------------------------]
[ OPORTUNITĂȚI ACTIVE ][ OAMENI ][ DOVEZI ȘI DOCUMENTE ---------------]
```

## Test structural

- În grayscale, decizia principală rămâne dominantă prin dimensiune, poziție și spațiu.
- La blur, fiecare ecran are un singur bloc principal, nu o grilă de carduri egale.
- La 1280×720, conținutul de decizie începe în primul viewport.
- Schimbarea structurală trebuie să fie vizibilă în JSX-ul paginilor, nu doar în tokeni sau primitive.
