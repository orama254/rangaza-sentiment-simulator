import { z } from "zod";
import { countyIdSchema } from "../population/schema";

export const QUESTIONS_VERSION = "v1";
export const JEV_MODEL_ID = "typesafe-ai/jev";

export const STANCES = [
  "supportive",
  "opposed",
  "confused",
  "indifferent",
  "anxious",
] as const;

export const TOP_CONCERNS = [
  "cost_of_living",
  "land",
  "jobs",
  "health_access",
  "security",
  "water_grazing",
  "education",
  "movement",
  "none",
] as const;

export const TRUSTED_CHANNELS = [
  "radio",
  "sms",
  "whatsapp",
  "baraza",
  "religious",
  "tv",
  "social_media",
  "none",
] as const;

export const ENGINES = ["jev", "mock"] as const;

export const stanceSchema = z.enum(STANCES);
export const topConcernSchema = z.enum(TOP_CONCERNS);
export const trustedChannelSchema = z.enum(TRUSTED_CHANNELS);
export const engineIdSchema = z.enum(ENGINES);

export const PERSONAL_IMPACT_LEVELS = [
  "much worse off",
  "worse off",
  "slightly worse off",
  "no change",
  "slightly better off",
  "better off",
  "much better off",
] as const;

export const CLARITY_LEVELS = [
  "does not understand what changes for them",
  "understands very little",
  "understands some parts",
  "understands the main points",
  "fully understands what changes for them",
] as const;

const probability = z.number().min(0).max(1);

const choiceAnswerSchema = z.object({
  type: z.literal("choice"),
  choice: z.string().min(1),
  probabilities: z.record(z.string(), probability).optional(),
});

const scoreAnswerSchema = z.object({
  type: z.literal("score"),
  score: z.number(),
  probabilities: z.record(z.string(), probability).optional(),
});

const booleanAnswerSchema = z.object({
  type: z.literal("boolean"),
  probability: probability,
});

export const reactionAnswersSchema = z.object({
  stance: choiceAnswerSchema.extend({
    choice: stanceSchema,
  }),
  personal_impact: scoreAnswerSchema,
  clarity: scoreAnswerSchema,
  top_concern: choiceAnswerSchema.extend({
    choice: topConcernSchema,
  }),
  trusted_channel: choiceAnswerSchema.extend({
    choice: trustedChannelSchema,
  }),
  will_seek_info: booleanAnswerSchema,
  misinfo_susceptible: booleanAnswerSchema,
  mobilization: booleanAnswerSchema,
  driving_provision: choiceAnswerSchema,
});

export const reactionSchema = reactionAnswersSchema.extend({
  residentId: z.string().min(1),
  county: countyIdSchema,
  confidence: probability,
  engine: engineIdSchema,
  questionsVersion: z.literal(QUESTIONS_VERSION),
  model: z.string().min(1),
});

export type Stance = z.infer<typeof stanceSchema>;
export type TopConcern = z.infer<typeof topConcernSchema>;
export type TrustedChannel = z.infer<typeof trustedChannelSchema>;
export type EngineId = z.infer<typeof engineIdSchema>;
export type ReactionAnswers = z.infer<typeof reactionAnswersSchema>;
export type Reaction = z.infer<typeof reactionSchema>;

export type ReactionBatch = {
  reactions: Reaction[];
};

export function publicReaction(reaction: Reaction): Omit<Reaction, "mobilization"> {
  return {
    residentId: reaction.residentId,
    county: reaction.county,
    stance: reaction.stance,
    personal_impact: reaction.personal_impact,
    clarity: reaction.clarity,
    top_concern: reaction.top_concern,
    trusted_channel: reaction.trusted_channel,
    will_seek_info: reaction.will_seek_info,
    misinfo_susceptible: reaction.misinfo_susceptible,
    driving_provision: reaction.driving_provision,
    confidence: reaction.confidence,
    engine: reaction.engine,
    questionsVersion: reaction.questionsVersion,
    model: reaction.model,
  };
}

export function confidenceFromAnswers(answers: ReactionAnswers): number {
  const peaks: number[] = [];
  const pushPeak = (probabilities: Record<string, number> | undefined) => {
    if (!probabilities) {
      return;
    }
    const values = Object.values(probabilities);
    if (values.length === 0) {
      return;
    }
    peaks.push(Math.max(...values));
  };
  pushPeak(answers.stance.probabilities);
  pushPeak(answers.personal_impact.probabilities);
  pushPeak(answers.clarity.probabilities);
  pushPeak(answers.top_concern.probabilities);
  pushPeak(answers.trusted_channel.probabilities);
  pushPeak(answers.driving_provision.probabilities);
  if (peaks.length === 0) {
    return 0.55;
  }
  return Math.min(...peaks);
}
