// Shared by the forms and the Server Actions: no server dependencies.

export const PASSWORD_MIN = 8;
export const RESEND_WAIT_S = 60;

export const AUTH_TEXT = {
  credentials: "CORREO O CONTRASEÑA INCORRECTOS",
  aliasTaken: "ALIAS NO DISPONIBLE",
  aliasInvalid: "ALIAS: 3–10 CARACTERES, A-Z, 0-9 Y _",
  email: "CORREO NO VÁLIDO",
  password: "MÍNIMO 8 CARACTERES",
  unconfirmed: "CONFIRMA TU CORREO PARA ENTRAR",
  rateLimit: "DEMASIADOS INTENTOS. ESPERA UN MOMENTO",
  other: "SEÑAL PERDIDA. INTÉNTALO DE NUEVO",
} as const;

const NEXT_DEFAULT = "/juegos";
const ALIAS_RE = /^[A-Z0-9_]{3,10}$/;
const ALIAS_RESERVED = "INVITADO";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only used to resolve relative paths; never reached.
const BASE_ORIGIN = "http://internal.invalid";

export function normalizeAlias(raw: string): string {
  return raw.trim().toUpperCase();
}

// Format only: INVITADO is well formed but reserved (ALIAS NO DISPONIBLE).
export function isValidAlias(alias: string): boolean {
  return ALIAS_RE.test(alias);
}

export function isReservedAlias(alias: string): boolean {
  return alias === ALIAS_RESERVED;
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
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
