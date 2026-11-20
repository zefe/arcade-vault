"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { RocasControl } from "@/lib/games/rocas/engine";

type Props = {
  onControl: (control: RocasControl, down: boolean) => void;
  onFire: () => void;
  disabled: boolean; // en "ready", pausa o "gameover": los toques no hacen nada
};

const isInside = (el: HTMLElement, x: number, y: number) => {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

// Botón mantenido: activo mientras su dedo siga encima. Un dedo por botón; el resto se ignora.
// El toque táctil queda capturado por el botón, así que pointerleave no llega al salir:
// la salida se detecta en pointermove comparando con el rectángulo del botón.
function HoldButton({
  control,
  label,
  glyph,
  className,
  onControl,
  disabled,
}: {
  control: RocasControl;
  label: string;
  glyph: string;
  className: string;
  onControl: Props["onControl"];
  disabled: boolean;
}) {
  const pointerRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const set = (down: boolean) => {
    setActive(down);
    onControl(control, down);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault(); // sin foco: Espacio no reactivaría el botón
    if (disabled || pointerRef.current !== null) return;
    pointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    set(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== pointerRef.current) return;
    const inside = isInside(e.currentTarget, e.clientX, e.clientY);
    if (inside !== active) set(inside && !disabled);
  };

  const release = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== pointerRef.current) return;
    pointerRef.current = null;
    set(false);
  };

  return (
    <button
      type="button"
      className={`rocas-pad-btn ${className}`}
      aria-label={label}
      data-active={(active && !disabled) || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {glyph}
    </button>
  );
}

// FUEGO: cada toque es un disparo, como pulsar Espacio una vez.
function FireButton({
  onFire,
  disabled,
}: {
  onFire: () => void;
  disabled: boolean;
}) {
  const [active, setActive] = useState(false);
  const pointersRef = useRef(new Set<number>());

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled) return;
    pointersRef.current.add(e.pointerId);
    setActive(true);
    onFire();
  };

  const release = (e: PointerEvent<HTMLButtonElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) setActive(false);
  };

  return (
    <button
      type="button"
      className="rocas-pad-btn rocas-pad-fire"
      aria-label="Disparar"
      data-active={(active && !disabled) || undefined}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      FUEGO
    </button>
  );
}

export function RocasTouchPad({ onControl, onFire, disabled }: Props) {
  return (
    <div
      className="rocas-touch-pad"
      role="group"
      aria-label="Controles táctiles"
      data-disabled={disabled || undefined}
    >
      <div className="rocas-pad-cluster">
        <HoldButton
          control="left"
          label="Rotar a la izquierda"
          glyph="◀"
          className="rocas-pad-dir"
          onControl={onControl}
          disabled={disabled}
        />
        <HoldButton
          control="right"
          label="Rotar a la derecha"
          glyph="▶"
          className="rocas-pad-dir"
          onControl={onControl}
          disabled={disabled}
        />
      </div>
      <div className="rocas-pad-cluster">
        <HoldButton
          control="thrust"
          label="Propulsar"
          glyph="▲"
          className="rocas-pad-dir rocas-pad-thrust"
          onControl={onControl}
          disabled={disabled}
        />
        <FireButton onFire={onFire} disabled={disabled} />
      </div>
    </div>
  );
}
