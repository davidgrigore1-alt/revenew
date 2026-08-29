import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const native = createRequire(import.meta.url);
const read = file => fs.readFileSync(file, "utf8");
const at = "2026-08-28T12:00:00Z";
class ReferenceDate extends Date {
  constructor(...args) { super(...(args.length ? args : [at])); }
  static now() { return Date.parse(at); }
}
function loader(extra = {}) {
  const cache = new Map();
  const load = file => {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const require = id => {
      if (id === "server-only") return {};
      if (id.endsWith(".module.css")) return { board:"board", column:"column", columnBody:"columnBody" };
      if (id === "next/navigation") return { useRouter: () => ({refresh(){}}) };
      if (id === "next/link") return ({children, ...props}) => native("react").createElement("a", props, children);
      if (id === "@/lib/revenue-workspace/actions") return {updatePipelineStatus:()=>{throw Error("Rendering must not mutate CRM");}};
      if (id.startsWith("@/")) {
        const base = "src/"+id.slice(2);
        return load(base+(fs.existsSync(base+".ts") ? ".ts" : ".tsx"));
      }
      return native(id);
    };
    const output = ts.transpileModule(read(file), {fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    vm.runInNewContext(output, {module,exports:module.exports,require,Date:ReferenceDate,Intl,Number,Map,Set,URL,AbortSignal,console,...extra}, {filename:path.resolve(file)});
    return module.exports;
  };
  return load;
}
const load = loader();
const currency = load("src/lib/reporting-currency.ts");
const reporting = load("src/lib/control-center-reporting.ts");
const fx = Object.freeze({base:"EUR",quote:"RON",rate:5,publishedAt:"2026-08-28",source:"ECB"});
const item = (id, patch={}) => ({id,opportunityTitle:"Caz "+id,value:100,currency:"RON",deadline:"2026-08-28",severity:"attention",overdue:false,...patch});
const xml = (date="2026-08-28", rate="5.2584") => `<?xml version="1.0"?><gesmes:Envelope><Cube><Cube time='${date}'><Cube currency='USD' rate='1.15'/><Cube currency='RON' rate='${rate}'/></Cube></Cube></gesmes:Envelope>`;

test("reporting converts both directions without changing the original commercial amounts", () => {
  const rows = Object.freeze([Object.freeze({value:1000,currency:"RON"}),Object.freeze({value:100,currency:"EUR"})]);
  const before = JSON.stringify(rows);
  assert.equal(currency.convertReportingAmount(100,"EUR","RON",fx),500);
  assert.equal(currency.convertReportingAmount(500,"RON","EUR",fx),100);
  assert.equal(currency.convertReportingAmount(500,"RON","RON",null),500);
  assert.equal(currency.summarizeReportingAmounts(rows,"RON",fx).total,1500);
  assert.equal(currency.summarizeReportingAmounts(rows,"EUR",fx).total,300);
  assert.equal(JSON.stringify(rows),before);
});
test("missing FX never fabricates a unified total and retains original currency provenance", () => {
  const result = currency.summarizeReportingAmounts([{value:1000,currency:"RON"},{value:100,currency:"EUR"}],"EUR",null);
  assert.equal(result.total,null);
  assert.deepEqual(Array.from(result.originals,row=>[row.currency,row.value,row.count]),[["EUR",100,1],["RON",1000,1]]);
  assert.equal(currency.convertReportingAmount(100,"EUR","RON",null),null);
  assert.equal(currency.summarizeReportingAmounts([{value:100,currency:"RON"}],"RON",{...fx,rate:0}).total,null);
});
test("invalid values, unsupported currencies and unknown outcomes do not become confirmed zero", () => {
  for (const value of [null,undefined,NaN,Infinity]) assert.equal(currency.convertReportingAmount(value,"RON","EUR",fx),null);
  assert.equal(currency.convertReportingAmount(100,"USD","EUR",fx),null);
  assert.equal(currency.convertReportingAmount(Number.MAX_VALUE,"EUR","RON",fx),null);
  const result = currency.summarizeReportingAmounts([{value:50,currency:"EUR"},{value:30,currency:"USD"},{value:null,currency:"RON"}],"RON",fx);
  assert.equal(result.total,250);assert.equal(result.excludedCount,2);assert.equal(result.originals.find(row=>row.currency==="USD").value,30);
  assert.equal(currency.summarizeReportingAmounts([{value:null,currency:"RON"}],"RON",fx).total,null);
  assert.equal(currency.convertReportingAmount(0,"RON","EUR",fx),0);
});
test("ECB parser accepts the actual daily XML shape and rejects malformed, future or stale references", () => {
  const {parseEcbReportingRate:parse} = load("src/lib/reporting-fx.ts");
  assert.deepEqual(JSON.parse(JSON.stringify(parse(xml()))),{base:"EUR",quote:"RON",rate:5.2584,publishedAt:"2026-08-28",source:"ECB"});
  assert.ok(parse(xml("2026-08-21")));
  for (const input of [xml("2026-09-01"),xml("2026-08-01"),xml("2026-02-30"),xml("2026-08-28","0"),xml("2026-08-28","NaN"),"<html>unavailable</html>",xml().replace("RON","GBP"),"<!DOCTYPE e [<!ENTITY x SYSTEM 'file:///local'>]>"+xml(),xml()+xml()]) assert.equal(parse(input),null);
  assert.equal(parse(xml().replace("<Cube currency='USD' rate='1.15'/>","<Cube currency='RON' rate='4'/>")),null);
});
test("server ECB request uses a bounded request and six-hour Next data-cache revalidation", async () => {
  let request;
  const server = loader({fetch:async (...args)=>{request=args;return {ok:true,text:async()=>xml()};}})("src/lib/reporting-fx.ts");
  assert.equal((await server.getReportingFxRate()).rate,5.2584);
  assert.equal(request[0],"https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
  assert.equal(request[1].next.revalidate,21600);
  assert.ok(request[1].signal instanceof AbortSignal);
  assert.match(read("src/lib/reporting-fx.ts"),/import "server-only"/);
});
test("ECB network, HTTP and malformed-response failures keep pages renderable with no rate", async () => {
  for (const fetch of [async()=>{throw Error("network");},async()=>({ok:false}),async()=>({ok:true,text:async()=>"<html>Error</html>"})]) {
    assert.equal(await loader({fetch})("src/lib/reporting-fx.ts").getReportingFxRate(),null);
  }
});
test("EUR and RON charts include the same mixed-currency cases and preserve originals", () => {
  const cases = Object.freeze([Object.freeze(item("ron",{value:1000})),Object.freeze(item("eur",{value:100,currency:"EUR",deadline:"2026-08-29"}))]);
  const before = JSON.stringify(cases);
  const ron = reporting.buildReportingControlCenter(cases,"RON",fx,at);
  const eur = reporting.buildReportingControlCenter(cases,"EUR",fx,at);
  assert.equal(ron.points.length,2);assert.equal(eur.points.length,2);
  assert.equal(ron.datedValue,1500);assert.equal(eur.datedValue,300);
  assert.equal(eur.points[0].cases[0].item.currency,"RON");
  assert.equal(eur.points[0].cases[0].item.value,1000);
  assert.equal(eur.points[0].cases[0].converted,200);
  assert.equal(JSON.stringify(cases),before);
  assert.ok(reporting.buildReportingControlCenter([item("only-ron")],"EUR",fx,at).points.length);
});
test("current deadline buckets are exclusive, deduplicated and never invent dates for undated cases", () => {
  const cases = [item("past",{deadline:"2026-08-27",overdue:true}),item("today"),item("seven",{deadline:"2026-09-04"}),item("eight",{deadline:"2026-09-05",severity:"informative"}),item("fourteen",{deadline:"2026-09-11"}),item("later",{deadline:"2026-09-12"}),item("undated",{deadline:null}),item("invalid-date",{deadline:"2026-02-30"})];
  const model = reporting.buildReportingControlCenter([...cases,cases[0]],"RON",fx,at);
  assert.equal(model.count,8);assert.equal(model.undatedCount,2);assert.equal(model.undated,200);
  assert.deepEqual(Array.from(model.buckets,row=>Array.from(row.counts)),[[1,0,0],[0,2,0],[0,1,1],[0,1,0]]);
  assert.equal(model.points.length,6);assert.equal(model.datedValue,600);
  assert.equal(model.buckets.reduce((sum,row)=>sum+row.values.reduce((a,b)=>a+b,0),0),600);
  assert.ok(model.points.every(point=>point.cases.every(row=>row.item.deadline)));
});
test("Bucharest calendar boundaries and missing FX have explicit truthful fallbacks", () => {
  const model = reporting.buildReportingControlCenter([item("midnight",{deadline:"2026-08-28T21:30:00Z"})],"RON",fx,"2026-08-28T22:00:00Z");
  assert.equal(model.points[0].date,"2026-08-29");
  assert.equal(model.buckets[1].counts[1],1);
  const missing = reporting.buildReportingControlCenter([item("a"),item("b",{currency:"EUR"})],"EUR",null,at);
  assert.equal(missing.total,null);assert.equal(missing.points.length,0);
  assert.equal(missing.buckets[1].counts[1],2);assert.equal(missing.originals.length,2);
});
test("shared dark surfaces are neutral and Select uses a defined opaque portal surface", () => {
  const css = read("src/app/globals.css");
  const dark = css.slice(css.indexOf(".dark {"),css.indexOf(".account-light-theme"));
  for (const token of ["background","background-soft","surface","surface-subtle","surface-muted","surface-elevated","surface-floating","sidebar","border","border-strong"]) {
    const values = dark.match(new RegExp("--"+token+": (\\d+) (\\d+) (\\d+);"));
    assert.ok(values,token);assert.equal(values[1],values[2],token);assert.equal(values[2],values[3],token);
  }
  assert.match(dark,/--background: 6 6 6/);
  const select = read("src/components/ui/Select.tsx");
  assert.match(select,/bg-\[rgb\(var\(--surface-floating\)\)\]/);
  assert.match(select,/createPortal/);assert.match(select,/document.body/);
  assert.match(select,/density\s*===\s*"compact"[\s\S]*?"h-\[var\(--control-height-compact\)\]"[\s\S]*?:[\s\S]*?"h-\[var\(--control-height\)\]"/);
  assert.doesNotMatch(select,/backdrop-blur/);
});
test("Pipeline renders original and converted amounts, preserved stages and no fake terminal next step", () => {
  const React = native("react"),{renderToStaticMarkup}=native("react-dom/server");
  const {PipelineBoard}=load("src/components/revenue/PipelineBoard.tsx");
  const base={id:"op",title:"Oportunitate comercială",currency:"EUR",estimatedValueHigh:1000,ownerProfileId:"owner",ownerName:"Ana Pop",actions:[{id:"step",title:"Confirmă condițiile",status:"pending",dueDate:"2026-08-31"}],status:"reviewed",lifecycleStatus:"open"};
  const columns=[{id:"lead",label:"Lead",count:1,totalValue:0,nextStatus:"reviewed",opportunities:[base]},{id:"won",label:"Câștigat",count:1,totalValue:0,nextStatus:"won",opportunities:[{...base,id:"won",status:"won",lifecycleStatus:"won",actualOutcomeAmount:700,outcomeDate:"2026-08-28"}]}];
  columns.push({id:"lost",label:"Pierdut",count:1,totalValue:0,nextStatus:"lost",opportunities:[{...base,id:"disqualified",status:"ignored",lifecycleStatus:"disqualified"}]});
  const html=renderToStaticMarkup(React.createElement(PipelineBoard,{columns,fx}));
  assert.match(html,/Descalificat · valoare estimată/);
  assert.match(html,/Lead/);assert.match(html,/Câștigat/);assert.match(html,/1.000[^<]*EUR/);assert.match(html,/≈ 5.000[^<]*RON/);
  assert.equal((html.match(/role="combobox"/g)||[]).length,1);
  assert.equal((html.match(/Confirmă condițiile/g)||[]).length,2); // text + accessible title, active card only
  assert.match(html,/Venit confirmat/);assert.doesNotMatch(html,/Pas planificat/);
  const source=read("src/components/revenue/PipelineBoard.tsx"),css=read("src/components/ui/OperationalPatterns.module.css");
  assert.match(source,/updatePipelineStatus\(\s*opportunityId,\s*formData,?\s*\)/);
  assert.match(source,/line-clamp-2/);
  const columnBody = css.match(/\.columnBody\s*\{[^}]+\}/)[0];
  assert.doesNotMatch(columnBody,/max-height/);
  assert.match(columnBody,/overflow-y:\s*auto/);
});
test("Control Center rendering discloses original currency, estimate semantics and FX failure", () => {
  const React=native("react"),{renderToStaticMarkup}=native("react-dom/server");
  const {ControlCenterVisuals}=load("src/components/dashboard/ControlCenterVisuals.tsx");
  const cases=[item("one",{currency:"EUR"}),item("two",{value:1000,deadline:"2026-08-29"})];
  const html=renderToStaticMarkup(React.createElement(ControlCenterVisuals,{cases,fx,asOf:at}));
  for (const phrase of ["Expunere cumulată după termen","Unde este concentrată expunerea","Monede originale","Curs de referință ECB","Valoarea cazurilor deschise","Valorile originale rămân neschimbate","Original","Echivalent RON"]) assert.ok(html.includes(phrase),phrase);
  assert.match(html,/nu reprezintă (?:istoricul expunerii|istoric de venit)/);
  const fallback=renderToStaticMarkup(React.createElement(ControlCenterVisuals,{cases,fx:null,asOf:at}));
  assert.match(fallback,/Conversia valutară este temporar indisponibilă/);
  assert.match(fallback,/numărul de cazuri/i);assert.match(fallback,/disabled/);
  assert.match(fallback,/Valorile originale rămân separate pe monede/);
  assert.doesNotMatch(fallback,/0 cazuri cu valoare și termen confirmate/);
  const unknown=renderToStaticMarkup(React.createElement(ControlCenterVisuals,{cases:[item("unknown",{value:null})],fx,asOf:at}));
  assert.match(unknown,/Sume neconfirmate: barele arată numărul de cazuri/);
  assert.match(unknown,/sumă neconfirmată/);
});

test("G3F.2 cumulative tooltip composition counts only represented cases and keeps earlier boundaries immutable", () => {
  const cases=[item("first",{value:100,currency:"EUR",deadline:"2026-08-27"}),item("second",{value:1000,deadline:"2026-08-28"}),item("third",{value:500,deadline:"2026-08-28"}),item("unknown",{value:null,deadline:"2026-08-28"})];
  const before=JSON.stringify(cases);
  const model=reporting.buildReportingControlCenter([...cases,cases[0]],"RON",fx,at);
  assert.equal(model.points[0].cumulativeCount,1);
  assert.equal(model.points[1].cumulativeCount,3);
  assert.equal(model.points[1].cumulative,2000);
  assert.deepEqual(Array.from(model.points[0].cumulativeOriginals,row=>[row.currency,row.count]),[["EUR",1]]);
  assert.deepEqual(Array.from(model.points[1].cumulativeOriginals,row=>[row.currency,row.count]),[["EUR",1],["RON",2]]);
  assert.equal(model.overdueValue,500);assert.equal(model.overdueCount,1);
  assert.equal(model.excludedCount,1);assert.equal(JSON.stringify(cases),before);
});
test("G3F.2 today marker is limited to the real visible deadline domain", () => {
  const build=(dates,now=at)=>reporting.buildReportingControlCenter(dates.map((deadline,index)=>item(String(index),{deadline})),"RON",fx,now);
  assert.equal(build(["2026-08-27","2026-08-31"]).todayInRange,true);
  assert.equal(build(["2026-08-29","2026-08-31"]).todayInRange,false);
  assert.equal(build(["2026-08-24","2026-08-27"]).todayInRange,false);
  assert.equal(build(["2026-08-28"]).todayInRange,false);
  assert.equal(build([null,"invalid"]).todayInRange,false);
  assert.equal(build(["2026-08-28","2026-08-31"],"2026-08-28T21:15:00Z").today,"2026-08-29");
});
test("G3F.2 buckets expose value, case count and original currencies in either analytical unit", () => {
  const cases=[item("ron",{deadline:"2026-08-31",value:1000}),item("eur",{deadline:"2026-08-31",value:100,currency:"EUR"}),item("no-date",{deadline:null,value:30,currency:"EUR"})];
  for (const [unit,total] of [["RON",1500],["EUR",300]]) {
    const model=reporting.buildReportingControlCenter(cases,unit,fx,at),bucket=model.buckets[1];
    assert.equal(bucket.summary.total,total);
    assert.equal(bucket.counts.reduce((a,b)=>a+b,0),2);
    assert.deepEqual(Array.from(bucket.summary.originals,row=>[row.currency,row.count]),[["EUR",1],["RON",1]]);
    assert.equal(model.undatedOriginals[0].currency,"EUR");assert.equal(model.undatedOriginals[0].value,30);
  }
  assert.equal(currency.caseCountLabel(1),"1 caz");assert.equal(currency.caseCountLabel(2),"2 cazuri");
});
test("G3F.2 chart rendering shows case counts, current-deadline semantics and a bounded today marker", () => {
  const React=native("react"),{renderToStaticMarkup}=native("react-dom/server"),{ControlCenterVisuals}=load("src/components/dashboard/ControlCenterVisuals.tsx");
  const render=cases=>renderToStaticMarkup(React.createElement(ControlCenterVisuals,{cases,fx,asOf:at}));
  const html=render([item("past",{deadline:"2026-08-27"}),item("upcoming",{deadline:"2026-08-31",currency:"EUR"}),item("undated",{deadline:null,value:50,currency:"EUR"})]);
  assert.match(html,/aria-label="Expunere estimată în RON, cumulată după termenele comerciale actuale/);
  const source=read("src/components/dashboard/ControlCenterVisuals.tsx");
  assert.match(source,/model\.todayInRange && model\.today/);
  assert.match(source,/<ReferenceLine[\s\S]*?value: "ASTĂZI"/);
  assert.match(html,/1 caz/);assert.match(html,/EUR: 2 cazuri/);assert.match(html,/RON: 1 caz/);
  assert.match(html,/înainte de astăzi/);assert.match(html,/Fără termen: 1 caz/);

  assert.equal(reporting.buildReportingControlCenter([item("later",{deadline:"2026-08-31"}),item("latest",{deadline:"2026-09-02"})],"RON",fx,at).todayInRange,false);
  const empty=render([item("none",{deadline:null,value:50,currency:"EUR"})]);
  assert.match(empty,/Nu există termene comerciale confirmate pentru această selecție/);
  assert.match(empty,/50[^<]*EUR/);
});
test("G3F.2 comfort scale uses shared roles, preserves compact secondary controls and avoids page scaling", () => {
  const css=read("src/app/globals.css"),config=read("tailwind.config.ts");
  const comfort=css.slice(css.indexOf(".product-desktop, .product-popup"),css.indexOf(".app-section-stack"));
  assert.match(comfort,/--font-size-xs: 0.8125rem/);assert.match(comfort,/--font-size-sm: 0.90625rem/);
  assert.doesNotMatch(comfort,/zoom\s*:|transform\s*:|scale\(/);
  assert.match(config,/xs: \["var\(--font-size-xs\)"/);assert.match(config,/sm: \["var\(--font-size-sm\)"/);
  assert.match(read("src/components/dashboard/AppShell.tsx"),/product-desktop/);
  assert.match(read("src/components/dashboard/ShellNavigation.tsx"),/min-h-8 gap-2 px-2 text-label/);
  assert.match(read("src/components/ui/Input.tsx"),/min-h-\[var\(--control-height\)\]/);
  assert.match(read("src/components/ui/Button.tsx"),/default: "h-\[var\(--control-height\)\]/);
  assert.match(read("src/components/revenue/PipelineBoard.tsx"),/<Select\s+density="compact"/);
  assert.match(read("src/components/ui/Select.tsx"),/product-popup/);
  assert.match(css,/--control-height: 2.25rem/);assert.match(css,/--control-height-compact: 2rem/);
});
test("G3F.2 charts retain accessible semantic and textual values independent of visual geometry", () => {
  const source=read("src/components/dashboard/ControlCenterVisuals.tsx");
  assert.equal((source.match(/role="img"/g)||[]).length,2);
  assert.match(source,/Expunere estimată în \$\{currency\}, cumulată după termenele comerciale actuale/);
  assert.match(source,/nu reprezintă[\s\S]*?istoricul expunerii[\s\S]*?prognoză de încasare/);

  assert.match(source,/cumulativeOriginals/);assert.match(source,/caseCountLabel\(row\.count\)/);

  assert.equal((source.match(/<table /g)||[]).length,2);
  assert.doesNotMatch(source,/fetch\(|localStorage|Math.random/);
});
