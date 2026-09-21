import { z } from "zod";
import { countyIdSchema } from "../population/schema";

export const PROVISION_TAGS = [
  "fuel",
  "vat_staple",
  "payroll_levy",
  "mobile_money",
  "health_levy",
  "health_access",
  "land",
  "livestock",
  "water",
  "education",
  "transport",
  "digital",
  "business_levy",
  "security",
  "other",
] as const;

export const provisionTagSchema = z.enum(PROVISION_TAGS);

export const briefSourceSchema = z.object({
  url: z.string().url(),
  publisher: z.string().min(1),
  publishedAt: z.string().min(1),
  retrievedAt: z.string().min(1),
});

export const provisionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  whoPays: z.array(z.string()),
  whoBenefits: z.array(z.string()),
  effectiveDate: z.string().nullable(),
  enforcement: z.string().nullable(),
  tags: z.array(provisionTagSchema).min(1),
  sourceExcerpt: z.string().min(1),
});

export const briefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: briefSourceSchema,
  jurisdiction: z.union([z.literal("national"), countyIdSchema]),
  summary: z.string().min(1),
  provisions: z.array(provisionSchema).min(1).max(40),
});

export type ProvisionTag = z.infer<typeof provisionTagSchema>;
export type Provision = z.infer<typeof provisionSchema>;
export type Brief = z.infer<typeof briefSchema>;
