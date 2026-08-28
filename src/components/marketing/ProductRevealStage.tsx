"use client";

import { useEffect, useRef, useState } from "react";
import { ProductPreview } from "@/components/marketing/ProductPreview";

export function ProductRevealStage() {
  const stageRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const [storyReady, setStoryReady] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    let visible = false;
    let activated = false;
    let storyTimer: number | undefined;

    const activate = (showFinalState = false) => {
      if (activated) {
        if (showFinalState) setStoryReady(true);
        return;
      }
      activated = true;
      setActive(true);
      if (showFinalState) {
        setStoryReady(true);
        return;
      }
      storyTimer = window.setTimeout(() => setStoryReady(true), 180);
    };

    const evaluateMotionPreference = () => {
      if (reducedMotion.matches || !desktop.matches) activate(true);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && window.scrollY > 24) activate();
    }, { rootMargin: "0px 0px -12%", threshold: 0.12 });

    const handleFirstScroll = () => {
      if (visible && window.scrollY > 24) activate();
    };

    observer.observe(stage);
    evaluateMotionPreference();
    window.addEventListener("scroll", handleFirstScroll, { passive: true });
    reducedMotion.addEventListener("change", evaluateMotionPreference);
    desktop.addEventListener("change", evaluateMotionPreference);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleFirstScroll);
      reducedMotion.removeEventListener("change", evaluateMotionPreference);
      desktop.removeEventListener("change", evaluateMotionPreference);
      if (storyTimer) window.clearTimeout(storyTimer);
    };
  }, []);

  return (
    <section ref={stageRef} data-active={active} data-story-ready={storyReady} className="marketing-product-story" aria-label="Demonstrație ReveNew">
      <div className="marketing-product-stage">
        <div className="marketing-product-stage-copy">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Produsul în lucru</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Scenariu ilustrativ · datele reale depind de sursele autorizate.</p>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}