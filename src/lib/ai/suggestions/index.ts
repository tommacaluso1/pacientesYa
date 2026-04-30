import { env } from "@/lib/env";
import { openai } from "../openai";
import { suggestionSchema, type SuggestionInput } from "@/lib/validation/schemas";

const SYSTEM = `
Sos un asistente clínico para guardia hospitalaria en Argentina. Generás SUGERENCIAS NO AUTÓNOMAS:
- diagnósticos diferenciales a considerar
- estudios complementarios útiles
- consideraciones terapéuticas
- interconsultas pertinentes

REGLAS DURAS:
- Sos un asistente. Ninguna sugerencia es una indicación. El médico decide.
- Cada sugerencia tiene "reasoning" explicando por qué surge de los datos del paciente y casos similares.
- "confidence" entre 0 y 1, conservadora.
- Si los datos son insuficientes, devolvé pocas sugerencias (es preferible silencio a invención).
- No sugieras nada peligroso (medicaciones de alto riesgo, dosis específicas) salvo que sea estándar y bien fundamentado.
- Devolvé SOLO JSON válido.
`.trim();

export async function generateSuggestions(args: {
  encounterContext: string;       // dx presuntivo, motivo, vitals, labs, entities, antecedentes
  similarCases: string[];         // top-k summaries from pgvector
}): Promise<SuggestionInput[]> {
  if (env.AI_MODE === "mock") return mockSuggestions(args);

  const user = `
DATOS DEL EPISODIO ACTUAL:
${args.encounterContext}

CASOS SIMILARES PREVIOS (memoria del residente):
${args.similarCases.map((s, i) => `[${i + 1}] ${s}`).join("\n\n") || "— sin casos previos relevantes —"}

Generá entre 0 y 6 sugerencias. JSON:
{ "suggestions": [
  { "kind": "diagnostico_diferencial|estudio_complementario|tratamiento|interconsulta",
    "title": "string", "reasoning": "string",
    "confidence": 0.0,
    "source": [{ "type": "encounter|similar_case|guideline", "ref_id": "string?", "snippet": "string?" }] }
] }
`.trim();

  const res = await openai().chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user }
    ]
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { suggestions?: unknown[] };
  return (parsed.suggestions ?? [])
    .map((s) => suggestionSchema.safeParse(s))
    .flatMap((p) => (p.success ? [p.data] : []));
}

// Demo mock: never fabricate clinical content. Output is clearly labeled and
// scoped to the actual patient context so it can't be confused with real data
// from another patient.
function mockSuggestions(args: { encounterContext: string; similarCases: string[] }): SuggestionInput[] {
  const firstLine = args.encounterContext.split("\n").map((l) => l.trim()).find(Boolean) ?? "—";
  return [
    {
      kind: "diagnostico_diferencial",
      title: "[MODO DEMO] Sugerencias deshabilitadas",
      reasoning:
        `AI_MODE=mock activo. La app no está generando sugerencias reales para este paciente (${firstLine}). ` +
        `Configurá OPENAI_API_KEY y AI_MODE=openai para habilitar análisis automático.`,
      confidence: 0,
      source: [{ type: "encounter", snippet: "modo demo" }]
    }
  ];
}
