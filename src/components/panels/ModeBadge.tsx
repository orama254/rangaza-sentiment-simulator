import type { RangazaMode } from "@/lib/engine/mode-name";

export function ModeBadge({ mode }: { mode: RangazaMode }) {
  return (
    <span
      aria-label={`Mode ${mode}`}
      className="inline-flex items-center rounded-full border border-zinc-400 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:border-zinc-500 dark:text-zinc-200"
    >
      {mode}
    </span>
  );
}
