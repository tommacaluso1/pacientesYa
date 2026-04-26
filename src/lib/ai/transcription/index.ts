import { env } from "@/lib/env";
import { transcribeOpenAI } from "./openai-whisper";
import { transcribeMock } from "./mock";

export interface TranscribeArgs {
  /** raw audio bytes (e.g. webm / mp4 / m4a / wav) */
  bytes: Uint8Array;
  filename: string;
  mimeType?: string;
  /** Argentine Spanish by default */
  language?: string;
}
export interface TranscribeResult {
  text: string;
  language: string;
  model: string;
  duration_s?: number;
}

export async function transcribe(args: TranscribeArgs): Promise<TranscribeResult> {
  if (env.AI_MODE === "mock") return transcribeMock(args);
  return transcribeOpenAI(args);
}
