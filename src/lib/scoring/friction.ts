import type { Reaction, Stance } from "@/lib/engine/schema";
import { STANCES } from "@/lib/engine/schema";
import {
  CLARITY_MAX,
  FRICTION_WEIGHTS,
  PERSONAL_IMPACT_MAX,
  PERSONAL_IMPACT_NEUTRAL,
} from "./weights";

function probabilityAt(record: Record<string, number> | undefined, key: string): number {
  if (!record) {
    return 0;
  }
  return record[key] ?? 0;
}

function expectedScore(
  score: number,
  probabilities: Record<string, number> | undefined,
  levels: number,
): number {
  if (!probabilities) {
    return score;
  }
  let total = 0;
  let mass = 0;
  for (let i = 0; i < levels; i += 1) {
    const p = probabilities[String(i)] ?? 0;
    total += i * p;
    mass += p;
  }
  if (mass === 0) {
    return score;
  }
  return total;
}

export function stanceProbability(reaction: Reaction, stance: Stance): number {
  const fromVector = probabilityAt(reaction.stance.probabilities, stance);
  if (reaction.stance.probabilities) {
    return fromVector;
  }
  return reaction.stance.choice === stance ? 1 : 0;
}

export function residentFriction(reaction: Reaction): number {
  const opposed = stanceProbability(reaction, "opposed");
  const anxious = stanceProbability(reaction, "anxious");
  const clarity = expectedScore(
    reaction.clarity.score,
    reaction.clarity.probabilities,
    CLARITY_MAX + 1,
  );
  const personalImpact = expectedScore(
    reaction.personal_impact.score,
    reaction.personal_impact.probabilities,
    PERSONAL_IMPACT_MAX + 1,
  );
  const mobilization = reaction.mobilization.probability;
  const friction =
    FRICTION_WEIGHTS.opposed * opposed +
    FRICTION_WEIGHTS.anxious * anxious +
    FRICTION_WEIGHTS.lowClarity * (1 - clarity / CLARITY_MAX) +
    FRICTION_WEIGHTS.negativeImpact *
      Math.max(0, (PERSONAL_IMPACT_NEUTRAL - personalImpact) / PERSONAL_IMPACT_NEUTRAL) +
    FRICTION_WEIGHTS.mobilization * mobilization;
  return Math.min(1, Math.max(0, friction));
}

export function emptyStanceShare(): Record<Stance, number> {
  return Object.fromEntries(STANCES.map((stance) => [stance, 0])) as Record<
    Stance,
    number
  >;
}
