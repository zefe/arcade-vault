"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SignOutForm, UserMenu } from "@/components/user-menu";
import { safeNext } from "@/lib/auth/validation";
import { useUser } from "@/lib/user-context";

type Section = "inicio" | "biblioteca" | "salon" | "acerca" | "auth" | null;

function sectionFor(pathname: string): Section {
  if (pathname === "/") return "inicio";
  if (pathname === "/juegos" || pathname.startsWith("/juegos/"))
    return "biblioteca";
  if (pathname === "/salon") return "salon";
  if (pathname === "/acerca") return "acerca";
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return "auth";
  return null;
}

export function Nav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, needsAlias } = useUser();
  const [open, setOpen] = useState(false);
  const section = sectionFor(pathname);
  const cls = (s: Section) => (section === s ? "active" : "");
  const close = () => setOpen(false);

  // On /auth the destination is the one it already had, not /auth itself.
  const next =
    section === "auth" ? safeNext(searchParams.get("next")) : pathname;
  const access = {
    href: `${needsAlias ? "/auth/alias" : "/auth"}?${new URLSearchParams({ next })}`,
    label: needsAlias ? "ELEGIR ALIAS" : "Iniciar Sesión",
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("inicio")}>
            Inicio
          </Link>
          <Link href="/juegos" className={cls("biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("salon")}>
            Salón de la Fama
          </Link>
          <Link href="/acerca" className={cls("acerca")}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <UserMenu key={pathname} name={user.name} />
        ) : (
          <Link href={access.href} className="btn auth-btn">
            {access.label}
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside
        className={"av-mobile-panel" + (open ? " open" : "")}
        inert={!open}
      >
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={cls("inicio")} onClick={close}>
          Inicio
        </Link>
        <Link href="/juegos" className={cls("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/acerca" className={cls("acerca")} onClick={close}>
          Acerca de
        </Link>
        {user ? (
          <>
            <div className="mobile-user neon-cyan">{user.name}</div>
            <SignOutForm className="mobile-signout" onSubmit={close} />
          </>
        ) : (
          <Link href={access.href} className={cls("auth")} onClick={close}>
            {access.label}
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
