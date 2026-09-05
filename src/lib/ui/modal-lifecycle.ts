/** Shared lifecycle for the two native modal presentations. */
export function activateModal(dialog: HTMLDialogElement, preferredFocus?: HTMLElement | null, returnFocus?: HTMLElement | null) {
  const doc = dialog.ownerDocument;
  const view = doc.defaultView!;
  const opener = returnFocus ?? (doc.activeElement instanceof view.HTMLElement ? doc.activeElement : null);
  const body = doc.body.style;
  const root = doc.documentElement.style;
  const previous = { bodyOverflow: body.overflow, rootOverflow: root.overflow, padding: body.paddingRight };
  const scrollbar = Math.max(0, view.innerWidth - doc.documentElement.clientWidth);
  // showModal supplies the top layer and browser-managed background inertness.
  dialog.showModal();
  if (scrollbar) body.paddingRight = `${(parseFloat(view.getComputedStyle(doc.body).paddingRight) || 0) + scrollbar}px`;
  body.overflow = "hidden";
  root.overflow = "hidden";
  const target = preferredFocus && dialog.contains(preferredFocus) ? preferredFocus : dialog;
  target.focus({ preventScroll: true });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    dialog.close();
    body.overflow = previous.bodyOverflow;
    root.overflow = previous.rootOverflow;
    body.paddingRight = previous.padding;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
}

export function containModalTab(dialog: HTMLDialogElement, event: { key: string; shiftKey: boolean; defaultPrevented: boolean; preventDefault(): void }) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const candidates = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]'));
  const targets = candidates.filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest('[hidden],[inert],[aria-hidden="true"]') && element.getClientRects().length > 0 && dialog.ownerDocument.defaultView!.getComputedStyle(element).visibility !== "hidden");
  const first = targets[0], last = targets[targets.length - 1];
  const active = dialog.ownerDocument.activeElement;
  if (!first) {
    event.preventDefault();
    dialog.focus();
  } else if (event.shiftKey && (active === first || !targets.includes(active as HTMLElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !targets.includes(active as HTMLElement))) {
    event.preventDefault();
    first.focus();
  }
}

export function isModalBackdrop(dialog: HTMLDialogElement, target: EventTarget | null, x: number, y: number) {
  if (target !== dialog) return false;
  const rect = dialog.getBoundingClientRect();
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}
