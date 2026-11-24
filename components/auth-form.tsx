"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import {
  resendConfirmation,
  signIn,
  signInWithOAuth,
  signUp,
  type AuthState,
} from "@/app/auth/actions";
import {
  AliasField,
  CONNECTING,
  Field,
  FormErrorLine,
  IDLE,
  useFormError,
  validateAlias,
  type FormError,
} from "@/components/auth-fields";
import {
  AUTH_TEXT,
  PASSWORD_MIN,
  RESEND_WAIT_S,
  isValidEmail,
  normalizeAlias,
} from "@/lib/auth/validation";

export type AuthNotice = { tone: "info" | "error"; text: string };

type Tab = "in" | "up";

function ResendForm({
  email,
  next,
  initialWait,
  onSent,
}: {
  email: string;
  next: string;
  initialWait: number;
  onSent: (email: string) => void;
}) {
  const [wait, setWait] = useState(initialWait);
  const [state, action, pending] = useActionState(
    async (prev: AuthState, formData: FormData) => {
      const result = await resendConfirmation(prev, formData);
      setWait(RESEND_WAIT_S);
      if (result.status === "check-email") onSent(result.email);
      return result;
    },
    IDLE,
  );

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && (
        <p className="auth-msg error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "check-email" && (
        <p className="auth-msg info" role="status">
          CORREO REENVIADO
        </p>
      )}
      <button
        className="btn ghost auth-wide"
        type="submit"
        disabled={pending || wait > 0}
      >
        {pending
          ? CONNECTING
          : wait > 0
            ? `REENVIAR EN ${wait} S`
            : "REENVIAR CORREO"}
      </button>
    </form>
  );
}

function SignInForm({
  email,
  setEmail,
  next,
  onSent,
}: {
  email: string;
  setEmail: (email: string) => void;
  next: string;
  onSent: (email: string) => void;
}) {
  const [state, action, pending] = useActionState(signIn, IDLE);
  const { error, setLocal } = useFormError(state);

  const validate = (e: React.FormEvent<HTMLFormElement>) => {
    const valid = isValidEmail(email.trim());
    setLocal(valid ? null : { message: AUTH_TEXT.email, field: "email" });
    if (!valid) e.preventDefault();
  };

  return (
    <>
      <form action={action} onSubmit={validate} noValidate>
        <input type="hidden" name="next" value={next} />
        <Field
          field="email"
          label="Correo electrónico"
          error={error}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jugador@vault.gg"
        />
        <Field
          field="password"
          label="Contraseña"
          error={error}
          type="password"
          autoComplete="current-password"
        />
        <FormErrorLine error={error} />
        <button className="btn lg auth-wide" type="submit" disabled={pending}>
          {pending ? CONNECTING : "ENTRAR AL VAULT"}
        </button>
      </form>

      {state.status === "unconfirmed" && !error && !pending && (
        <div className="auth-unconfirmed">
          <p className="auth-msg error" role="alert">
            {AUTH_TEXT.unconfirmed}
          </p>
          <ResendForm
            email={state.email}
            next={next}
            initialWait={0}
            onSent={onSent}
          />
        </div>
      )}
    </>
  );
}

function validateSignUp(
  alias: string,
  email: string,
  password: string,
): FormError | null {
  const invalidAlias = validateAlias(alias);
  if (invalidAlias) return invalidAlias;
  if (!isValidEmail(email)) return { message: AUTH_TEXT.email, field: "email" };
  if (password.length < PASSWORD_MIN) {
    return { message: AUTH_TEXT.password, field: "password" };
  }
  return null;
}

