import { redirect } from "next/navigation";

import { AliasForm } from "@/components/alias-form";
import { getSession } from "@/lib/auth/player";
import { safeNext } from "@/lib/auth/validation";

export default async function AliasPage({
  searchParams,
}: PageProps<"/auth/alias">) {
  const params = await searchParams;
  const next = safeNext(
    Array.isArray(params.next) ? params.next[0] : params.next,
  );

  const session = await getSession();
  if (session.status === "guest") {
    redirect(`/auth?${new URLSearchParams({ next })}`);
  }
  if (session.status === "player") redirect(next);

  return <AliasForm next={next} />;
}
