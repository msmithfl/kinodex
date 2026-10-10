import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, DependencyList } from "react";

// Sizes an element to fill the viewport from its top edge down to the bottom of the screen,
// stopping above the mobile bottom bar (--bottom-nav-height, 0 on wider screens).
// Pass deps that change the element's position (e.g. a loading flag) so it is re-measured.
export function useFillViewportHeight<T extends HTMLElement>(
  deps: DependencyList = [],
) {
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
  }, deps);

  const style: CSSProperties | undefined =
    top !== null
      ? { height: `calc(100dvh - ${top}px - var(--bottom-nav-height, 0px))` }
      : undefined;

  return { ref, style };
}
