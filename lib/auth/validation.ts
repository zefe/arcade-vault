// Shared by the forms and the Server Actions: no server dependencies.

export const PASSWORD_MIN = 8;
export const RESEND_WAIT_S = 60;

const NEXT_DEFAULT = "/juegos";
const ALIAS_RE = /^[A-Z0-9_]{3,10}$/;
// Only used to resolve relative paths; never reached.
const BASE_ORIGIN = "http://internal.invalid";

export function normalizeAlias(raw: string): string {
  return raw.trim().toUpperCase();
}

// Format only: INVITADO is well formed but reserved (ALIAS NO DISPONIBLE).
export function isValidAlias(alias: string): boolean {
  return ALIAS_RE.test(alias);
}

// Internal paths only, so `next` can't send the player to another site or loop back to /auth.
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return NEXT_DEFAULT;
  if (/[\\\u0000-\u001f\u007f-\u009f]/.test(raw)) return NEXT_DEFAULT;

  try {
    const url = new URL(raw, BASE_ORIGIN);
    if (url.origin !== BASE_ORIGIN) return NEXT_DEFAULT;

    // Checked after resolving: "/.//evil.test" becomes "//evil.test", "/x/../auth" becomes "/auth".
    const path = decodeURIComponent(url.pathname);
    if (path.startsWith("//") || /^\/auth(\/|$)/.test(path)) {
      return NEXT_DEFAULT;
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return NEXT_DEFAULT;
  }
}
