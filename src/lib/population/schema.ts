import { z } from "zod";

export const COUNTY_IDS = [
  "baringo",
  "bomet",
  "bungoma",
  "busia",
  "elgeyo-marakwet",
  "embu",
  "garissa",
  "homa-bay",
  "isiolo",
  "kajiado",
  "kakamega",
  "kericho",
  "kiambu",
  "kilifi",
  "kirinyaga",
  "kisii",
  "kisumu",
  "kitui",
  "kwale",
  "laikipia",
  "lamu",
  "machakos",
  "makueni",
  "mandera",
  "marsabit",
  "meru",
  "migori",
  "mombasa",
  "murang-a",
  "nairobi",
  "nakuru",
  "nandi",
  "narok",
  "nyamira",
  "nyandarua",
  "nyeri",
  "samburu",
  "siaya",
  "taita-taveta",
  "tana-river",
  "tharaka-nithi",
  "trans-nzoia",
  "turkana",
  "uasin-gishu",
  "vihiga",
  "wajir",
  "west-pokot",
] as const;

export const LIVELIHOODS = [
  "smallholder_farmer",
  "pastoralist",
  "fisher",
  "informal_trader",
  "boda_matatu",
  "formal_employee",
  "civil_servant",
  "student",
  "unemployed_youth",
  "small_business_owner",
  "domestic_worker",
  "retiree",
] as const;

export const SETTINGS = ["urban", "rural"] as const;
export const AGE_BANDS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;
export const GENDERS = ["female", "male", "other"] as const;
export const INCOME_BANDS = ["low", "lower_middle", "middle", "high"] as const;
export const LANGUAGES = ["en", "sw", "so"] as const;
export const CONNECTIVITY = [
  "smartphone",
  "feature_phone",
  "radio_only",
] as const;
export const DISABILITIES = [
  "none",
  "physical",
  "visual",
  "hearing",
  "other",
] as const;

export const countyIdSchema = z.enum(COUNTY_IDS);
export const livelihoodSchema = z.enum(LIVELIHOODS);
export const settingSchema = z.enum(SETTINGS);
export const ageBandSchema = z.enum(AGE_BANDS);
export const genderSchema = z.enum(GENDERS);
export const incomeBandSchema = z.enum(INCOME_BANDS);
export const languageSchema = z.enum(LANGUAGES);
export const connectivitySchema = z.enum(CONNECTIVITY);
export const disabilitySchema = z.enum(DISABILITIES);

export const lngLatSchema = z.tuple([z.number(), z.number()]);

export const countyRecordSchema = z.object({
  id: countyIdSchema,
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1),
  centroid: lngLatSchema,
});

export const countiesFileSchema = z
  .array(countyRecordSchema)
  .length(COUNTY_IDS.length);

const mix = <T extends z.core.$ZodRecordKey>(key: T) =>
  z.record(key, z.number().nonnegative()).refine(
    (row) => {
      const total = Object.values(row).reduce((sum, n) => sum + n, 0);
      return Math.abs(total - 1) < 1e-6;
    },
    { message: "mix weights must sum to 1" },
  );

export const archetypeSchema = z.object({
  livelihood: livelihoodSchema,
  ageBand: mix(ageBandSchema),
  gender: mix(genderSchema),
  incomeBand: mix(incomeBandSchema),
  dependents: mix(z.enum(["0", "1", "2", "3", "4", "5", "6", "7", "8"])),
  disability: mix(disabilitySchema),
});

export const archetypesFileSchema = z
  .array(archetypeSchema)
  .length(LIVELIHOODS.length);

export const sourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  note: z.string().min(1),
});

export const countyWeightsSchema = z.object({
  countyId: countyIdSchema,
  urbanShare: z.number().min(0).max(1),
  livelihood: mix(livelihoodSchema),
  connectivity: mix(connectivitySchema),
  language: mix(languageSchema),
  sources: z.array(sourceSchema).min(1),
});

export const countyWeightsFileSchema = z
  .array(countyWeightsSchema)
  .length(COUNTY_IDS.length);

export const sampleFrameRowSchema = z.object({
  countyId: countyIdSchema,
  sampleSize: z.number().int().positive(),
});

export const residentSchema = z.object({
  id: z.string().min(1),
  county: countyIdSchema,
  setting: settingSchema,
  livelihood: livelihoodSchema,
  ageBand: ageBandSchema,
  gender: genderSchema,
  incomeBand: incomeBandSchema,
  dependents: z.number().int().min(0).max(8),
  language: languageSchema,
  connectivity: connectivitySchema,
  disability: disabilitySchema,
  pos: lngLatSchema,
});

export const residentsFileSchema = z.array(residentSchema).length(3500);

export type CountyId = z.infer<typeof countyIdSchema>;
export type Livelihood = z.infer<typeof livelihoodSchema>;
export type Setting = z.infer<typeof settingSchema>;
export type AgeBand = z.infer<typeof ageBandSchema>;
export type Gender = z.infer<typeof genderSchema>;
export type IncomeBand = z.infer<typeof incomeBandSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Connectivity = z.infer<typeof connectivitySchema>;
export type Disability = z.infer<typeof disabilitySchema>;
export type CountyRecord = z.infer<typeof countyRecordSchema>;
export type Archetype = z.infer<typeof archetypeSchema>;
export type CountyWeights = z.infer<typeof countyWeightsSchema>;
export type SampleFrameRow = z.infer<typeof sampleFrameRowSchema>;
export type Resident = z.infer<typeof residentSchema>;
