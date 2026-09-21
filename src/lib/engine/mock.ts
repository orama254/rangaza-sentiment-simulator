import type { Brief, Provision, ProvisionTag } from "@/lib/brief/schema";
import type { Livelihood, Resident } from "@/lib/population/schema";
import { ReactionCache, reactionCacheKey } from "./cache";
import {
  CLARITY_LEVELS,
  PERSONAL_IMPACT_LEVELS,
  QUESTIONS_VERSION,
  confidenceFromAnswers,
  reactionSchema,
  type Reaction,
  type ReactionAnswers,
  type ReactionBatch,
  type Stance,
  type TopConcern,
  type TrustedChannel,
} from "./schema";

type Rule = {
  stanceShift: Partial<Record<Stance, number>>;
  impactShift: number;
  concern: TopConcern;
};

const RULES: Record<Livelihood, Partial<Record<ProvisionTag, Rule>>> = {
  smallholder_farmer: {
    vat_staple: {
      stanceShift: { opposed: 1.6, anxious: 0.8 },
      impactShift: -1.4,
      concern: "cost_of_living",
    },
    fuel: {
      stanceShift: { opposed: 1.1, anxious: 0.6 },
      impactShift: -0.8,
      concern: "cost_of_living",
    },
    land: {
      stanceShift: { anxious: 1.4, opposed: 0.8 },
      impactShift: -1.0,
      concern: "land",
    },
    education: {
      stanceShift: { supportive: 0.6, anxious: 0.4 },
      impactShift: 0.2,
      concern: "education",
    },
  },
  pastoralist: {
    livestock: {
      stanceShift: { opposed: 1.8, anxious: 1.0 },
      impactShift: -1.6,
      concern: "water_grazing",
    },
    land: {
      stanceShift: { opposed: 1.5, anxious: 1.0 },
      impactShift: -1.3,
      concern: "land",
    },
    water: {
      stanceShift: { anxious: 1.6, opposed: 0.7 },
      impactShift: -1.1,
      concern: "water_grazing",
    },
    fuel: {
      stanceShift: { anxious: 0.8, opposed: 0.5 },
      impactShift: -0.6,
      concern: "movement",
    },
  },
  fisher: {
    fuel: {
      stanceShift: { opposed: 2.2, anxious: 0.8 },
      impactShift: -2.0,
      concern: "cost_of_living",
    },
    vat_staple: {
      stanceShift: { opposed: 1.0, anxious: 0.6 },
      impactShift: -0.9,
      concern: "cost_of_living",
    },
    transport: {
      stanceShift: { anxious: 0.7, opposed: 0.5 },
      impactShift: -0.5,
      concern: "movement",
    },
  },
  informal_trader: {
    vat_staple: {
      stanceShift: { opposed: 1.8, anxious: 0.7 },
      impactShift: -1.5,
      concern: "cost_of_living",
    },
    business_levy: {
      stanceShift: { opposed: 1.6, anxious: 0.8 },
      impactShift: -1.4,
      concern: "jobs",
    },
    mobile_money: {
      stanceShift: { opposed: 1.2, confused: 0.8 },
      impactShift: -0.8,
      concern: "jobs",
    },
    fuel: {
      stanceShift: { opposed: 1.0, anxious: 0.5 },
      impactShift: -0.7,
      concern: "cost_of_living",
    },
  },
  boda_matatu: {
    fuel: {
      stanceShift: { opposed: 2.4, anxious: 0.6 },
      impactShift: -2.1,
      concern: "cost_of_living",
    },
    transport: {
      stanceShift: { opposed: 1.5, anxious: 0.7 },
      impactShift: -1.2,
      concern: "jobs",
    },
    digital: {
      stanceShift: { confused: 0.8, anxious: 0.4 },
      impactShift: -0.2,
      concern: "jobs",
    },
  },
  formal_employee: {
    payroll_levy: {
      stanceShift: { opposed: 1.7, anxious: 1.2 },
      impactShift: -1.5,
      concern: "jobs",
    },
    health_levy: {
      stanceShift: { anxious: 1.1, confused: 0.6 },
      impactShift: -0.7,
      concern: "health_access",
    },
    vat_staple: {
      stanceShift: { opposed: 0.8, anxious: 0.6 },
      impactShift: -0.6,
      concern: "cost_of_living",
    },
  },
  civil_servant: {
    payroll_levy: {
      stanceShift: { opposed: 1.3, anxious: 1.0 },
      impactShift: -1.1,
      concern: "jobs",
    },
    digital: {
      stanceShift: { supportive: 0.5, indifferent: 0.4 },
      impactShift: 0.1,
      concern: "none",
    },
  },
  student: {
    education: {
      stanceShift: { anxious: 1.4, opposed: 0.8 },
      impactShift: -0.8,
      concern: "education",
    },
    vat_staple: {
      stanceShift: { opposed: 1.1, anxious: 0.6 },
      impactShift: -0.7,
      concern: "cost_of_living",
    },
    digital: {
      stanceShift: { confused: 0.7, supportive: 0.4 },
      impactShift: 0.1,
      concern: "education",
    },
  },
  unemployed_youth: {
    payroll_levy: {
      stanceShift: { anxious: 1.2, opposed: 0.8 },
      impactShift: -0.5,
      concern: "jobs",
    },
    vat_staple: {
      stanceShift: { opposed: 1.3, anxious: 0.7 },
      impactShift: -1.0,
      concern: "cost_of_living",
    },
    business_levy: {
      stanceShift: { indifferent: 0.6, anxious: 0.4 },
      impactShift: 0,
      concern: "jobs",
    },
  },
  small_business_owner: {
    business_levy: {
      stanceShift: { opposed: 1.8, anxious: 0.9 },
      impactShift: -1.6,
      concern: "jobs",
    },
    vat_staple: {
      stanceShift: { opposed: 1.2, anxious: 0.5 },
      impactShift: -1.0,
      concern: "cost_of_living",
    },
    digital: {
      stanceShift: { confused: 0.6, supportive: 0.4 },
      impactShift: 0.2,
      concern: "jobs",
    },
  },
  domestic_worker: {
    vat_staple: {
      stanceShift: { opposed: 1.5, anxious: 1.0 },
      impactShift: -1.3,
      concern: "cost_of_living",
    },
    payroll_levy: {
      stanceShift: { confused: 0.8, anxious: 0.6 },
      impactShift: -0.4,
      concern: "jobs",
    },
    health_access: {
      stanceShift: { anxious: 0.9, supportive: 0.4 },
      impactShift: 0.1,
      concern: "health_access",
    },
  },
  retiree: {
    vat_staple: {
      stanceShift: { opposed: 1.4, anxious: 0.9 },
      impactShift: -1.2,
      concern: "cost_of_living",
    },
    health_levy: {
      stanceShift: { anxious: 1.3, confused: 0.7 },
      impactShift: -0.6,
      concern: "health_access",
    },
    health_access: {
      stanceShift: { anxious: 1.0, supportive: 0.5 },
      impactShift: 0.2,
      concern: "health_access",
    },
  },
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function softmax(logits: Record<string, number>): Record<string, number> {
  const values = Object.values(logits);
  const max = Math.max(...values);
  const exps: Record<string, number> = {};
  let sum = 0;
  for (const [key, value] of Object.entries(logits)) {
    const exp = Math.exp(value - max);
    exps[key] = exp;
    sum += exp;
  }
  const out: Record<string, number> = {};
  for (const [key, exp] of Object.entries(exps)) {
    out[key] = exp / sum;
  }
  return out;
}

function peakedScore(mean: number, levels: number, spread: number) {
  const weights: number[] = [];
  for (let i = 0; i < levels; i += 1) {
    weights.push(Math.exp(-((i - mean) ** 2) / (2 * spread * spread)));
  }
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const probabilities: Record<string, number> = {};
  let score = 0;
  for (let i = 0; i < levels; i += 1) {
    const p = weights[i] / sum;
    probabilities[String(i)] = p;
    score += i * p;
  }
  return { score, probabilities };
}

function pickMax(probabilities: Record<string, number>): string {
  let bestKey = Object.keys(probabilities)[0];
  let best = -1;
  for (const [key, value] of Object.entries(probabilities)) {
    if (value > best) {
      best = value;
      bestKey = key;
    }
  }
  return bestKey ?? Object.keys(probabilities)[0] ?? "";
}

function gatherRules(resident: Resident, brief: Brief) {
  const byLivelihood = RULES[resident.livelihood];
  const matched: { provision: Provision; rule: Rule }[] = [];
  for (const provision of brief.provisions) {
    for (const tag of provision.tags) {
      const rule = byLivelihood[tag];
      if (rule) {
        matched.push({ provision, rule });
      }
    }
  }
  return matched;
}

function mockAnswers(
  resident: Resident,
  brief: Brief,
  rng: () => number,
): ReactionAnswers {
  const stanceLogits: Record<Stance, number> = {
    supportive: 0.4,
    opposed: 0.4,
    confused: 0.5,
    indifferent: 1.2,
    anxious: 0.5,
  };
  let impactMean = 3;
  const concernLogits: Record<TopConcern, number> = {
    cost_of_living: 0.8,
    land: 0.3,
    jobs: 0.5,
    health_access: 0.3,
    security: 0.2,
    water_grazing: 0.2,
    education: 0.3,
    movement: 0.2,
    none: 0.6,
  };

  const matched = gatherRules(resident, brief);
  let driving = brief.provisions[0];
  let drivingWeight = -1;
  for (const { provision, rule } of matched) {
    for (const [stance, shift] of Object.entries(rule.stanceShift)) {
      stanceLogits[stance as Stance] += shift;
    }
    impactMean += rule.impactShift;
    concernLogits[rule.concern] += 1.4;
    const weight = Math.abs(rule.impactShift);
    if (weight > drivingWeight) {
      drivingWeight = weight;
      driving = provision;
    }
  }

  if (resident.setting === "rural") {
    stanceLogits.confused += 0.35;
    stanceLogits.anxious += 0.2;
  }
  if (resident.connectivity === "radio_only") {
    stanceLogits.confused += 0.6;
  }
  if (resident.connectivity === "feature_phone") {
    stanceLogits.confused += 0.25;
  }
  if (resident.incomeBand === "low") {
    impactMean -= 0.35;
    concernLogits.cost_of_living += 0.4;
  }

  const stanceProbabilities = softmax(stanceLogits);
  const stance = pickMax(stanceProbabilities) as Stance;
  const impact = peakedScore(
    Math.min(6, Math.max(0, impactMean)),
    PERSONAL_IMPACT_LEVELS.length,
    0.9,
  );
  let clarityMean = 3.1;
  if (resident.setting === "rural") {
    clarityMean -= 0.6;
  }
  if (resident.connectivity === "radio_only") {
    clarityMean -= 1.1;
  } else if (resident.connectivity === "feature_phone") {
    clarityMean -= 0.4;
  }
  if (resident.language !== "en" && resident.language !== "sw") {
    clarityMean -= 0.3;
  }
  const clarity = peakedScore(
    Math.min(4, Math.max(0, clarityMean)),
    CLARITY_LEVELS.length,
    0.85,
  );

  const concernProbabilities = softmax(concernLogits);
  const topConcern = pickMax(concernProbabilities) as TopConcern;

  const channelLogits: Record<TrustedChannel, number> = {
    radio: 0.8,
    sms: 0.5,
    whatsapp: 0.4,
    baraza: 0.6,
    religious: 0.5,
    tv: 0.3,
    social_media: 0.3,
    none: 0.2,
  };
  if (resident.connectivity === "smartphone") {
    channelLogits.whatsapp += 1.4;
    channelLogits.social_media += 0.9;
    channelLogits.tv += 0.4;
  } else if (resident.connectivity === "feature_phone") {
    channelLogits.sms += 1.2;
    channelLogits.radio += 0.8;
  } else {
    channelLogits.radio += 1.4;
    channelLogits.baraza += 1.0;
    channelLogits.religious += 0.6;
  }
  if (resident.setting === "rural") {
    channelLogits.baraza += 0.7;
    channelLogits.radio += 0.5;
  }
  const channelProbabilities = softmax(channelLogits);
  const trustedChannel = pickMax(channelProbabilities) as TrustedChannel;

  const opposed = stanceProbabilities.opposed;
  const anxious = stanceProbabilities.anxious;
  const confused = stanceProbabilities.confused;
  const willSeek = Math.min(
    1,
    0.2 + confused * 0.7 + anxious * 0.4 + rng() * 0.05,
  );
  const misinfo = Math.min(
    1,
    0.1 + (1 - clarity.score / 4) * 0.55 + rng() * 0.04,
  );
  const mobilization = Math.min(
    1,
    opposed * 0.55 + anxious * 0.2 + rng() * 0.03,
  );

  const drivingCriteria: Record<string, number> = {};
  for (const provision of brief.provisions) {
    drivingCriteria[provision.id] = 0.15;
  }
  drivingCriteria[driving.id] = (drivingCriteria[driving.id] ?? 0.15) + 1.6;
  const drivingProbabilities = softmax(drivingCriteria);

  return {
    stance: {
      type: "choice",
      choice: stance,
      probabilities: stanceProbabilities,
    },
    personal_impact: {
      type: "score",
      score: impact.score,
      probabilities: impact.probabilities,
    },
    clarity: {
      type: "score",
      score: clarity.score,
      probabilities: clarity.probabilities,
    },
    top_concern: {
      type: "choice",
      choice: topConcern,
      probabilities: concernProbabilities,
    },
    trusted_channel: {
      type: "choice",
      choice: trustedChannel,
      probabilities: channelProbabilities,
    },
    will_seek_info: { type: "boolean", probability: willSeek },
    misinfo_susceptible: { type: "boolean", probability: misinfo },
    mobilization: { type: "boolean", probability: mobilization },
    driving_provision: {
      type: "choice",
      choice: pickMax(drivingProbabilities),
      probabilities: drivingProbabilities,
    },
  };
}

export class MockEngine {
  readonly id = "mock" as const;

  constructor(private readonly cache = new ReactionCache()) {}

  async *react(
    residents: Resident[],
    brief: Brief,
  ): AsyncIterable<ReactionBatch> {
    const batch: Reaction[] = [];
    for (const resident of residents) {
      batch.push(this.reactOne(resident, brief));
      if (batch.length >= 10) {
        yield { reactions: batch.splice(0, batch.length) };
      }
    }
    if (batch.length > 0) {
      yield { reactions: batch };
    }
  }

  reactOne(resident: Resident, brief: Brief): Reaction {
    const key = reactionCacheKey(resident, brief, "mock");
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    const rng = mulberry32(seedFromKey(key));
    const answers = mockAnswers(resident, brief, rng);
    const reaction = reactionSchema.parse({
      ...answers,
      residentId: resident.id,
      county: resident.county,
      confidence: Math.min(
        0.9,
        Math.max(0.55, confidenceFromAnswers(answers) * (0.85 + rng() * 0.15)),
      ),
      engine: "mock",
      questionsVersion: QUESTIONS_VERSION,
      model: "mock-v1",
    });
    this.cache.set(key, reaction);
    return reaction;
  }
}
