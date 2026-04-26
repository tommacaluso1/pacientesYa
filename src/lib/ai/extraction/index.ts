import { env } from "@/lib/env";
import { extractOpenAI } from "./openai";
import { extractMock } from "./mock";
import { extractionResultSchema, type ExtractionResult } from "@/lib/validation/schemas";

export async function extract(args: { transcript: string; context?: string }): Promise<ExtractionResult> {
  const raw = env.AI_MODE === "mock" ? await extractMock(args) : await extractOpenAI(args);
  return extractionResultSchema.parse(raw);
}
