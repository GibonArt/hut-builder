import { notFound, redirect } from "next/navigation";
import { DoporuceneFormace } from "@/components/DoporuceneFormace";
import { createAuthClient } from "@/lib/supabase/server";
import { parseSezona } from "@/lib/sezona";

export default async function DoporuceneFormacePage({
  params,
}: {
  params: Promise<{ sezona: string }>;
}) {
  const { sezona: raw } = await params;
  if (!parseSezona(raw)) notFound();

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DoporuceneFormace />;
}
