import { redirect } from "next/navigation";
import LoginForm from "./ui";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  // If already authed, middleware will route away; keep simple
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Magic-link email login. No passwords.
      </p>
      <LoginForm nextPath={searchParams?.next ?? "/"} />
    </div>
  );
}
