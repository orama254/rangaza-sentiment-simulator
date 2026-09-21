import { MockEngine } from "./mock";
import { JevEngine } from "./jev";
import type { Brief } from "@/lib/brief/schema";
import type { Resident } from "@/lib/population/schema";
import type { ReactionBatch } from "./schema";
import { parseRangazaMode, type RangazaMode } from "./mode-name";

export { parseRangazaMode, RANGAZA_MODES, type RangazaMode } from "./mode-name";

export type ReactionEngine = {
  readonly id: "jev" | "mock";
  react(
    residents: Resident[],
    brief: Brief,
    opts?: { abortSignal?: AbortSignal; batchSize?: number },
  ): AsyncIterable<ReactionBatch>;
};

export function createReactionEngine(
  mode: RangazaMode = parseRangazaMode(process.env.RANGAZA_MODE),
): ReactionEngine {
  if (mode === "offline") {
    return new MockEngine();
  }
  return new JevEngine();
}
