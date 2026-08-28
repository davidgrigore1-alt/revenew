# Identitatea aplicațiilor

SVG-uri locale pentru identificarea integrărilor în ReveNew. Nu sunt încărcate resurse externe la afișare. Colectate la 27 august 2026 din sursele oficiale de mai jos; mărcile aparțin titularilor lor. Proveniența nu reprezintă o licență generală sau o afiliere. Verificați condițiile fiecărei mărci înaintea publicării.

| Fișier | Sursă |
| --- | --- |
| microsoft-365.svg | [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/media/howto-add-branding-in-apps/ms-symbollockup_mssymbol_19.svg) — simbolul Microsoft |
| hubspot.svg | [HubSpot Sprocket](https://53.fs1.hubspotusercontent-na1.net/hubfs/53/assets/hubspot.com/global/Sprocket2025.svg) |
| pipedrive.svg | SVG inline din [Pipedrive](https://www.pipedrive.com/en) |
| slack.svg | [Salesforce / Slack](https://wp.sfdcdigital.com/en-us/wp-content/uploads/sites/4/2024/06/icon-slack.svg) |
| google-drive.svg | [Google Workspace](https://storage.googleapis.com/gweb-workspace-assets/uploads/7uffzv9dk4sn-3AGHIcGci6RiNYtjf3Lfo2-4827a14a4409138cad096de1af549f60-drive_2026-192px.optimized.svg) |
| google-workspace.svg | SVG inline din [Google Workspace](https://workspace.google.com/) |
| google-symbol.svg | [Google Identity — artwork oficial](https://developers.google.com/static/identity/images/branding_guideline_sample_lt_sq_sl.svg) — simbolul multicolor extras din exemplul de buton, fără modificarea geometriei sau culorilor |
| docusign.svg | SVG inline din [Docusign](https://www.docusign.com/) |
| salesforce.svg | [Salesforce](https://wp.sfdcdigital.com/en-us/wp-content/uploads/sites/4/2024/11/logo-salesforce.svg) |

Gmail și Calendar reutilizează SVG-urile oficiale existente în `../google/`, fără duplicare. API & Webhooks folosește o pictogramă neutră, nu o marcă inventată.

Artwork-ul își păstrează geometria și culorile. Pentru SVG-ul Pipedrive inline, culoarea oficială `#2b74da` a fost rezolvată din regula CSS a site-ului (`.puco-logo--primary svg`) în atributul de umplere, pentru afișare autonomă. `viewbox` din HTML a fost normalizat la `viewBox` pentru SVG autonom. Nu sunt păstrate scripturi, imagini încorporate sau referințe externe active.

`ApplicationLogo` folosește containere albe de 40 × 40 px, 32 px în rândurile compacte și 68 × 40 px pentru wordmark-uri. Google Workspace folosește simbolul Google compact; vechiul wordmark este păstrat ca asset, dar nu este folosit în catalog. `object-contain` păstrează proporțiile; nicio marcă nu este recolorată în champagne. Gradientele native ale eventualelor mărci nu sunt efecte decorative ale interfeței.

Catalogul este organizat pe furnizori. Gmail, Calendar, Drive, Docs, Sheets și Meet aparțin Google Workspace; Drive nu este o integrare de catalog separată. Stările Gmail/Calendar provin exclusiv din conexiunea existentă. Drive, Docs, Sheets și integrarea Meet dedicată sunt planificate, fără flux de autorizare nou. Activitatea arată ultima rulare stocată și contextul păstrat pe sursă, nu un istoric inventat.
