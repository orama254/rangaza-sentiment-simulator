import type { CountyId, Livelihood } from "@/lib/population/schema";
import type { Reaction, Stance, TopConcern, TrustedChannel } from "@/lib/engine/schema";
import { HOTSPOT_CLARITY, HOTSPOT_FRICTION } from "./weights";
import { emptyStanceShare, residentFriction, stanceProbability } from "./friction";

export type RankedItem = {
  id: string;
  share: number;
};

export type LivelihoodPulse = {
  livelihood: Livelihood;
  n: number;
  friction: number;
  hotspot: boolean;
  drivingProvisions: RankedItem[];
};

export type CountyPulse = {
  countyId: CountyId;
  n: number;
  stance: Record<Stance, number>;
  meanClarity: number;
  meanConfidence: number;
  friction: number;
  hotspot: boolean;
  topConcerns: RankedItem[];
  trustedChannels: RankedItem[];
  drivingProvisions: RankedItem[];
  livelihoods: LivelihoodPulse[];
  provenance: { simulated: number; verified: number };
};

function topN(counts: Map<string, number>, n: number, total: number): RankedItem[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, count]) => ({ id, share: total === 0 ? 0 : count / total }));
}

export function countyPulse(
  countyId: CountyId,
  reactions: readonly Reaction[],
  livelihoodByResident?: ReadonlyMap<string, Livelihood>,
): CountyPulse {
  const stance = emptyStanceShare();
  const concerns = new Map<string, number>();
  const channels = new Map<string, number>();
  const driving = new Map<string, number>();
  const byLivelihood = new Map<Livelihood, Reaction[]>();
  let claritySum = 0;
  let confidenceSum = 0;
  let frictionSum = 0;
  const n = reactions.length;

  for (const reaction of reactions) {
    const livelihood = livelihoodByResident?.get(reaction.residentId);
    if (livelihood) {
      const list = byLivelihood.get(livelihood) ?? [];
      list.push(reaction);
      byLivelihood.set(livelihood, list);
    }
    for (const key of Object.keys(stance) as Stance[]) {
      stance[key] += stanceProbability(reaction, key);
    }
    const concern = reaction.top_concern.choice as TopConcern;
    concerns.set(concern, (concerns.get(concern) ?? 0) + 1);
    const channel = reaction.trusted_channel.choice as TrustedChannel;
    channels.set(channel, (channels.get(channel) ?? 0) + 1);
    driving.set(
      reaction.driving_provision.choice,
      (driving.get(reaction.driving_provision.choice) ?? 0) + 1,
    );
    claritySum += reaction.clarity.score;
    confidenceSum += reaction.confidence;
    frictionSum += residentFriction(reaction);
  }

  if (n > 0) {
    for (const key of Object.keys(stance) as Stance[]) {
      stance[key] /= n;
    }
  }

  const meanClarity = n === 0 ? 0 : claritySum / n;
  const friction = n === 0 ? 0 : frictionSum / n;
  const livelihoodPulses = [...byLivelihood.entries()]
    .map(([livelihood, list]) => {
      const drivingCounts = new Map<string, number>();
      let sum = 0;
      for (const reaction of list) {
        drivingCounts.set(
          reaction.driving_provision.choice,
          (drivingCounts.get(reaction.driving_provision.choice) ?? 0) + 1,
        );
        sum += residentFriction(reaction);
      }
      const rowFriction = list.length === 0 ? 0 : sum / list.length;
      return {
        livelihood,
        n: list.length,
        friction: rowFriction,
        hotspot: rowFriction > HOTSPOT_FRICTION,
        drivingProvisions: topN(drivingCounts, 3, list.length),
      };
    })
    .sort((a, b) => b.friction - a.friction);

  return {
    countyId,
    n,
    stance,
    meanClarity,
    meanConfidence: n === 0 ? 0 : confidenceSum / n,
    friction,
    hotspot: friction > HOTSPOT_FRICTION || meanClarity < HOTSPOT_CLARITY,
    topConcerns: topN(concerns, 3, n),
    trustedChannels: topN(channels, 3, n),
    drivingProvisions: topN(driving, 3, n),
    livelihoods: livelihoodPulses,
    provenance: { simulated: n, verified: 0 },
  };
}

export function groupReactionsByCounty(
  reactions: readonly Reaction[],
): Map<CountyId, Reaction[]> {
  const groups = new Map<CountyId, Reaction[]>();
  for (const reaction of reactions) {
    const list = groups.get(reaction.county) ?? [];
    list.push(reaction);
    groups.set(reaction.county, list);
  }
  return groups;
}
