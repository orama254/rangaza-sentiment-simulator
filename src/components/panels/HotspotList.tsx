import type { CountyPulse } from "@/lib/scoring/pulse";

export function HotspotList({
  pulses,
  selected,
  onSelect,
}: {
  pulses: CountyPulse[];
  selected: string | null;
  onSelect: (countyId: string) => void;
}) {
  const hotspots = pulses.filter((pulse) => pulse.hotspot);
  return (
    <section className="rounded-lg border border-zinc-300 bg-white/90 p-3 text-sm shadow dark:border-zinc-700 dark:bg-zinc-900/90">
      <h2 className="font-medium">Hotspots</h2>
      {hotspots.length === 0 ? (
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">None yet.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {hotspots.map((pulse) => (
            <li key={pulse.countyId}>
              <button
                type="button"
                className={`w-full rounded px-2 py-1 text-left capitalize ${selected === pulse.countyId ? "bg-zinc-200 dark:bg-zinc-700" : ""}`}
                onClick={() => onSelect(pulse.countyId)}
              >
                {pulse.countyId.replace("-", " ")} · Friction {pulse.friction.toFixed(2)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
