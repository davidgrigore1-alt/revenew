"use client";

import { Button } from "@/components/ui/Button";

type AccessPlanJumpProps = {
  children: React.ReactNode;
};

export function AccessPlanJump({ children }: AccessPlanJumpProps) {
  function handleClick() {
    const section = document.getElementById("planuri");
    const heading = document.getElementById("planuri-heading");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => heading?.focus(), 300);
  }

  return (
    <Button type="button" onClick={handleClick}>
      {children}
    </Button>
  );
}
