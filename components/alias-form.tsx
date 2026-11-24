"use client";

import { useActionState, useState } from "react";

import { chooseAlias, signOut } from "@/app/auth/actions";
import {
  AliasField,
  CONNECTING,
  FormErrorLine,
  IDLE,
  useFormError,
  validateAlias,
} from "@/components/auth-fields";
import { normalizeAlias } from "@/lib/auth/validation";

export function AliasForm({ next }: { next: string }) {
  const [alias, setAlias] = useState("");
  const [state, action, pending] = useActionState(chooseAlias, IDLE);
  const [, signOutAction, signingOut] = useActionState(signOut, undefined);
  const { error, setLocal } = useFormError(state);
  const busy = pending || signingOut;

  const validate = (e: React.FormEvent<HTMLFormElement>) => {
    const invalid = validateAlias(normalizeAlias(alias));
    setLocal(invalid);
    if (invalid) e.preventDefault();
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ELIGE TU ALIAS</h2>
        </div>

        <p className="auth-intro">
          Así te verán los demás jugadores. No podrás cambiarlo después.
        </p>

        <form action={action} onSubmit={validate} noValidate>
          <input type="hidden" name="next" value={next} />
          <AliasField value={alias} onChange={setAlias} error={error} />
          <FormErrorLine error={error} />
          <button className="btn lg auth-wide" type="submit" disabled={busy}>
            {pending ? CONNECTING : "GUARDAR ALIAS"}
          </button>
        </form>

        <form action={signOutAction}>
          <button
            className="btn ghost auth-wide auth-guest"
            type="submit"
            disabled={busy}
          >
            {signingOut ? CONNECTING : "CERRAR SESIÓN"}
          </button>
        </form>
      </div>
    </div>
  );
}
