import OpenAI from "openai";
import { env } from "@/lib/env";

let _client: OpenAI | null = null;

export function openai() {
  if (_client) return _client;
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _client;
}
