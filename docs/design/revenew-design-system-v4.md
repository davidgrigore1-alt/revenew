# ReveNew design system v4

## Direcție

Sistemul v4 susține experiența de „registru comercial viu” definită în `redesign-v4-structure.md`. Neutrele construiesc ierarhia; accentul marchează decizia, nu colorează produsul.

## Culoare și suprafețe

- Canvas light: alb, cu suprafețe secundare gri neutru.
- Canvas dark: near-black neutru (`6 6 6`), cu suprafețe charcoal și borduri neutre. Accentul nu colorează canvasul.
- Accent implicit: Champagne Gold; Executive Blue este alternativa verificată. Accentul este rezervat pentru acțiune, selecție și focus.
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

- Button și Checkbox: 100 ms; feedback/rânduri/câmpuri: tokenul de 120 ms;
- reveal, conținut și pagină: 180 ms; panel: 220 ms. Aliasurile fast/normal/slow rămân 120/180/220 ms; tokenul legacy large de 280 ms nu este recomandat pentru interacțiuni noi;
- easing comun: `cubic-bezier(.2,.8,.2,1)`. Pagina și pasul signup folosesc fade + cel mult 4 px; graficele Control Center folosesc 160–180 ms;
- Dialog și Drawer comune: intrare fade de 180 ms, închidere imediată la demontare. Nu există o animație de ieșire întârziată;
- Select deschide popupul imediat; nu adăugăm întârziere doar pentru uniformitate;
- controalele și rândurile rămân stabile sub pointer: feedback prin culoare/bordură, fără salt sau scalare. Nu animăm geometria sau umbrele costisitoare în noile interacțiuni operaționale;
- reduced motion elimină intrările de pagină, signup și overlay, precum și animația graficelor; regula globală scurtează tranzițiile/animațiile reziduale, elimină întârzierile și scrollul animat. Focusul, erorile și selecția rămân vizibile; transformările statice necesare layoutului nu sunt șterse global;
- conținutul critic este vizibil și fără IntersectionObserver.

Normalizarea Phase 1D privește aplicația. Animațiile marketing și consumatorii legacy nemigrați nu sunt declarați uniformizați.

## Controale, focus și selecție

- Button are lățime intrinsecă; `fullWidth` este explicit. Înălțimea minimă permite etichetelor românești lungi să se împartă pe rânduri;
- loading păstrează spațiul etichetei, afișează indicatorul și expune `aria-busy`; acțiunea este dezactivată. Un link indisponibil nu păstrează o destinație activabilă;
- Input păstrează eticheta, starea invalidă și asocierea erorii; focus-visible folosește conturul accentului, nu glow;
- Checkbox păstrează inputul nativ, operarea cu Space, stările checked/indeterminate/disabled și conturul vizibil de tastatură;
- selecția folosește `--selection`, iar focusul `--focus-ring`; culorile semantice de eroare, avertizare și succes rămân independente de accent.

## Overlay-uri comune

Dialog și Drawer folosesc dialogul nativ modal, cu nume accesibil, izolare a fundalului, Tab/Shift+Tab conținute, blocarea scrollului și restaurarea focusului la inițiator. Escape respectă starea dismissible; backdropul închide Drawer implicit, iar Dialog numai la opțiune explicită. Select folosește containerul overlayului pentru a păstra popupul în stratul modal; Escape închide mai întâi popupul.

Dialog are maximum 32rem și margini de 1rem; Drawer maximum 42rem și înălțime de viewport. Conținutul lung rămâne scrollabil. Acest contract descrie primitivele comune, nu certifică migrarea tuturor overlayurilor istorice.

## Identitatea autentificării

Scope-ul comun `.auth-theme` impune canvas near-black, suprafețe charcoal, text ivory și `color-scheme: dark`, indiferent de tema Light/System salvată pentru aplicație. Accentul activ poate colora acțiunea, focusul și selecția; nu poate colora canvasul. Popupurile Select din autentificare păstrează același scope. Vizitarea autentificării nu rescrie preferințele spațiului de lucru. Izolarea este prezentare CSS, fără schimbarea autentificării, sesiunii sau redirecturilor.

## Formulare

- etichetă persistentă deasupra câmpului; placeholderul este exemplu, nu instrucțiune;
- validarea locală apare după interacțiune sau submit; erorile serverului rămân generice când protecția contului o cere;
- valorile introduse se păstrează după eroare;
- parola are control text explicit și autocomplete semantic;
- acțiunile ireversibile folosesc o barieră de confirmare proporțională cu riscul;
- loading păstrează geometria etichetei și anunță starea accesibil; mesajul acțiunii rămâne responsabilitatea consumatorului.

## Semnături ReveNew

1. fir de dovadă: Fapt → Sursă → Interpretare → Acțiune;
2. marca de decizie în accentul ReveNew activ, implicit Champagne Gold;
3. bariera de confirmare umană;
4. comparația tip registru Înainte → După;
5. indexul numeric al etapelor pe fluxurile de inteligență și pilot.
