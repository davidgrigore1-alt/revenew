# ReveNew design system v4

## Direcție

Sistemul v4 susține experiența de „registru comercial viu” definită în `redesign-v4-structure.md`. Neutrele construiesc ierarhia; accentul marchează decizia, nu colorează produsul.

## Culoare și suprafețe

- Canvas light: limestone cald; suprafață: aproape albă; recessed: gri-bej mineral.
- Canvas dark: graphite/ink; suprafață ridicată cu 5–10 puncte mai luminoasă, fără negru pur.
- Accent implicit: oxide-copper. Este rezervat pentru acțiune, selecție și firul de decizie.
- Succesul rămâne verde, riscul roșu, avertizarea amber și informația albastră. Accentul utilizatorului nu le modifică.
- Borderul și spațiul separă conținutul; shadow apare numai la overlay sau obiectul dominant.

## Formă și densitate

- control 8 px; card 10 px; panel 12 px; overlay 14 px; pill numai pentru status.
- tabele 44–52 px/rând; paginile de lucru folosesc 24–32 px padding desktop și 16 px mobil.
- un card delimitează o decizie sau o interacțiune, nu fiecare grup de text.

## Tip și date

- titluri scurte, greutate 600–700, tracking negativ moderat;
- corp 14 px, metadate 11–12 px;
- cifre financiare tabulare;
- „valoare estimată”, „valoare expusă” și „venit confirmat” rămân etichete distincte;
- monedele nu sunt agregate implicit.

## Motion

- feedback 100 ms; reveal 160 ms; conținut 200 ms; panel 240 ms; pagină 160 ms;
- ease-out la intrare, ieșire mai rapidă, maximum două proprietăți;
- pagina folosește numai fade + 4 px; listele nu dansează la fiecare reîncărcare;
- reduced motion anulează animațiile și păstrează toate stările lizibile;
- conținutul critic este vizibil și fără IntersectionObserver.

## Formulare

- etichetă persistentă deasupra câmpului; placeholderul este exemplu, nu instrucțiune;
- validarea locală apare după interacțiune sau submit; erorile serverului rămân generice când protecția contului o cere;
- valorile introduse se păstrează după eroare;
- parola are control text explicit și autocomplete semantic;
- acțiunile ireversibile folosesc o barieră de confirmare proporțională cu riscul;
- loading schimbă eticheta butonului fără a modifica lățimea și anunță starea accesibil.

## Semnături ReveNew

1. fir de dovadă: Fapt → Sursă → Interpretare → Acțiune;
2. marca de decizie oxide-copper;
3. bariera de confirmare umană;
4. comparația tip registru Înainte → După;
5. indexul numeric al etapelor pe fluxurile de inteligență și pilot.
