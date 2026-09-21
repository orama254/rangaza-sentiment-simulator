"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brief } from "@/lib/brief/schema";
import type { RangazaMode } from "@/lib/engine/mode-name";
import type { CountyRecord } from "@/lib/population/schema";
import type { CountyPulse } from "@/lib/scoring/pulse";
import type { Stance } from "@/lib/engine/schema";
import { CountyPulsePanel } from "@/components/panels/CountyPulsePanel";
import { HotspotList } from "@/components/panels/HotspotList";
import { ScenarioBar } from "@/components/panels/ScenarioBar";
import type { SceneReaction, SceneResident } from "@/components/scene/KenyaMap";

const KenyaMap = dynamic(
  () => import("@/components/scene/KenyaMap").then((mod) => mod.KenyaMap),
  { ssr: false },
);

type SimulateEvent = {
  type: string;
  pulse?: CountyPulse;
  reactions?: {
    residentId: string;
    county: CountyRecord["id"];
    stance: { choice: Stance };
    confidence: number;
  }[];
  pulses?: CountyPulse[];
  message?: string;
};

async function readSimulate(briefId: string, onEvent: (event: SimulateEvent) => void) {
  const response = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ briefId }),
  });
  if (!response.body) {
    throw new Error("simulate stream missing body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((row) => row.startsWith("data: "));
      if (!line) {
        continue;
      }
      onEvent(JSON.parse(line.slice(6)) as SimulateEvent);
    }
  }
}

export function SimView({
  title,
  briefA,
  briefB,
  counties,
  residents,
  mode,
}: {
  title: string;
  briefA: Brief;
  briefB: Brief;
  counties: CountyRecord[];
  residents: SceneResident[];
  mode: RangazaMode;
}) {
  const [variant, setVariant] = useState<"a" | "b">("a");
  const brief = variant === "a" ? briefA : briefB;
  const [pulses, setPulses] = useState<CountyPulse[]>([]);
  const [reactions, setReactions] = useState<Map<string, SceneReaction>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [announcing, setAnnouncing] = useState(false);
  const [rippleRadius, setRippleRadius] = useState(0);
  const [announceProgress, setAnnounceProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const skipRef = useRef(false);

  const pulseMap = useMemo(() => {
    const map = new Map<string, CountyPulse>();
    for (const pulse of pulses) {
      map.set(pulse.countyId, pulse);
    }
    return map;
  }, [pulses]);

  const load = useCallback(
    async (briefId: string) => {
      const nextPulses: CountyPulse[] = [];
      const nextReactions = new Map<string, SceneReaction>();
      await readSimulate(briefId, (event) => {
        if (event.type === "error") {
          setError(event.message ?? "The simulation stream failed.");
        }
        if (event.type === "batch" && event.reactions) {
          for (const reaction of event.reactions) {
            nextReactions.set(reaction.residentId, {
              residentId: reaction.residentId,
              county: reaction.county,
              stance: reaction.stance.choice,
              confidence: reaction.confidence,
            });
          }
          setReactions(new Map(nextReactions));
        }
        if (event.type === "county" && event.pulse) {
          nextPulses.push(event.pulse);
          setPulses([...nextPulses]);
        }
        if (event.type === "complete" && event.pulses) {
          setPulses(event.pulses);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const briefId = variant === "a" ? briefA.id : briefB.id;
    setPulses([]);
    setReactions(new Map());
    setAnnounceProgress(0);
    setRippleRadius(0);
    setError(null);
    load(briefId).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }, [briefA.id, briefB.id, load, variant]);

  const skip = useCallback(() => {
    skipRef.current = true;
    setRippleRadius(120);
    setAnnounceProgress(1);
    setAnnouncing(false);
  }, []);

  const announce = useCallback(() => {
    skipRef.current = false;
    setAnnouncing(true);
    setRippleRadius(0);
    setAnnounceProgress(0);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      skip();
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      if (skipRef.current) {
        return;
      }
      const t = Math.min(1, (now - started) / 4200);
      setRippleRadius(t * 90);
      setAnnounceProgress(t);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnnouncing(false);
      }
    };
    requestAnimationFrame(tick);
  }, [skip]);

  const selectedPulse = selected ? (pulseMap.get(selected) ?? null) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <ScenarioBar
          title={title}
          variant={variant}
          onVariant={setVariant}
          announcing={announcing}
          onAnnounce={announce}
          onSkip={skip}
          mode={mode}
        />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(28rem,1fr)]">
          <div className="h-[70vh] min-h-[28rem] overflow-hidden rounded-lg border border-zinc-800 bg-slate-950 lg:h-full lg:min-h-0">
            <KenyaMap
              counties={counties}
              residents={residents}
              pulses={pulseMap}
              reactions={reactions}
              selected={selected}
              onSelect={setSelected}
              rippleRadius={rippleRadius}
              announceProgress={announceProgress}
            />
          </div>
          <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto lg:max-h-full">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-amber-700 bg-amber-950/20 p-3 text-sm text-amber-200"
              >
                {error}
              </p>
            ) : null}
            <HotspotList pulses={pulses} selected={selected} onSelect={setSelected} />
            {pulses.length > 0 ? (
              <label className="text-sm">
                County
                <select
                  className="mt-1 w-full rounded border border-zinc-400 bg-white px-2 py-1 capitalize dark:border-zinc-600 dark:bg-zinc-900"
                  value={selected ?? ""}
                  onChange={(event) => {
                    if (event.target.value) {
                      setSelected(event.target.value);
                    }
                  }}
                >
                  <option value="">Click a County on the map</option>
                  {[...pulses]
                    .sort((a, b) => a.countyId.localeCompare(b.countyId))
                    .map((pulse) => (
                      <option key={pulse.countyId} value={pulse.countyId}>
                        {pulse.countyId.replace("-", " ")}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            {selectedPulse ? (
              <CountyPulsePanel pulse={selectedPulse} brief={brief} />
            ) : (
              <p className="text-sm text-zinc-600">Click a County on the map.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
