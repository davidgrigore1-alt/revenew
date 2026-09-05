import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/ui/modal-lifecycle.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports });
const { activateModal, containModalTab, isModalBackdrop } = module.exports;

function fixture() {
  const doc = { body: { style: { overflow: "auto", paddingRight: "7px" } }, documentElement: { style: { overflow: "scroll" }, clientWidth: 980 }, activeElement: null };
  class Element {
    isConnected = true;
    tabIndex = 0;
    disabled = false;
    hidden = false;
    focus() { doc.activeElement = this; }
    matches() { return this.disabled; }
    closest() { return this.hidden ? {} : null; }
    getClientRects() { return this.hidden ? [] : [{}]; }
  }
  doc.defaultView = { HTMLElement: Element, innerWidth: 1000, getComputedStyle: () => ({ paddingRight: "7px" }) };
  const opener = new Element(), first = new Element(), last = new Element(), disabled = new Element();
  disabled.disabled = true;
  const dialog = Object.assign(new Element(), {
    ownerDocument: doc, open: false, children: [first, disabled, last],
    showModal() { this.open = true; first.focus(); }, close() { this.open = false; },
    contains(node) { return this.children.includes(node); },
    querySelectorAll() { return this.children; },
    getBoundingClientRect() { return { left: 20, right: 300, top: 20, bottom: 500 }; }
  });
  opener.focus();
  return { doc, opener, first, last, dialog, Element };
}
function tab(shiftKey = false) { return { key: "Tab", shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; }

test("open focuses safely, locks scrolling with existing padding, and close restores exact prior styles and opener", () => {
  const { doc, opener, dialog } = fixture();
  const close = activateModal(dialog);
  assert.equal(dialog.open, true);
  assert.equal(doc.activeElement, dialog);
  assert.equal(doc.body.style.paddingRight, "27px");
  assert.equal(doc.body.style.overflow, "hidden");
  assert.equal(doc.documentElement.style.overflow, "hidden");
  close(); close();
  assert.equal(dialog.open, false);
  assert.equal(doc.activeElement, opener);
  assert.equal(doc.body.style.paddingRight, "7px");
  assert.equal(doc.body.style.overflow, "auto");
  assert.equal(doc.documentElement.style.overflow, "scroll");
});

test("preferred focus stays within the dialog and async consumers can name the original initiator", () => {
  const { doc, opener, dialog, first, Element } = fixture();
  new Element().focus();
  const close = activateModal(dialog, first, opener);
  assert.equal(doc.activeElement, first);
  close();
  assert.equal(doc.activeElement, opener);
  const again = activateModal(dialog, new Element());
  assert.equal(doc.activeElement, dialog);
  opener.isConnected = false;
  again();
  assert.notEqual(doc.activeElement, opener);
});

test("Tab and Shift+Tab wrap at the edges, skip disabled controls, and handle no available controls", () => {
  const { doc, dialog, first, last } = fixture();
  last.focus(); const forward = tab(); containModalTab(dialog, forward);
  assert.equal(doc.activeElement, first); assert.equal(forward.defaultPrevented, true);
  const backward = tab(true); containModalTab(dialog, backward);
  assert.equal(doc.activeElement, last); assert.equal(backward.defaultPrevented, true);
  first.focus(); const middle = tab(); containModalTab(dialog, middle);
  assert.equal(middle.defaultPrevented, false);
  dialog.children = []; const empty = tab(); containModalTab(dialog, empty);
  assert.equal(doc.activeElement, dialog); assert.equal(empty.defaultPrevented, true);
});

test("focus filtering excludes hidden/negative-tabindex elements and respects a child's handled key", () => {
  const { doc, dialog, first, last, Element } = fixture();
  const hidden = new Element(); hidden.hidden = true;
  const negative = new Element(); negative.tabIndex = -1;
  dialog.children = [negative, hidden, first, last];
  dialog.focus(); containModalTab(dialog, tab()); assert.equal(doc.activeElement, first);
  const handled = tab(); handled.defaultPrevented = true;
  last.focus(); containModalTab(dialog, handled); assert.equal(doc.activeElement, last);
});

test("backdrop detection excludes dialog padding and clicks originating in content", () => {
  const { dialog, first } = fixture();
  assert.equal(isModalBackdrop(dialog, dialog, 5, 100), true);
  assert.equal(isModalBackdrop(dialog, dialog, 30, 100), false);
  assert.equal(isModalBackdrop(dialog, first, 5, 100), false);
});

test("rapid activation/cleanup cycles do not accumulate padding or leave locks", () => {
  const { doc, dialog, opener } = fixture();
  for (let i = 0; i < 5; i++) activateModal(dialog)();
  assert.equal(doc.body.style.paddingRight, "7px");
  assert.equal(doc.body.style.overflow, "auto");
  assert.equal(doc.activeElement, opener);
});
