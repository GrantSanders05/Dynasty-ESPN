import InviteForm from "./ui";

export default function InvitePage() {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Join the league</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Enter an invite code from the commissioner to finish setup.
      </p>
      <InviteForm />
    </div>
  );
}
