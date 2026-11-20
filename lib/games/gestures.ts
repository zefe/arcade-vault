// Helper de gestos táctiles compartido por los motores (puro, sin DOM).
// Todas las distancias en píxeles CSS (clientX/clientY), no en unidades del mundo.

export type SwipeDir = "up" | "down" | "left" | "right";

/** Distancia mínima en el eje dominante para que un arrastre cuente como swipe. */
export const SWIPE_MIN_PX = 24;
/** Movimiento máximo para que un toque cuente como tap. */
export const TAP_MAX_PX = 10;
/** Duración máxima de un tap. */
export const TAP_MAX_MS = 250;
/** Velocidad mínima (px/ms) para un swipe rápido (caída instantánea). */
export const FAST_SWIPE_PX_PER_MS = 0.8;

/**
 * Dirección del swipe según el eje dominante, o `null` si no supera
 * `SWIPE_MIN_PX`. `dy` positivo = hacia abajo (coordenadas de pantalla).
 */
export function classifySwipe(dx: number, dy: number): SwipeDir | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_MIN_PX) return null;
  if (ax > ay) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
