"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { activateModal, containModalTab, isModalBackdrop } from "@/lib/ui/modal-lifecycle";
import { OverlayPortalContext } from "@/components/ui/overlay-context";
import { cn } from "@/lib/utils";
import styles from "./Modal.module.css";

type ModalProps = {
  children: ReactNode;
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
};

/** Mount while open; unmount closes, unlocks scrolling and restores the initiator. */
function Modal({ children, labelledBy, describedBy, onClose, initialFocusRef, returnFocusRef, dismissible = true, closeOnBackdrop = false, drawer = false }: ModalProps & { drawer?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLDialogElement | null>(null);
  const backdropPress = useRef(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!container) return;
    return activateModal(container, initialFocusRef?.current, returnFocusRef?.current);
  }, [container, initialFocusRef, returnFocusRef]);

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={setContainer}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      className={cn(styles.modal, drawer ? styles.drawer : styles.dialog)}
      onCancel={event => { event.preventDefault(); if (dismissible) onClose(); }}
      onKeyDown={event => containModalTab(event.currentTarget, event)}
      onPointerDown={event => { backdropPress.current = isModalBackdrop(event.currentTarget, event.target, event.clientX, event.clientY); }}
      onClick={event => {
        const outside = backdropPress.current && isModalBackdrop(event.currentTarget, event.target, event.clientX, event.clientY);
        backdropPress.current = false;
        if (outside && closeOnBackdrop && dismissible) onClose();
      }}
    >
      <OverlayPortalContext.Provider value={container}>{children}</OverlayPortalContext.Provider>
    </dialog>, document.body
  );
}

export function Dialog(props: ModalProps) { return <Modal {...props} />; }
export function Drawer(props: ModalProps) { return <Modal closeOnBackdrop {...props} drawer />; }
