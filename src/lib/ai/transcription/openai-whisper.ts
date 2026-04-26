import { openai } from "../openai";
import { env } from "@/lib/env";
import type { TranscribeArgs, TranscribeResult } from ".";

export async function transcribeOpenAI(args: TranscribeArgs): Promise<TranscribeResult> {
  const file = new File([args.bytes], args.filename, { type: args.mimeType ?? "audio/webm" });
  const res = await openai().audio.transcriptions.create({
    file,
    model: env.OPENAI_TRANSCRIPTION_MODEL,
    language: args.language ?? "es",
    response_format: "verbose_json",
    prompt:
      "Conversación clínica en español rioplatense entre médico y paciente en guardia hospitalaria de Argentina. " +
      "Pueden aparecer términos como evolución, antecedentes, signos vitales, diagnóstico presuntivo, indicaciones, interconsulta."
  });
  // verbose_json returns { text, language, duration, ... }
  const r = res as unknown as { text: string; language?: string; duration?: number };
  return {
    text: r.text,
    language: r.language ?? "es",
    model: env.OPENAI_TRANSCRIPTION_MODEL,
    duration_s: r.duration
  };
}
