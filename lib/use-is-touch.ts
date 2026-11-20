"use client";

import { useSyncExternalStore } from "react";

export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(TOUCH_QUERY).matches;
const getServerSnapshot = () => false;

/** `true` en dispositivos táctiles sin hover. `false` en servidor; valor real tras hidratar. */
export function useIsTouch(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
