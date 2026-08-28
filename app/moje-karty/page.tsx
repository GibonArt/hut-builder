import { redirect } from "next/navigation";
import { MojeKartySeznam } from "@/components/MojeKartySeznam";
import { createClient } from "@/lib/supabase/server";

export default async function MojeKartyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <MojeKartySeznam />;
}
