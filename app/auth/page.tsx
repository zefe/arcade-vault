import { redirect } from "next/navigation";

import { AuthForm, type AuthNotice } from "@/components/auth-form";
import { getSession } from "@/lib/auth/player";
import { safeNext } from "@/lib/auth/validation";

// Closed list: text from the URL is never painted.
const NOTICES = new Map<string, AuthNotice>([
  [
    "correo",
    { tone: "info", text: "SI YA CONFIRMASTE TU CORREO, INICIA SESIÓN" },
  ],
  ["oauth", { tone: "error", text: "NO SE PUDO COMPLETAR EL ACCESO" }],
  ["enlace", { tone: "error", text: "ENLACE CADUCADO O NO VÁLIDO" }],
]);

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const params = await searchParams;
  const next = safeNext(first(params.next));

  const session = await getSession();
  if (session.status === "player") redirect(next);
  if (session.status === "needs-alias") {
    redirect(`/auth/alias?${new URLSearchParams({ next })}`);
  }

  const tab = first(params.modo) === "registro" ? "up" : "in";

  return (
    // key: an internal link to another mode opens its tab.
    <AuthForm
      key={tab}
      initialTab={tab}
      next={next}
      notice={NOTICES.get(first(params.aviso)) ?? null}
    />
  );
}
