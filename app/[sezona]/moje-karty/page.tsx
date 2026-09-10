import { redirect } from "next/navigation";
import { MojeKartySeznam } from "@/components/MojeKartySeznam";
import { createAuthClient } from "@/lib/supabase/server";
import { parseSezona } from "@/lib/sezona";
import { notFound } from "next/navigation";

export default async function MojeKartyPage({
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

  return <MojeKartySeznam />;
}
