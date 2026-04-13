import { redirect } from "next/navigation";
import { NastaveniUctu } from "@/components/NastaveniUctu";
import { createClient } from "@/lib/supabase/server";

export default async function NastaveniUctuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <NastaveniUctu />;
}
