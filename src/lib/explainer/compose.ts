import { generateObject, zodSchema } from "ai";
import type { Brief } from "../brief/schema";
import { parseRangazaMode } from "../engine/mode-name";
import type { TrustedChannel } from "../engine/schema";
import {
  createLlmModel,
  isLlmCapacityError,
  isMissingLlmCredentialsError,
  llmAvailable,
} from "../llm/model";
import type { CountyId, Livelihood } from "../population/schema";
import {
  explainerSchema,
  type DirectoryEntry,
  type Explainer,
  type ExplainerClaim,
  type NextStep,
  type SessionLanguage,
} from "./schema";

export type ComposeExplainerInput = {
  brief: Brief;
  presetId: string;
  hotspotId: string;
  countyId: CountyId;
  livelihood: Livelihood;
  language: SessionLanguage;
  channel: TrustedChannel;
  directory: DirectoryEntry[];
};

function nextStepFields(entry: DirectoryEntry | NextStep): NextStep {
  return {
    action: entry.action,
    where: entry.where,
    contact: entry.contact,
    documents: entry.documents,
    sourceUrl: entry.sourceUrl,
    lastVerified: entry.lastVerified,
  };
}

function nextStepKey(step: NextStep): string {
  return JSON.stringify(nextStepFields(step));
}

export function assertClaimsMatchBrief(
  claims: ExplainerClaim[],
  brief: Brief,
): void {
  const ids = new Set(brief.provisions.map((provision) => provision.id));
  const missing = claims.filter((claim) => !ids.has(claim.provisionId));
  if (missing.length > 0) {
    throw new Error(
      `claims provisionId not on Brief: ${missing.map((claim) => claim.provisionId).join(", ")}`,
    );
  }
}

export function assertNextStepSourceUrlsInDirectory(
  nextSteps: NextStep[],
  directory: DirectoryEntry[],
): void {
  const urls = new Set(directory.map((entry) => entry.sourceUrl));
  for (const step of nextSteps) {
    if (!urls.has(step.sourceUrl)) {
      throw new Error(`Next Step sourceUrl is not in the directory: ${step.sourceUrl}`);
    }
  }
}

export function assertNextStepsSubsetOfDirectory(
  nextSteps: NextStep[],
  directory: DirectoryEntry[],
): void {
  const allowed = new Set(directory.map((entry) => nextStepKey(nextStepFields(entry))));
  for (const step of nextSteps) {
    if (!allowed.has(nextStepKey(step))) {
      throw new Error(`Next Step is not a directory entry: ${step.action}`);
    }
  }
}

export function assertExplainerInvariants(
  explainer: Explainer,
  brief: Brief,
  directory: DirectoryEntry[],
): void {
  assertClaimsMatchBrief(explainer.claims, brief);
  assertNextStepSourceUrlsInDirectory(explainer.nextSteps, directory);
  assertNextStepsSubsetOfDirectory(explainer.nextSteps, directory);
}

function pinExplainer(object: unknown, input: ComposeExplainerInput): Explainer {
  const explainer = explainerSchema.parse({
    ...(typeof object === "object" && object !== null ? object : {}),
    hotspotId: input.hotspotId,
    countyId: input.countyId,
    livelihood: input.livelihood,
    language: input.language,
    channel: input.channel,
  });
  assertExplainerInvariants(explainer, input.brief, input.directory);
  return explainer;
}

function compositionPrompt(input: ComposeExplainerInput): string {
  return [
    "Compose an Explainer for a Civic Educator to share with Residents.",
    "Copy Next Steps fields from the directory. Do not rewrite sourceUrl or contact.",
    "Do not invent services, phone numbers, or URLs.",
    "Every claims[].provisionId must be a Provision id from the Brief.",
    "formats.sms must be at most 160 characters.",
    "formats.radio may be null.",
    `hotspotId: ${input.hotspotId}`,
    `countyId: ${input.countyId}`,
    `livelihood: ${input.livelihood}`,
    `language: ${input.language}`,
    `channel: ${input.channel}`,
    "",
    "Brief JSON:",
    JSON.stringify(input.brief),
    "",
    "Directory JSON:",
    JSON.stringify(input.directory),
  ].join("\n");
}

function fallbackExplainer(input: ComposeExplainerInput): Explainer {
  const first = input.brief.provisions[0];
  if (first === undefined) {
    throw new Error("Brief has no provisions");
  }
  const claim: ExplainerClaim = {
    text: first.summary,
    provisionId: first.id,
  };
  const plain = `${input.brief.summary} ${first.title}: ${first.summary}`.trim();
  const nextSteps = input.directory.slice(0, 2).map((entry) => nextStepFields(entry));
  return pinExplainer(
    {
      hotspotId: input.hotspotId,
      countyId: input.countyId,
      livelihood: input.livelihood,
      language: input.language,
      channel: input.channel,
      formats: {
        plain,
        sms: plain.slice(0, 160),
        radio: null,
      },
      claims: [claim],
      nextSteps,
      provenance: "simulated",
      generatedAt: new Date().toISOString(),
    },
    input,
  );
}

async function composeFromLlm(input: ComposeExplainerInput): Promise<Explainer> {
  const result = await generateObject({
    model: createLlmModel(),
    schema: zodSchema(explainerSchema),
    prompt: compositionPrompt(input),
    maxRetries: 0,
  });
  return pinExplainer(result.object, input);
}

export async function composeExplainer(
  input: ComposeExplainerInput,
): Promise<Explainer> {
  if (parseRangazaMode(process.env.RANGAZA_MODE) === "offline" || !llmAvailable()) {
    return fallbackExplainer(input);
  }
  try {
    return await composeFromLlm(input);
  } catch (error) {
    if (isLlmCapacityError(error) || isMissingLlmCredentialsError(error)) {
      return fallbackExplainer(input);
    }
    throw error;
  }
}
