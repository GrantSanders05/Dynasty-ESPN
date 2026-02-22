"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Invite = {
  code: string;
  role: "commissioner" | "member";
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  created_at: string;
};

export default function InviteManager({ initialInvites }: { initialInvites: Invite[] }) {
  const supabase = supabaseBrowser();
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [role, setRole] = useState<Invite["role"]>("member");
  const [maxUses, setMaxUses] = useState<string>("1");
  const [status, setStatus] = useState<string>("");

  async function createInvite() {
    setStatus("Creating...");
    const mu = maxUses.trim()==="" ? null : Number(maxUses);
    const { data, error } = await supabase.rpc("create_invite", { invite_role: role, invite_max_uses: mu });
    if (error) { setStatus(error.message); return; }
    // refresh list
    const { data: refreshed } = await supabase.from("invites").select("*").order("created_at", { ascending: false }).limit(50);
    setInvites(refreshed as any);
    setStatus("Created!");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-3">
        <div className="flex gap-2">
          <select value={role} onChange={(e)=>setRole(e.target.value as any)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="member">Member (view-only)</option>
            <option value="commissioner">Commissioner</option>
          </select>
          <input value={maxUses} onChange={(e)=>setMaxUses(e.target.value)} className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" placeholder="Max uses (blank = unlimited)"/>
          <button onClick={createInvite} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-900">
            Create
          </button>
        </div>
        {status ? <div className="text-sm opacity-70">{status}</div> : null}
      </div>

      <div className="space-y-2">
        {invites.map((i) => (
          <div key={i.code} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{i.code}</div>
              <div className="text-sm opacity-70">{i.role}</div>
            </div>
            <div className="text-sm opacity-70 mt-1">Uses: {i.uses}{i.max_uses ? ` / ${i.max_uses}` : " (unlimited)"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
