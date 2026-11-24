"use server";

import type { AuthError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_TEXT,
  PASSWORD_MIN,
  isReservedAlias,
  isValidAlias,
  isValidEmail,
  normalizeAlias,
  safeNext,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthField = "alias" | "email" | "password";
export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: AuthField }
  | { status: "check-email"; email: string }
  | { status: "unconfirmed"; email: string };

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(message: string, field?: AuthField): AuthState {
  return { status: "error", message, field };
}

function isRateLimit(error: AuthError): boolean {
  return (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  );
}

// Never logs the form: only the error.
function unexpected(context: string, error: unknown): AuthState {
  console.error(context, error);
  return fail(AUTH_TEXT.other);
}

// Origin from the Host of the request, so it works on localhost and LAN.
// Supabase's Redirect URLs allowlist limits the valid destinations.
async function callbackUrl(flow: "email" | "oauth", next: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "http";
  const url = new URL("/auth/callback", `${proto}://${h.get("host")}`);
  url.searchParams.set("flow", flow);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next"));

  if (!isValidEmail(email)) return fail(AUTH_TEXT.email, "email");
  if (!password) return fail(AUTH_TEXT.credentials);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isRateLimit(error)) return fail(AUTH_TEXT.rateLimit);
    if (error.code === "email_not_confirmed") {
      return { status: "unconfirmed", email };
    }
    if (error.code === "invalid_credentials") {
      return fail(AUTH_TEXT.credentials);
    }
    return unexpected("No se pudo iniciar sesión", error);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const alias = normalizeAlias(text(formData, "alias"));
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next"));

  if (!isValidAlias(alias)) return fail(AUTH_TEXT.aliasInvalid, "alias");
  if (isReservedAlias(alias)) return fail(AUTH_TEXT.aliasTaken, "alias");
  if (!isValidEmail(email)) return fail(AUTH_TEXT.email, "email");
  if (password.length < PASSWORD_MIN) {
    return fail(AUTH_TEXT.password, "password");
  }

  const supabase = await createClient();
  const isAvailable = () =>
    supabase.rpc("is_name_available", { p_name: alias });

  const { data: available, error: nameError } = await isAvailable();
  if (nameError) return unexpected("No se pudo comprobar el alias", nameError);
  if (!available) return fail(AUTH_TEXT.aliasTaken, "alias");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { av_name: alias },
      emailRedirectTo: await callbackUrl("email", next),
    },
  });

  if (error) {
    if (isRateLimit(error)) return fail(AUTH_TEXT.rateLimit);
    switch (error.code) {
      // Same answer as a new account, so registered emails aren't revealed.
      case "user_already_exists":
      case "email_exists":
        return { status: "check-email", email };
      case "email_address_invalid":
        return fail(AUTH_TEXT.email, "email");
      case "weak_password":
        return fail(AUTH_TEXT.password, "password");
    }
    // Race: someone took the alias after the check and the trigger aborted the signup.
    const { data: stillAvailable } = await isAvailable();
    if (stillAvailable === false) return fail(AUTH_TEXT.aliasTaken, "alias");
    return unexpected("No se pudo crear la cuenta", error);
  }

  return { status: "check-email", email };
}

export async function signInWithOAuth(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const provider = text(formData, "provider");
  const next = safeNext(text(formData, "next"));

  if (provider !== "google" && provider !== "github") {
    return fail(AUTH_TEXT.other);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: await callbackUrl("oauth", next) },
  });
  if (error) return unexpected("No se pudo abrir el proveedor", error);

  redirect(data.url);
}

export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email").trim();
  const next = safeNext(text(formData, "next"));

  if (!isValidEmail(email)) return fail(AUTH_TEXT.email, "email");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await callbackUrl("email", next) },
  });

  if (error) {
    if (isRateLimit(error)) return fail(AUTH_TEXT.rateLimit);
    return unexpected("No se pudo reenviar el correo", error);
  }

  return { status: "check-email", email };
}

export async function chooseAlias(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const alias = normalizeAlias(text(formData, "alias"));
  const next = safeNext(text(formData, "next"));

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError) return unexpected("No se pudo leer la sesión", authError);
  if (!auth) redirect(`/auth?${new URLSearchParams({ next })}`);

  const id = auth.claims.sub;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (profileError)
    return unexpected("No se pudo leer el perfil", profileError);

  if (!profile) {
    if (!isValidAlias(alias)) return fail(AUTH_TEXT.aliasInvalid, "alias");
    if (isReservedAlias(alias)) return fail(AUTH_TEXT.aliasTaken, "alias");

    const { error } = await supabase
      .from("profiles")
      .insert({ id, name: alias });

    if (error?.code === CHECK_VIOLATION) {
      return fail(AUTH_TEXT.aliasInvalid, "alias");
    }
    if (error?.code === UNIQUE_VIOLATION) {
      // profiles_pkey: another tab already chose the alias, so there is nothing left to do.
      if (!error.message.includes("profiles_pkey")) {
        return fail(AUTH_TEXT.aliasTaken, "alias");
      }
    } else if (error) {
      return unexpected("No se pudo guardar el alias", error);
    }
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Error al cerrar sesión", error);

  revalidatePath("/", "layout");
  redirect("/");
}
