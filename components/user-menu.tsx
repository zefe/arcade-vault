"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { signOut } from "@/app/auth/actions";
import { CONNECTING } from "@/components/auth-fields";

export function SignOutForm({
  className,
  onSubmit,
}: {
  className?: string;
  onSubmit?: () => void;
}) {
  const [, action, pending] = useActionState(signOut, undefined);

  return (
    <form action={action} onSubmit={onSubmit}>
      <button className={className} type="submit" disabled={pending}>
        {pending ? CONNECTING : "CERRAR SESIÓN"}
      </button>
    </form>
  );
}

// Nav mounts it with key={pathname}, so navigating closes it.
export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    // Capture: a game canvas can't swallow the event first.
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="btn ghost auth-btn"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        {name} ▾
      </button>
      <div className="user-menu-panel" id={menuId} hidden={!open}>
        <SignOutForm className="user-menu-item" />
      </div>
    </div>
  );
}
