import { openai } from "../openai";
import { env } from "@/lib/env";
import { EXTRACTION_SYSTEM, EXTRACTION_USER } from "./prompt";

export async function extractOpenAI(args: { transcript: string; context?: string }) {
  const res = await openai().chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM },
      { role: "user", content: EXTRACTION_USER(args.transcript, args.context) }
    ]
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}
