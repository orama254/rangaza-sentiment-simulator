import { generateObject, zodSchema } from "ai";
import { parseRangazaMode } from "../engine/mode-name";
import { createLlmModel, isLlmCapacityError } from "../llm/model";
import { loadBrief } from "./load";
import { PROVISION_TAGS, briefSchema, type Brief } from "./schema";

export type ExtractBriefInput = {
  text: string;
  presetId: string;
  title?: string;
  source?: Brief["source"];
};

function savedBriefOrUndefined(id: string): Brief | undefined {
  try {
    return loadBrief(id);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Brief not found:")) {
      return undefined;
    }
    throw error;
  }
}

function pinExtractedBrief(object: unknown, input: ExtractBriefInput): Brief {
  const parsed = briefSchema.parse(object);
  return briefSchema.parse({
    ...parsed,
    id: input.presetId,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.source !== undefined ? { source: input.source } : {}),
  });
}

function extractionPrompt(input: ExtractBriefInput): string {
  return [
    "Extract a Brief from the announcement text.",
    "Extract only what is in the text.",
    "Every Provision must carry a verbatim sourceExcerpt copied from the text. Do not invent excerpts.",
    "Unknown fields are null, never guessed.",
    "No more than 40 provisions. Merge minor ones if needed.",
    `Tags must be chosen from this list: ${PROVISION_TAGS.join(", ")}.`,
    `Preset id (use as Brief id): ${input.presetId}`,
    input.title ? `Title if needed: ${input.title}` : "",
    "",
    "Announcement text:",
    input.text,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

async function extractFromLlm(input: ExtractBriefInput): Promise<Brief> {
  const result = await generateObject({
    model: createLlmModel(),
    schema: zodSchema(briefSchema),
    prompt: extractionPrompt(input),
    maxRetries: 0,
  });
  return pinExtractedBrief(result.object, input);
}

export async function extractBrief(input: ExtractBriefInput): Promise<Brief> {
  if (parseRangazaMode(process.env.RANGAZA_MODE) === "offline") {
    const saved = savedBriefOrUndefined(input.presetId);
    if (saved) {
      return saved;
    }
    throw new Error(`Brief not found: ${input.presetId}`);
  }

  try {
    return await extractFromLlm(input);
  } catch (error) {
    if (!isLlmCapacityError(error)) {
      throw error;
    }
    const saved = savedBriefOrUndefined(input.presetId);
    if (saved) {
      return saved;
    }
    throw error;
  }
}
