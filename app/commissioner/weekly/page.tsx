import WeeklyUpdate from "./ui";
export default function WeeklyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Weekly Update</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Upload screenshots (Top 25, schedules, results/stats). We extract structured data, you review, then Save & Publish deletes the screenshots.
      </p>
      <WeeklyUpdate />
    </div>
  );
}
