import { notFound, redirect } from "next/navigation";
import { NastaveniBonusu } from "@/components/NastaveniBonusu";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createAuthClient } from "@/lib/supabase/server";
import { parseSezona } from "@/lib/sezona";

export default async function NastaveniBonusuPage({
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

  if (!jeBonusAdmin(user.email)) {
    redirect(`/${sezona}`);
  }

  return <NastaveniBonusu />;
}
