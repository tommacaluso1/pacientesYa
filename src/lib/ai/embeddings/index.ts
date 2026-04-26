import { env } from "@/lib/env";
import { openai } from "../openai";

const DIM = 1536;

export async function embed(text: string): Promise<number[]> {
  if (env.AI_MODE === "mock") return mockEmbedding(text);
  const res = await openai().embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000)
  });
  return res.data[0]!.embedding;
}

// deterministic pseudo-embedding for offline/dev mode
function mockEmbedding(text: string): number[] {
  const out = new Array<number>(DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    const idx = (text.charCodeAt(i) * 31 + i) % DIM;
    out[idx] += ((text.charCodeAt(i) % 17) - 8) / 50;
  }
  // l2 normalize
  let norm = 0;
  for (const v of out) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return out.map((v) => v / norm);
}
