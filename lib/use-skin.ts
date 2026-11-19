"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/lib/skins";

const skinKey = (gameId: string) => `av_skin_${gameId}`;

// Skin elegido por juego, persistido en localStorage. El primer render usa
// siempre DEFAULT_SKIN y el guardado se lee tras montar (hydration-safe).
export function useSkin(gameId: string): [SkinId, (s: SkinId) => void] {
  const [skin, setSkinState] = useState<SkinId>(DEFAULT_SKIN);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(skinKey(gameId));
      // Intentional: localStorage is only readable after mount (hydration-safe).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isSkinId(raw)) setSkinState(raw);
    } catch {}
  }, [gameId]);

  const setSkin = useCallback(
    (s: SkinId) => {
      setSkinState(s);
      try {
        localStorage.setItem(skinKey(gameId), s);
      } catch {}
    },
    [gameId],
  );

  return [skin, setSkin];
}
