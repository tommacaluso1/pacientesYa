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
  if (env.AI_MODE === "mock") return mockSuggestions();

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

function mockSuggestions(): SuggestionInput[] {
  return [
    {
      kind: "diagnostico_diferencial",
      title: "Síndrome coronario agudo (SCA)",
      reasoning: "Dolor torácico opresivo, irradiado a MSI, en mujer de 63 años con HTA y DBT2. Cuadro compatible con SCA hasta descartar.",
      confidence: 0.78,
      source: [{ type: "encounter", snippet: "dolor torácico opresivo de 2 hs + factores de riesgo" }]
    },
    {
      kind: "estudio_complementario",
      title: "ECG seriado + curva enzimática (troponina 0/3 hs)",
      reasoning: "Estándar para descartar SCA en paciente con dolor torácico y factores de riesgo.",
      confidence: 0.85,
      source: []
    },
    {
      kind: "tratamiento",
      title: "Considerar antiagregación según protocolo institucional",
      reasoning: "AAS ya indicada. Revisar segunda antiagregación según hallazgos del ECG/enzimas.",
      confidence: 0.55,
      source: []
    },
    {
      kind: "interconsulta",
      title: "Cardiología",
      reasoning: "Por sospecha de SCA y necesidad de evaluación especializada.",
      confidence: 0.7,
      source: []
    }
  ];
}
