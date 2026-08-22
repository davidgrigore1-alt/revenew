"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const initialRect = element.getBoundingClientRect();
    const startsInViewport = initialRect.top < window.innerHeight && initialRect.bottom > 0;
    if (startsInViewport) {
      setVisible(true);
      return;
    }

    setVisible(false);

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={cn("marketing-reveal", className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
        transitionDelay: visible && delay ? `${delay}ms` : "0ms",
        transitionDuration: "240ms",
        transitionProperty: "opacity, transform",
        transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)"
      }}
    >
      {children}
    </div>
  );
}