function SignUpForm({
  alias,
  setAlias,
  email,
  setEmail,
  next,
  onSent,
}: {
  alias: string;
  setAlias: (alias: string) => void;
  email: string;
  setEmail: (email: string) => void;
  next: string;
  onSent: (email: string) => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: AuthState, formData: FormData) => {
      const result = await signUp(prev, formData);
      if (result.status === "check-email") onSent(result.email);
      return result;
    },
    IDLE,
  );
  const { error, setLocal } = useFormError(state);

  const validate = (e: React.FormEvent<HTMLFormElement>) => {
    const password = new FormData(e.currentTarget).get("password");
    const invalid = validateSignUp(
      normalizeAlias(alias),
      email.trim(),
      typeof password === "string" ? password : "",
    );
    setLocal(invalid);
    if (invalid) e.preventDefault();
  };

  return (
    <form action={action} onSubmit={validate} noValidate>
      <input type="hidden" name="next" value={next} />
      <AliasField value={alias} onChange={setAlias} error={error} />
      <Field
        field="email"
        label="Correo electrónico"
        error={error}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jugador@vault.gg"
      />
      <Field
        field="password"
        label="Contraseña"
        hint={`Mínimo ${PASSWORD_MIN} caracteres.`}
        error={error}
        type="password"
        autoComplete="new-password"
      />
      <FormErrorLine error={error} />
      <button className="btn lg auth-wide" type="submit" disabled={pending}>
        {pending ? CONNECTING : "CREAR CUENTA"}
      </button>
    </form>
  );
}

const PROVIDERS = [
  { id: "google", label: "◆ GOOGLE" },
  { id: "github", label: "▣ GITHUB" },
] as const;

function OAuthButtons({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInWithOAuth, IDLE);
  const [provider, setProvider] = useState<string | null>(null);

  // Back from the provider with bfcache: the page would come back frozen in CONECTANDO…
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <>
      <div className="social">
        {PROVIDERS.map(({ id, label }) => (
          <form key={id} action={action} onSubmit={() => setProvider(id)}>
            <input type="hidden" name="provider" value={id} />
            <input type="hidden" name="next" value={next} />
            <button
              className="btn ghost auth-wide"
              type="submit"
              disabled={pending}
            >
              {pending && provider === id ? CONNECTING : label}
            </button>
          </form>
        ))}
      </div>
      {state.status === "error" && (
        <p className="auth-msg error" role="alert">
          {state.message}
        </p>
      )}
    </>
  );
}

// The form that had the focus is gone. Stable ref: runs only on mount.
function focusOnMount(el: HTMLElement | null) {
  el?.focus();
}

function CheckEmail({
  email,
  next,
  onSent,
  onBack,
}: {
  email: string;
  next: string;
  onSent: (email: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="auth-check">
      <h3 className="neon-yellow" tabIndex={-1} ref={focusOnMount}>
        REVISA TU CORREO
      </h3>
      <p>
        Busca el enlace de confirmación en <strong>{email}</strong> y ábrelo en
        este navegador para entrar directamente.
      </p>
      <p>Si ya tenías cuenta, inicia sesión.</p>
      <ResendForm
        email={email}
        next={next}
        initialWait={RESEND_WAIT_S}
        onSent={onSent}
      />
      <button type="button" className="btn auth-wide" onClick={onBack}>
        INICIAR SESIÓN
      </button>
    </div>
  );
}

export function AuthForm({
  initialTab,
  next,
  notice,
}: {
  initialTab: Tab;
  next: string;
  notice: AuthNotice | null;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const tabs = [
    { id: "in", label: "INICIAR SESIÓN" },
    { id: "up", label: "CREAR CUENTA" },
  ] as const;

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="sub">ACCESO AL SISTEMA · v2.6</div>
        </div>

        {sentTo ? (
          <CheckEmail
            email={sentTo}
            next={next}
            onSent={setSentTo}
            onBack={() => {
              setSentTo(null);
              setTab("in");
            }}
          />
        ) : (
          <>
            <div className="auth-tabs">
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? "on" : ""}
                  aria-pressed={tab === id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {notice && (
              <p
                className={`auth-msg ${notice.tone}`}
                role={notice.tone === "error" ? "alert" : "status"}
              >
                {notice.text}
              </p>
            )}

            {tab === "in" ? (
              <SignInForm
                email={email}
                setEmail={setEmail}
                next={next}
                onSent={setSentTo}
              />
            ) : (
              <SignUpForm
                alias={alias}
                setAlias={setAlias}
                email={email}
                setEmail={setEmail}
                next={next}
                onSent={setSentTo}
              />
            )}

            <div className="auth-divider">O CONTINÚA CON</div>
            <OAuthButtons next={next} />

            <Link className="btn ghost auth-wide auth-guest" href={next}>
              JUGAR COMO INVITADO
            </Link>

            <p className="auth-terms">
              AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
            </p>
          </>
        )}
      </div>
    </div>
  );
}
