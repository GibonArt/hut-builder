import { redirect } from "next/navigation";
import { AdminPrehledUzivatelu } from "@/components/AdminPrehledUzivatelu";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import type { AdminUzivatelRadek } from "@/lib/adminPrehledUzivatelu";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUzivatelePage() {
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

  const { data, error } = await supabase.rpc("admin_prehled_uzivatelu_karet");

  let radky: AdminUzivatelRadek[] = [];
  let chyba: string | null = null;

  if (error) {
    chyba = error.message;
  } else if (data && Array.isArray(data)) {
    radky = (data as AdminUzivatelRadek[]).map((row) => ({
      user_id: String(row.user_id),
      email: String(row.email ?? ""),
      registered_at: String(row.registered_at),
      pocet_karet: Number(row.pocet_karet ?? 0),
    }));
  }

  return <AdminPrehledUzivatelu radky={radky} chyba={chyba} />;
}
