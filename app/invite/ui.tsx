"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function InviteForm() {
  const supabase = supabaseBrowser();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle"|"saving"|"ok"|"error">("idle");
  const [error, setError] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving"); setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("error"); setError("Not signed in."); return; }

    const { data, error } = await supabase.rpc("accept_invite", { invite_code: code.trim() });
    if (error) { setStatus("error"); setError(error.message); return; }

    setStatus("ok");
    window.location.href = "/";
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-medium">Invite code</label>
      <input
        value={code}
        onChange={(e)=>setCode(e.target.value)}
        required
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                   focus:outline-none focus:ring-2 focus:ring-neutral-900/20
                   dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:ring-neutral-50/20"
        placeholder="ABC123"
      />
      <button
        type="submit"
        disabled={status==="saving"}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60
                   dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {status==="saving" ? "Applying..." : "Join"}
      </button>
      {status==="ok" ? <p className="text-sm text-green-600 dark:text-green-400">Joined! Redirecting…</p> : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </form>
  );
}
