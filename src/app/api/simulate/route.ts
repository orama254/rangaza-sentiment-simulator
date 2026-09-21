import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { briefSchema } from "@/lib/brief/schema";
import { describeJevError } from "@/lib/engine/jev";
import { parseRangazaMode } from "@/lib/engine/mode-name";
import { residentsFileSchema } from "@/lib/population/schema";
import { simulatePulses } from "@/lib/scoring";

export const runtime = "nodejs";

const bodySchema = z.object({
  briefId: z.string().min(1).optional(),
});

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const briefId = parsed.data.briefId ?? "finance-bill-2024";
  const briefPath = `data/briefs/${briefId}.json`;
  const briefResult = briefSchema.safeParse(readJson(briefPath));
  if (!briefResult.success) {
    return Response.json(
      { error: `Brief ${briefId}: ${z.prettifyError(briefResult.error)}` },
      { status: 400 },
    );
  }

  const residents = residentsFileSchema.parse(readJson("data/generated/residents.json"));
  const mode = parseRangazaMode(process.env.RANGAZA_MODE);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of simulatePulses(residents, briefResult.data, mode)) {
          send(event);
        }
      } catch (error) {
        send({ type: "error", message: describeJevError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
