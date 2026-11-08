import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Sizes an element to fill the viewport from its top edge down to the bottom of the screen,
// stopping above the mobile bottom bar (--bottom-nav-height, 0 on wider screens).
// remeasureWhen: a value that can move the element's top edge when it changes (e.g. a loading
// flag), so the element is measured again.
export function useFillViewportHeight<T extends HTMLElement>(remeasureWhen?: unknown) {
  const ref = useRef<T>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (!ref.current) return;
      setTop(ref.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [remeasureWhen]);

  const style: CSSProperties | undefined =
    top !== null
      ? { height: `calc(100dvh - ${top}px - var(--bottom-nav-height, 0px))` }
      : undefined;

  return { ref, style };
}
