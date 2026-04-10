import { redirect } from "next/navigation";
import { NastaveniBonusu } from "@/components/NastaveniBonusu";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/server";

export default async function NastaveniBonusuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!jeBonusAdmin(user.email)) {
    redirect("/");
  }

  return <NastaveniBonusu />;
}
