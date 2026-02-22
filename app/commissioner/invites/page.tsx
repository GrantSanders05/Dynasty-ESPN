import { supabaseServer } from "@/lib/supabase/server";
import InviteManager from "./ui";

export default async function InvitesPage() {
  const supabase = supabaseServer();
  const { data: invites } = await supabase.from("invites").select("*").order("created_at", { ascending: false }).limit(50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Invites</h1>
      <InviteManager initialInvites={invites ?? []} />
    </div>
  );
}
