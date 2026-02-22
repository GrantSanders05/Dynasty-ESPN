import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dynasty Hub",
  description: "ESPN-style dynasty hub",
  manifest: "/manifest.webmanifest",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" href={href}>
      {label}
    </Link>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = profile?.role ?? null;
  }

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">Dynasty Hub</Link>
            {user ? (
              <nav className="flex items-center gap-1 text-sm">
                <NavLink href="/" label="Home" />
                <NavLink href="/schedule" label="Schedule" />
                <NavLink href="/rankings" label="Rankings" />
                <NavLink href="/media" label="Media" />
                <NavLink href="/podcast" label="Podcast" />
                {role === "commissioner" ? <NavLink href="/commissioner" label="Commissioner" /> : null}
              </nav>
            ) : null}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
