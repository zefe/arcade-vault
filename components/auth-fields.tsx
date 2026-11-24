"use client";

import { useEffect, useState } from "react";

import type { AuthField, AuthState } from "@/app/auth/actions";
import {
  AUTH_TEXT,
  isReservedAlias,
  isValidAlias,
} from "@/lib/auth/validation";

// Shared by the /auth and /auth/alias forms.

export type FormError = { message: string; field?: AuthField };

export const IDLE: AuthState = { status: "idle" };
export const CONNECTING = "CONECTANDO…";
const ERROR_ID = "auth-error";

// Client errors (before submitting) win over the last server answer.
export function useFormError(state: AuthState) {
  const [local, setLocal] = useState<FormError | null>(null);
  const error = local ?? (state.status === "error" ? state : null);

  useEffect(() => {
    if (error?.field) document.getElementById(`auth-${error.field}`)?.focus();
  }, [error]);

  return { error, setLocal };
}

export function FormErrorLine({ error }: { error: FormError | null }) {
  if (!error) return null;
  return (
    <p className="auth-msg error" id={ERROR_ID} role="alert">
      {error.message}
    </p>
  );
}

type FieldProps = {
  field: AuthField;
  label: string;
  error: FormError | null;
  hint?: string;
} & Omit<React.ComponentProps<"input">, "id" | "name">;

export function Field({ field, label, error, hint, ...input }: FieldProps) {
  const id = `auth-${field}`;
  const invalid = error?.field === field;
  const describedBy = [hint && `${id}-hint`, invalid && ERROR_ID]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={field}
        required
        aria-invalid={invalid}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function AliasField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (alias: string) => void;
  error: FormError | null;
}) {
  return (
    <Field
      field="alias"
      label="Alias"
      hint="3–10 caracteres: A-Z, 0-9 y _. Es único."
      error={error}
      type="text"
      className="alias"
      autoComplete="nickname"
      autoCapitalize="characters"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="PX_KAI"
    />
  );
}

// Expects an already normalized alias.
export function validateAlias(alias: string): FormError | null {
  if (!isValidAlias(alias)) {
    return { message: AUTH_TEXT.aliasInvalid, field: "alias" };
  }
  if (isReservedAlias(alias)) {
    return { message: AUTH_TEXT.aliasTaken, field: "alias" };
  }
  return null;
}
