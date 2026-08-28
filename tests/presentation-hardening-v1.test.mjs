import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const has = (source, fragment) => assert.ok(source.includes(fragment), `Missing expected fragment: ${fragment}`);

function presentationModule() {
  const source = read("src/lib/ui/presentation.ts");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Intl, Date, Number, RegExp }, { filename: "presentation.ts" });
  return module.exports;
}


function purePresentation(file) {
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Date,Map,Set,Number,Array},{filename:file});
 return module.exports;
}
test("G3F exposure uses current dated values, separates currencies and retains unknown/undated coverage",()=>{
 const {buildControlCenterVisuals}=purePresentation("src/lib/control-center-visuals.ts");
 const base={severity:"attention",overdue:false,currency:"RON",deadline:"2026-09-02",value:100};
 const cases=[{...base,id:"a"},{...base,id:"b",deadline:"2026-09-01",value:50,overdue:true},{...base,id:"c",currency:"EUR",value:20},{...base,id:"d",deadline:null,value:30},{...base,id:"e",value:null},{...base,id:"f",deadline:"invalid",value:10,severity:"informative"}];
 const before=JSON.stringify(cases),model=buildControlCenterVisuals([...cases,cases[0]]);
 assert.equal(model.count,6);assert.equal(JSON.stringify(cases),before);
 const ron=model.exposure.find(row=>row.currency==="RON"),eur=model.exposure.find(row=>row.currency==="EUR");
 assert.deepEqual(Array.from(ron.points,row=>[row.date,row.value,row.cumulative]),[["2026-09-01",50,50],["2026-09-02",100,150]]);
 assert.equal(ron.undated,40);assert.equal(ron.undatedCount,2);assert.equal(eur.points[0].cumulative,20);assert.equal(model.unknownCount,1);
 assert.deepEqual(Array.from(model.distribution,row=>row.count),[1,4,1]);assert.equal(model.distribution.reduce((sum,row)=>sum+row.count,0),model.count);
});
test("G3F visual aggregates have honest empty states and exclude invalid amounts",()=>{
 const {buildControlCenterVisuals}=purePresentation("src/lib/control-center-visuals.ts");
 assert.equal(buildControlCenterVisuals([]).exposure.length,0);
 const model=buildControlCenterVisuals([{id:"unknown",currency:"RON",deadline:null,value:NaN,overdue:false,severity:"informative"}]);
 assert.equal(model.exposure.length,0);assert.equal(model.unknownCount,1);
 const chart=read("src/components/dashboard/ControlCenterVisuals.tsx");
 assert.match(chart,/nu istoric al expunerii sau prognoză/);assert.match(chart,/Vezi valorile graficului/);assert.match(chart,/<table/);
 assert.doesNotMatch(chart,/Math.random|fetch\(|localStorage/);
});
test("G3F select navigation skips disabled options, supports boundaries and empty lists",()=>{
 const {nextSelectOption}=purePresentation("src/lib/ui/select-navigation.ts");
 const options=[{disabled:true},{disabled:false},{disabled:true},{disabled:false}];
 assert.equal(nextSelectOption(options,1,"ArrowDown"),3);assert.equal(nextSelectOption(options,3,"ArrowUp"),1);
 assert.equal(nextSelectOption(options,3,"Home"),1);assert.equal(nextSelectOption(options,1,"End"),3);
 assert.equal(nextSelectOption(options,3,"ArrowDown"),3);assert.equal(nextSelectOption(options,-1,"ArrowUp"),3);
 assert.equal(nextSelectOption([],0,"Home"),-1);assert.equal(nextSelectOption([{disabled:true}],0,"End"),-1);
});
test("G3F select retains a hidden form bridge and custom accessible popup; visible native dropdowns are absent",()=>{
 const source=read("src/components/ui/Select.tsx");
 for(const part of ['role="combobox"','role="listbox"','role="option"','aria-activedescendant','aria-required','aria-invalid','onInvalid','type="button"','createPortal','form?.addEventListener("reset"','new Event("change"','event.key==="Escape"','event.key==="Tab"','search.current'])has(source,part);
 assert.match(source,/tabIndex=\{-1\} aria-hidden="true"/);assert.match(source,/onClick=\{\(\)=>choose\(index\)\}/);
 for(const file of ["workflows/WorkflowBuilder","settings/PersonalizationSettingsPanel","crm/CrmWorkspaceClient","inbox/CommercialInboxClient","revenue/PipelineBoard","apps/DriveWorkspace","opportunities/OpportunityControlCenter"])assert.doesNotMatch(read("src/components/"+file+".tsx"),/<select\b/);
});
test("G3F workflow geometry uses one shared contract and fixes action width",()=>{
 const page=read("src/app/(protected)/workflows/page.tsx"),css=read("src/components/ui/OperationalPatterns.module.css");
 assert.equal((page.match(/patterns.workflowGrid/g)||[]).length,2);assert.match(css,/grid-template-columns:[^;]+218px/);
 assert.match(page,/grid-cols-\[82px_128px\]/);assert.match(page,/changeWorkflowStatus/);assert.match(page,/#activation-review/);
});
test("G3F reader suppresses only an entire known sentinel, never source phrases or HTML security",()=>{
 const {readableEmailBody}=purePresentation("src/lib/ui/email-reader.ts");
 assert.equal(readableEmailBody("  TEXT_FORMAT_BODY\n"),null);assert.equal(readableEmailBody(""),null);
 const message="Contractul conține TEXT_FORMAT_BODY ca exemplu.";
 assert.equal(readableEmailBody(message),message);
 assert.equal(readableEmailBody("<script>not executable</script>"),"<script>not executable</script>");
 const source=read("src/components/intelligence/EmailDetailDrawer.tsx");
 assert.match(source,/readableEmailBody\(email.body\)/);assert.match(source,/sandbox=""/);assert.match(source,/referrerPolicy="no-referrer"/);
 assert.doesNotMatch(source,/dangerouslySetInnerHTML/);
});

test("central presentation turns canonical values into Romanian product language", () => {
  const format = presentationModule();
  assert.equal(format.presentOpportunityState("contacted").label, "Contact inițiat");
  assert.equal(format.presentOpportunityState("reviewed").label, "Revizuit");
  assert.equal(format.presentOpportunityState("follow_up_needed").label, "Follow-up necesar");
  assert.equal(format.presentOpportunityState("action_generated").label, "Acțiune pregătită");
  assert.equal(format.presentExecutionState("waiting_for_client").label, "Așteaptă clientul");
  assert.equal(format.presentCommunicationState("failed").label, "Trimitere nereușită");
});

test("product date formatting never exposes an ISO timestamp", () => {
  const format = presentationModule();
  const result = format.formatProductDateTime("2026-08-20T09:00:00+00:00");
  assert.doesNotMatch(result, /T09:00:00|\+00:00|2026-08-20/);
  assert.match(result, /20/);
});

test("recent changes use a dedicated renderer with concise narrative and secondary evidence", () => {
  const cards = read("src/components/intelligence/CopilotResultCards.tsx");
  const conversation = read("src/components/intelligence/CopilotConversation.tsx");
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  has(cards, 'presentation.kind !== "recent_changes"');
  has(cards, "Ce s-a schimbat recent");
  has(cards, "presentOpportunityState");
  has(cards, "formatProductDateTime");
  has(conversation, "Dovezi ·");
  has(orchestrator, "schimbări comerciale relevante");
  assert.doesNotMatch(conversation, /Rezultat determinist|Răspunsul generativ nu este disponibil/);
  assert.doesNotMatch(orchestrator, /\$\{index \+ 1\}\. \$\{item\.title\}/);
});

test("email presentation is source-bound, strips transport noise and keeps one opening action", () => {
  const cards = read("src/components/intelligence/CopilotResultCards.tsx");
  const inbox = read("src/components/inbox/ConnectedEmailInbox.tsx");
  has(cards, 'provider="gmail"');
  has(cards, "formatUserFacingText(email.excerpt, { stripUrls: true })");
  has(cards, "Deschide conversația");
  has(inbox, "formatUserFacingText(email.excerpt, { stripUrls: true })");
  has(inbox, "formatProductDateTime(email.sentAt)");
  assert.doesNotMatch(cards, /tracking_url|raw_mime|dangerouslySetInnerHTML/);
});

test("deterministic fallback remains intentional when generative enhancement is unavailable", () => {
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  has(orchestrator, "Răspuns bazat pe date verificate.");
  assert.doesNotMatch(orchestrator, /Răspunsul generativ nu este disponibil momentan/);
});

test("Gmail capabilities distinguish reading from permission-gated sending", () => {
  const apps = read("src/components/apps/GoogleWorkspaceCard.tsx");
  const model = read("src/lib/integrations/presentation.ts");
  has(apps, "<GoogleCapabilities state={state}");
  has(model, 'label: "Citire"');
  has(model, 'label: "Trimitere"');
  has(model, "Permisiune necesară");
  has(apps, "/api/integrations/google/connect?capability=email_send");
  has(apps, "Activează trimiterea");
  has(apps, "confirmare finală");
});

test("email reader locks background scroll, restores focus and blocks repeated send mutations", () => {
  const drawer = read("src/components/intelligence/EmailDetailDrawer.tsx");
  has(drawer, 'document.body.style.overflow = "hidden"');
  has(drawer, 'aria-modal="true"');
  has(drawer, "overflow-y-auto overscroll-contain");
  has(drawer, "returnFocus.current");
  has(drawer, "mutationLock.current");
  has(drawer, 'if (!draft || mutationLock.current) return');
  has(drawer, 'event.key === "Escape"');
});

test("Today, Meetings and Sequences consume centralized presentation instead of raw states", () => {
  const today = read("src/app/(protected)/today/page.tsx");
  const meetings = read("src/app/(protected)/meetings/page.tsx");
  const sequences = read("src/app/(protected)/sequences/page.tsx");
  has(today, "formatUserFacingText(item.title)");
  has(today, "formatProductDateTime(item.created_at)");
  has(meetings, "formatProductTime(meeting.starts_at)");
  has(sequences, "presentSequenceState");
  assert.doesNotMatch(sequences, /\?\? sequence\.status|step\.label \|\| step\.type/);
});
