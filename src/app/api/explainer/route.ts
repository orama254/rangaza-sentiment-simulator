import { z } from "zod";
import { briefSchema } from "@/lib/brief/schema";
import { loadBrief } from "@/lib/brief/load";
import { composeExplainer } from "@/lib/explainer/compose";
import { loadDirectory } from "@/lib/explainer/directory";
import { sessionLanguageSchema } from "@/lib/explainer/schema";
import { trustedChannelSchema } from "@/lib/engine/schema";
import { countyIdSchema, livelihoodSchema } from "@/lib/population/schema";

export const runtime = "nodejs";

const bodySchema = z.object({
  presetId: z.string().min(1),
  briefId: z.string().min(1).optional(),
  brief: briefSchema.optional(),
  hotspotId: z.string().min(1),
  countyId: countyIdSchema,
  livelihood: livelihoodSchema,
  language: sessionLanguageSchema,
  channel: trustedChannelSchema,
});

function httpError(error: unknown, status = 400): Response {
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: z.prettifyError(error), issues: error.issues },
      { status },
    );
  }
  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status });
  }
  return Response.json({ error: "Request failed" }, { status });
}

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: z.prettifyError(parsed.error), issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (body.brief === undefined && body.briefId === undefined) {
    return Response.json(
      { error: "briefId or Brief is required" },
      { status: 400 },
    );
  }

  try {
    const brief =
      body.brief !== undefined ? body.brief : loadBrief(body.briefId ?? "");
    const directory = loadDirectory(body.presetId);
    const explainer = await composeExplainer({
      brief,
      presetId: body.presetId,
      hotspotId: body.hotspotId,
      countyId: body.countyId,
      livelihood: body.livelihood,
      language: body.language,
      channel: body.channel,
      directory,
    });
    return Response.json(explainer);
  } catch (error) {
    return httpError(error);
  }
}
