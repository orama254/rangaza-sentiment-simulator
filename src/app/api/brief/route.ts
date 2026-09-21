import { z } from "zod";
import { extractBrief } from "@/lib/brief/extract";
import { loadBrief, saveBrief } from "@/lib/brief/load";

export const runtime = "nodejs";

const bodySchema = z.object({
  presetId: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
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

  const { presetId, text } = parsed.data;
  if (!presetId) {
    return Response.json(
      { error: "presetId is required; text requires presetId" },
      { status: 400 },
    );
  }

  try {
    if (text === undefined) {
      return Response.json(loadBrief(presetId));
    }
    const brief = await extractBrief({ text, presetId });
    saveBrief(brief);
    return Response.json(brief);
  } catch (error) {
    return httpError(error);
  }
}
