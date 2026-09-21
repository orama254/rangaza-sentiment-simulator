import type { Brief } from "@/lib/brief/schema";
import type { CountyPulse } from "@/lib/scoring/pulse";

const STANCE_LABEL: Record<string, string> = {
  supportive: "Supportive",
  opposed: "Opposed",
  confused: "Confused",
  indifferent: "Indifferent",
  anxious: "Anxious",
};

export function CountyPulsePanel({
  pulse,
  brief,
}: {
  pulse: CountyPulse;
  brief: Brief;
}) {
  const provisionTitle = (id: string) =>
    brief.provisions.find((provision) => provision.id === id)?.title ?? id;

  return (
    <aside className="flex max-h-full w-full flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-300 bg-white/95 p-4 text-sm text-zinc-900 shadow dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-50">
      <header>
        <h2 className="text-lg font-semibold capitalize">{pulse.countyId.replace("-", " ")}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {pulse.n} Residents. Friction {pulse.friction.toFixed(2)}
          {pulse.hotspot ? " · Hotspot" : ""}
        </p>
      </header>
      <section>
        <h3 className="font-medium">Stance</h3>
        <ul className="mt-1 space-y-1">
          {Object.entries(pulse.stance).map(([stance, share]) => (
            <li key={stance} className="flex justify-between gap-2">
              <span>{STANCE_LABEL[stance] ?? stance}</span>
              <span>{Math.round(share * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-medium">Driving Provision</h3>
        <ul className="mt-1 space-y-1">
          {pulse.drivingProvisions.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span>{provisionTitle(item.id)}</span>
              <span>{Math.round(item.share * 100)}%</span>
            </li>
          ))}
        </ul>
        {pulse.livelihoods.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs">
            {pulse.livelihoods.slice(0, 4).map((row) => (
              <li key={row.livelihood} className="flex justify-between gap-2">
                <span className="capitalize">
                  {row.livelihood.replaceAll("_", " ")}
                  {row.hotspot ? " · Hotspot" : ""}
                </span>
                <span>
                  {provisionTitle(row.drivingProvisions[0]?.id ?? "")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          Every Stance is shown with the Provision that most drives it.
        </p>
      </section>
      <section>
        <h3 className="font-medium">Top Concern</h3>
        <ul className="mt-1 space-y-1">
          {pulse.topConcerns.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="capitalize">{item.id.replaceAll("_", " ")}</span>
              <span>{Math.round(item.share * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-medium">Trusted Channel</h3>
        <ul className="mt-1 space-y-1">
          {pulse.trustedChannels.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="capitalize">{item.id.replaceAll("_", " ")}</span>
              <span>{Math.round(item.share * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-zinc-500">
        Mean Clarity {pulse.meanClarity.toFixed(2)} · mean confidence{" "}
        {pulse.meanConfidence.toFixed(2)} · Simulated {pulse.provenance.simulated}
      </p>
    </aside>
  );
}
