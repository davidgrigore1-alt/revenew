"use client";

import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function ErrorState({
  title = "Nu am putut încărca informațiile.",
  description = "Verifică conexiunea și încearcă din nou.",
  actionLabel = "Reîncearcă",
  actionHref = "/dashboard",
  onAction
}: ErrorStateProps) {
  return (
    <AlertBanner
      tone="danger"
      title={title}
      action={<Button href={onAction ? undefined : actionHref} onClick={onAction} variant="secondary">{actionLabel}</Button>}
    >
      {description}
    </AlertBanner>
  );
}
