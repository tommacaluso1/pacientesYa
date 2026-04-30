import type { TranscribeArgs, TranscribeResult } from ".";

// Demo mock for offline / dev mode (AI_MODE=mock). Returns a clearly-labeled
// placeholder instead of a fabricated clinical narrative — fake transcripts
// were getting persisted into real patient records and looked like leakage.
export async function transcribeMock(_args: TranscribeArgs): Promise<TranscribeResult> {
  return {
    text:
      "[MODO DEMO — sin transcripción real. " +
      "Configurá AI_MODE=openai con OPENAI_API_KEY para procesar el audio.]",
    language: "es-AR",
    model: "mock"
  };
}
