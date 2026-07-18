"use client";

import { Button } from "@/components/ui/Button";

type AccessPlanJumpProps = {
  children: React.ReactNode;
};

export function AccessPlanJump({ children }: AccessPlanJumpProps) {
  function handleClick() {
    const section = document.getElementById("planuri");
    const heading = document.getElementById("planuri-heading");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => heading?.focus(), reduceMotion ? 0 : 300);
  }

  return (
    <Button type="button" onClick={handleClick}>
      {children}
    </Button>
  );
}
