import type { RangazaMode } from "@/lib/engine/mode-name";
import { ModeBadge } from "./ModeBadge";

export function ScenarioBar({
  title,
  variant,
  onVariant,
  announcing,
  onAnnounce,
  onSkip,
  mode,
}: {
  title: string;
  variant: "a" | "b";
  onVariant: (variant: "a" | "b") => void;
  announcing: boolean;
  onAnnounce: () => void;
  onSkip: () => void;
  mode: RangazaMode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-300 bg-white/90 px-3 py-2 text-sm shadow dark:border-zinc-700 dark:bg-zinc-900/90">
      <p className="font-medium">{title}</p>
      <ModeBadge mode={mode} />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <span className="text-zinc-600 dark:text-zinc-400">Scenario</span>
        <button
          type="button"
          className={`rounded px-2 py-1 ${variant === "a" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-400"}`}
          onClick={() => onVariant("a")}
        >
          A as published
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 ${variant === "b" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-400"}`}
          onClick={() => onVariant("b")}
        >
          B without bread VAT and motor vehicle tax
        </button>
        <button
          type="button"
          className="rounded bg-emerald-700 px-3 py-1 text-white disabled:opacity-50"
          onClick={onAnnounce}
          disabled={announcing}
        >
          Announce
        </button>
        <button type="button" className="rounded border border-zinc-400 px-2 py-1" onClick={onSkip}>
          Skip animation
        </button>
      </div>
    </div>
  );
}
