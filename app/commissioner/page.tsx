import Link from "next/link";

export default function CommissionerHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Commissioner Tools</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/commissioner/weekly" className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
          <div className="font-semibold">Weekly Update</div>
          <div className="text-sm opacity-70">Upload Top 25, schedules, results, stats. Preview → Publish → delete screenshots.</div>
        </Link>
        <Link href="/commissioner/invites" className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
          <div className="font-semibold">Invites</div>
          <div className="text-sm opacity-70">Create commissioner/member codes.</div>
        </Link>
      </div>
    </div>
  );
}
