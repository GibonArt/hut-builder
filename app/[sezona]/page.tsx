import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createAuthClient } from "@/lib/supabase/server";
import { parseSezona } from "@/lib/sezona";

export default async function SezonaHomePage({
  params,
}: {
  params: Promise<{ sezona: string }>;
}) {
  const { sezona: raw } = await params;
  const sezona = parseSezona(raw);
  if (!sezona) notFound();

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--hut-bg)] text-sm text-[var(--hut-muted)]">
          Načítám…
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
