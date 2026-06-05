import { redirect } from "next/navigation";
import { OdehraneZapasy } from "@/components/OdehraneZapasy";
import { createClient } from "@/lib/supabase/server";

export default async function ZapasyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <OdehraneZapasy />;
}
