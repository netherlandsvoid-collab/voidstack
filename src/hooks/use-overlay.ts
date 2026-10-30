"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

// Keep closing overlays mounted just long enough to finish their exit motion.
export function usePresence(value: string, duration = 160) {
  const [lastValue, setLastValue] = useState(value);
  useEffect(() => {
    if (value) {
      setLastValue(value);
      return;
    }
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : duration;
    const timer = window.setTimeout(() => setLastValue(""), delay);
    return () => window.clearTimeout(timer);
  }, [value, duration]);
  return { value: value || lastValue, exiting: !value && !!lastValue };
}

export function useOverlayFocus(
  active: string,
  target: RefObject<HTMLElement | null>,
  dismiss: () => void,
) {
  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  });
  useEffect(() => {
    if (!active || !target.current) return;
    const panel = target.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.focus({ preventScroll: true });
    const tabbable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ),
      ).filter(
        (el) =>
          !el.closest("[hidden],[inert]") &&
          el.getClientRects().length > 0 &&
          el.tabIndex >= 0,
      );
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = tabbable();
      const first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        panel.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (!panel.contains(event.target as Node))
        panel.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      if (
        previous?.isConnected &&
        previous !== document.body &&
        previous !== document.documentElement &&
        !previous.closest("[inert],[hidden]") &&
        previous.getClientRects().length
      )
        previous.focus({ preventScroll: true });
      else
        document.getElementById("main-content")?.focus({ preventScroll: true });
    };
  }, [active, target]);
}
