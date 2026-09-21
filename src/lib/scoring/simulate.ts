import type { Brief } from "@/lib/brief/schema";
import type { CountyId, Resident } from "@/lib/population/schema";
import {
  createReactionEngine,
  parseRangazaMode,
  publicReaction,
  type Reaction,
} from "@/lib/engine";
import { countyPulse, type CountyPulse } from "./pulse";

export type PublicReaction = ReturnType<typeof publicReaction>;

export type SimulateBatchEvent = {
  type: "batch";
  reactions: PublicReaction[];
};

export type SimulateProgressEvent = {
  type: "county";
  pulse: CountyPulse;
};

export type SimulateCompleteEvent = {
  type: "complete";
  pulses: CountyPulse[];
  reactionCount: number;
};

export type SimulateEvent =
  | SimulateBatchEvent
  | SimulateProgressEvent
  | SimulateCompleteEvent;

export async function* simulatePulses(
  residents: readonly Resident[],
  brief: Brief,
  mode = parseRangazaMode(process.env.RANGAZA_MODE),
): AsyncIterable<SimulateEvent> {
  const engine = createReactionEngine(mode);
  const byCounty = new Map<CountyId, Reaction[]>();
  const completed = new Set<CountyId>();
  let reactionCount = 0;
  const totalByCounty = new Map<CountyId, number>();
  const livelihoods = new Map(
    residents.map((resident) => [resident.id, resident.livelihood]),
  );
  for (const resident of residents) {
    totalByCounty.set(resident.county, (totalByCounty.get(resident.county) ?? 0) + 1);
  }

  for await (const batch of engine.react([...residents], brief)) {
    yield {
      type: "batch",
      reactions: batch.reactions.map((reaction) => publicReaction(reaction)),
    };
    for (const reaction of batch.reactions) {
      reactionCount += 1;
      const list = byCounty.get(reaction.county) ?? [];
      list.push(reaction);
      byCounty.set(reaction.county, list);
      const expected = totalByCounty.get(reaction.county) ?? 0;
      if (list.length >= expected && !completed.has(reaction.county)) {
        completed.add(reaction.county);
        yield {
          type: "county",
          pulse: countyPulse(reaction.county, list, livelihoods),
        };
      }
    }
  }

  const pulses = [...byCounty.entries()].map(([countyId, list]) =>
    countyPulse(countyId, list, livelihoods),
  );
  yield { type: "complete", pulses, reactionCount };
}
