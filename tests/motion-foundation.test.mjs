import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import postcss from "postcss";

const read = path => fs.readFileSync(path, "utf8");
const css = postcss.parse(read("src/app/globals.css"));
const modal = postcss.parse(read("src/components/ui/Modal.module.css"));
const variables = {};
css.walkRules(":root", rule => rule.walkDecls(/^--/, decl => { variables[decl.prop] = decl.value; }));
const resolve = value => value.replace(/var\((--[\w-]+)\)/g, (_, key) => resolve(variables[key] ?? key));
function rules(tree, selector) {
  const found = [];
  tree.walkRules(rule => { if (rule.selectors.includes(selector)) found.push(rule); });
  return found;
}
function property(rule, name) { return rule.nodes.find(node => node.prop === name)?.value; }
function reduced(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && parent.name === "media" && parent.params.includes("prefers-reduced-motion: reduce")) return true;
  }
  return false;
}

test("application entrances resolve to bounded tokens and never animate layout", () => {
  for (const [tree, selector, min, max] of [
    [css, ".app-page", 180, 240], [css, ".signup-step-fields", 180, 240],
    [css, ".intelligence-reveal", 120, 180], [modal, ".modal[open]", 160, 220]
  ]) {
    const rule = rules(tree, selector).find(rule => !reduced(rule));
    const animation = resolve(property(rule, "animation"));
    const duration = Number(animation.match(/(\d+)ms/)[1]);
    assert.ok(duration >= min && duration <= max, `${selector}: ${animation}`);
    const name = animation.split(" ")[0];
    tree.walkAtRules("keyframes", keyframes => {
      if (keyframes.params !== name) return;
      keyframes.walkDecls(decl => assert.ok(["opacity", "transform"].includes(decl.prop), decl.toString()));
    });
  }
});

test("reduced motion removes application entrances and delayed feedback without resetting positioning", () => {
  for (const [tree, selectors] of [[css, [".app-page", ".intelligence-reveal", ".signup-step-fields", ".skeleton-pulse"]], [modal, [".modal[open]"]]]) {
    for (const selector of selectors) {
      assert.ok(rules(tree, selector).some(rule => reduced(rule) && property(rule, "animation") === "none"), selector);
    }
  }
  const universal = rules(css, "*").find(rule => reduced(rule));
  assert.equal(property(universal, "animation-delay"), "0s");
  assert.equal(property(universal, "transition-delay"), "0s");
  assert.equal(property(universal, "animation-iteration-count"), "1");
  assert.equal(property(universal, "scroll-behavior"), "auto");
  assert.equal(property(universal, "transform"), undefined, "fixed/centered controls must keep their positioning");
});

test("shared operational hover feedback keeps controls and rows stationary", () => {
  for (const selector of [".product-lift:hover", ":root:not(.dark) .control-center-source-card:hover"]) {
    for (const rule of rules(css, selector)) assert.equal(property(rule, "transform"), undefined);
  }
  for (const path of ["src/components/ui/Button.tsx", "src/components/dashboard/KpiCard.tsx", "src/components/outreach/OutreachBoard.tsx", "src/components/apps/GoogleWorkspaceCard.tsx"]) {
    assert.doesNotMatch(read(path), /(?:hover|active):(?:-?translate|scale)/, path);
  }
});

test("chart motion remains short and honors the existing reduced-motion switch", () => {
  const chart = read("src/components/dashboard/ControlCenterVisuals.tsx");
  const durations = [...chart.matchAll(/animationDuration=\{(\d+)\}/g)];
  assert.ok(durations.length > 0);
  for (const [, duration] of durations) assert.ok(Number(duration) <= 240);
  assert.equal((chart.match(/isAnimationActive=\{!reduceMotion\}/g) ?? []).length, durations.length);
});
