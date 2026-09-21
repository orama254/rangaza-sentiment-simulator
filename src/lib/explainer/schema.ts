import { z } from "zod";
import { trustedChannelSchema } from "../engine/schema";
import { countyIdSchema, livelihoodSchema } from "../population/schema";

export const EXPLAINER_LANGUAGES = ["en", "sw", "so"] as const;
export const SESSION_LANGUAGES = ["en", "sw"] as const;
export const PROVENANCES = ["simulated", "verified"] as const;

export const explainerLanguageSchema = z.enum(EXPLAINER_LANGUAGES);
export const sessionLanguageSchema = z.enum(SESSION_LANGUAGES);
export const provenanceSchema = z.enum(PROVENANCES);

export const directoryEntrySchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  where: z.string().min(1),
  contact: z.string().min(1),
  documents: z.array(z.string()),
  sourceUrl: z.string().url(),
  lastVerified: z.string().min(1),
});

export const directoryFileSchema = z.array(directoryEntrySchema).min(1);

export const nextStepSchema = directoryEntrySchema.omit({ id: true });

export const explainerClaimSchema = z.object({
  text: z.string().min(1),
  provisionId: z.string().min(1),
});

export const explainerFormatsSchema = z.object({
  plain: z.string().min(1),
  sms: z.string().max(160),
  radio: z.string().nullable(),
});

export const explainerSchema = z.object({
  hotspotId: z.string().min(1),
  countyId: countyIdSchema,
  livelihood: livelihoodSchema,
  language: explainerLanguageSchema,
  channel: trustedChannelSchema,
  formats: explainerFormatsSchema,
  claims: z.array(explainerClaimSchema),
  nextSteps: z.array(nextStepSchema),
  provenance: provenanceSchema,
  generatedAt: z.string().min(1),
});

export type ExplainerLanguage = z.infer<typeof explainerLanguageSchema>;
export type SessionLanguage = z.infer<typeof sessionLanguageSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
export type DirectoryEntry = z.infer<typeof directoryEntrySchema>;
export type NextStep = z.infer<typeof nextStepSchema>;
export type ExplainerClaim = z.infer<typeof explainerClaimSchema>;
export type Explainer = z.infer<typeof explainerSchema>;
