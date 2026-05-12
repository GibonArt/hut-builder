import { redirect } from "next/navigation";
import { ElhRozvrhNastroj } from "@/components/ElhRozvrhNastroj";
import { createClient } from "@/lib/supabase/server";

export default async function ElhRozvrhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ElhRozvrhNastroj />;
}
