import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const protocolPath = "docs/appointment-control-validation-protocol.md";
const feedbackPath = "docs/appointment-control-feedback-template.md";
const demoScriptPath = "docs/sales/appointment-control-demo-script.md";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("validation protocol, feedback template and dedicated demo script exist", () => {
  for (const relativePath of [protocolPath, feedbackPath, demoScriptPath]) {
    assert.equal(fs.existsSync(path.resolve(relativePath)), true, relativePath);
    assert.ok(read(relativePath).length > 500, relativePath);
  }
});

test("protocol defines a practical 15-minute session and exact protected route", () => {
  const protocol = read(protocolPath);
  assert.match(protocol, /sesiunii de 15 minute/i);
  assert.match(protocol, /0:00–2:00/);
  assert.match(protocol, /12:00–15:00/);
  assert.match(protocol, /\/demo\/appointment-control/);
  assert.match(protocol, /3–5 evaluatori/);
  assert.match(protocol, /Checklist tehnic/);
  assert.match(protocol, /Checklist de observație/);
});

test("protocol includes exactly five human evaluator scenarios", () => {
  const protocol = read(protocolPath);
  const scenarios = protocol.match(/^### Scenariul [A-E] — .+$/gm) ?? [];
  assert.equal(scenarios.length, 5);
  assert.match(protocol, /Cerere normală/);
  assert.match(protocol, /Preferință pentru o persoană/);
  assert.match(protocol, /alternativă acceptată/);
  assert.match(protocol, /Niciun interval disponibil/);
  assert.match(protocol, /Înțelegerea limitei de siguranță/);
});

test("each scenario describes founder action, expected observation, success and confusion", () => {
  const protocol = read(protocolPath);
  for (const heading of protocol.match(/^### Scenariul [A-E] — .+$/gm) ?? []) {
    const start = protocol.indexOf(heading);
    const next = protocol.indexOf("\n### Scenariul ", start + heading.length);
    const section = protocol.slice(start, next === -1 ? protocol.indexOf("\n## Checklist", start) : next);
    assert.match(section, /Fondatorul|Fondator:/, heading);
    assert.match(section, /Evaluatorul ar trebui/, heading);
    assert.match(section, /Succes:/, heading);
    assert.match(section, /Confuzie:/, heading);
  }
});

test("continue, adjust and stop criteria are explicit and bounded", () => {
  const protocol = read(protocolPath);
  assert.match(protocol, /### Continuă/);
  assert.match(protocol, /### Ajustează/);
  assert.match(protocol, /### Oprește sau amână/);
  assert.match(protocol, /cel puțin 3 din 5 evaluatori înțeleg că este sandbox local/i);
  assert.match(protocol, /media utilității este de minimum 3,5 din 5/i);
  assert.match(protocol, /cel puțin doi evaluatori spun că ar testa/i);
  assert.match(protocol, /nu venit sau product-market fit/i);
});

test("protocol preserves sandbox, no-booking and human-approval boundaries", () => {
  const protocol = read(protocolPath);
  assert.match(protocol, /sandbox local/i);
  assert.match(protocol, /nu creează o programare reală/i);
  assert.match(protocol, /aprobarea umană obligatorie/i);
  assert.match(protocol, /nu s-a trimis confirmare/i);
  assert.match(protocol, /Nu afirmăm că Google Calendar sau Gmail sunt conectate/i);
  assert.match(protocol, /Nu afirmăm că ReveNew răspunde la apeluri reale/i);
});

test("materials make no revenue, ROI or automatic-booking promise", () => {
  const materials = [read(protocolPath), read(feedbackPath), read(demoScriptPath)].join("\n");
  assert.match(materials, /Nu promitem booking-uri, venit sau ROI/i);
  assert.match(materials, /Nu interpreta interesul declarat ca dovadă de booking, venit sau ROI/i);
  assert.match(materials, /nu se creează o programare reală/i);
  assert.match(materials, /nu se trimite nicio confirmare/i);
  assert.doesNotMatch(materials, /venit garantat de \d|ROI garantat de \d|garantăm (?:booking|venit|ROI)/i);
});

test("feedback template collects only minimized decision-useful information", () => {
  const feedback = read(feedbackPath);
  for (const field of [
    "Rol în procesul de programare",
    "Industrie",
    "sandbox local",
    "programare reală",
    "aprobarea umană",
    "intervalele propuse",
    "rezumatul pentru operator",
    "util ar fi acest flux",
    "cea mai mare confuzie",
    "partea cea mai utilă",
    "înaintea unui pilot real",
    "Da / Poate / Nu",
    "următoarea acțiune recomandată"
  ]) {
    assert.match(feedback, new RegExp(field, "i"), field);
  }
  assert.match(feedback, /Nu solicita numele persoanei, companiei, emailul sau telefonul/i);
  assert.match(feedback, /Nu cere acces la inbox, calendar, parole sau sisteme interne/i);
  assert.match(feedback, /Nu folosi răspunsurile pentru scoringul angajaților/i);
});

test("demo script explains the future Calendar and voice path honestly", () => {
  const script = read(demoScriptPath);
  assert.match(script, /Google Calendar nu este conectat/i);
  assert.match(script, /nu se creează o programare reală/i);
  assert.match(script, /Aprobarea umană rămâne obligatorie/i);
  assert.match(script, /etapă viitoare ar putea cerceta/i);
  assert.match(script, /Niciuna dintre aceste integrări nu este activă acum/i);
  assert.match(script, /## Ce nu spunem/);
  assert.match(script, /ReveNew răspunde deja la apeluri/);
  assert.match(script, /ReveNew face booking automat/);
});

test("included setup commands are Windows CMD compatible", () => {
  const protocol = read(protocolPath);
  assert.match(protocol, /```cmd[\s\S]*cd \/d C:\\Projects\\ReveNew/);
  assert.match(protocol, /start "" "http:\/\/localhost:3001\/demo\/appointment-control"/);
  assert.doesNotMatch(protocol, /```(?:bash|sh|powershell)|\bexport [A-Z_]+=|\bsource \./i);
});

